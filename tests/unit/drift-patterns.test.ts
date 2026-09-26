import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { boundaryErosion, dependencyGrowth, invariantWeakening, type PatternEntry } from '../../src/graph/drift/patterns.js';
import { loadSpec } from '../../src/graph/scanner/spec.js';
import { scanRepository, type ScanResult } from '../../src/graph/scanner/scanner.js';
import { diffScans } from '../../src/graph/scanner/diff.js';

const spec = loadSpec(path.join(process.cwd(), 'packages', 'sample-app'));
const base = scanRepository(path.join(process.cwd(), 'packages', 'sample-app'), spec);

function history(...scans: ScanResult[]): PatternEntry[] {
  return scans.map((scan, i) => ({ mutationId: `M-${2000 + i}`, scan, diff: diffScans(scans[i - 1] ?? scan, scan) }));
}

function withViolations(count: number): ScanResult {
  const violations = [
    { invariantId: 'INV-BOUND-04', module: 'src/orders/order-store.ts', importer: 'src/disputes/reconciler.ts' },
    { invariantId: 'INV-BOUND-04', module: 'src/ledger/db.ts', importer: 'src/disputes/reconciler.ts' }
  ].slice(0, count);
  return {
    ...base,
    boundaryViolations: violations,
    invariants: base.invariants.map(r => (r.invariantId === 'INV-BOUND-04' ? { ...r, status: count >= 2 ? 'VIOLATED' : count === 1 ? 'WEAKENED' : 'HOLDING' } : r))
  };
}

describe('boundary erosion', () => {
  it('stays quiet without violations', () => {
    expect(boundaryErosion(history(base, base), spec)).toEqual([]);
  });

  it('warns at one bypassing import and names the mutation that introduced it', () => {
    const [finding] = boundaryErosion(history(base, withViolations(1)), spec);
    expect(finding).toMatchObject({ pattern: 'boundary_erosion', severity: 'warning', invariantId: 'INV-BOUND-04', mutationIds: ['M-2001'] });
  });

  it('becomes critical at two and attributes each import to its own mutation', () => {
    const [finding] = boundaryErosion(history(base, withViolations(1), withViolations(2)), spec);
    expect(finding).toMatchObject({ severity: 'critical', mutationIds: ['M-2001', 'M-2002'] });
    expect(finding?.measurement).toMatchObject({ metric: 'boundary_violations', value: 2 });
  });
});

describe('invariant weakening', () => {
  const weakened: ScanResult = { ...base, invariants: base.invariants.map(r => (r.invariantId === 'INV-TIME-02' ? { ...r, status: 'WEAKENED' } : r)) };
  const violated: ScanResult = { ...base, invariants: base.invariants.map(r => (r.invariantId === 'INV-TIME-02' ? { ...r, status: 'VIOLATED' } : r)) };

  it('reports non-structural invariants that left HOLDING, with the degrading mutations', () => {
    const [finding] = invariantWeakening(history(base, weakened), spec);
    expect(finding).toMatchObject({ pattern: 'invariant_weakening', severity: 'warning', invariantId: 'INV-TIME-02', mutationIds: ['M-2001'] });
    const [critical] = invariantWeakening(history(base, weakened, violated), spec);
    expect(critical).toMatchObject({ severity: 'critical', mutationIds: ['M-2001', 'M-2002'] });
  });

  it('leaves boundary invariants to the boundary erosion pattern', () => {
    expect(invariantWeakening(history(base, withViolations(2)), spec)).toEqual([]);
  });
});

describe('dependency growth', () => {
  const grow = (targets: string[]): ScanResult => ({
    ...base,
    componentEdges: [...base.componentEdges, ...targets.map(to => ({ from: 'disputes', to, via: 1 }))],
    fanOut: { ...base.fanOut, disputes: (base.fanOut.disputes ?? 0) + targets.length }
  });

  it('ignores a single new dependency and warns at two within the window', () => {
    expect(dependencyGrowth(history(base, grow(['orders'])))).toEqual([]);
    const [finding] = dependencyGrowth(history(base, grow(['orders']), grow(['orders', 'notifications'])));
    expect(finding).toMatchObject({ pattern: 'dependency_growth', severity: 'warning', subject: 'disputes' });
    expect(finding?.components).toContain('notifications');
  });
});
