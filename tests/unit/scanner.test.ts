import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { parseImportSpecifiers, resolveSpecifier } from '../../src/graph/scanner/imports.js';
import { loadSpec } from '../../src/graph/scanner/spec.js';
import { scanRepository } from '../../src/graph/scanner/scanner.js';
import { diffScans } from '../../src/graph/scanner/diff.js';

const SAMPLE = path.join(process.cwd(), 'packages', 'sample-app');
const spec = loadSpec(SAMPLE);
const temp: string[] = [];

/** Copy the sample app and apply small edits so rules can be exercised. */
function variant(edits: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'epoch-scan-'));
  temp.push(dir);
  fs.cpSync(path.join(SAMPLE, 'src'), path.join(dir, 'src'), { recursive: true });
  for (const [file, content] of Object.entries(edits)) fs.writeFileSync(path.join(dir, file), content, 'utf8');
  return dir;
}

afterAll(() => {
  for (const dir of temp) fs.rmSync(dir, { recursive: true, force: true });
});

describe('import parsing', () => {
  it('finds static, re-export, side-effect and dynamic imports', () => {
    const source = [
      "import { a } from './a.js';",
      "import type { B } from '../b.js';",
      "export { c } from './c.js';",
      "import './side-effect.js';",
      "const d = await import('./d.js');"
    ].join('\n');
    expect(parseImportSpecifiers(source)).toEqual(['../b.js', './a.js', './c.js', './d.js', './side-effect.js']);
  });

  it('maps ESM .js specifiers to .ts files and ignores packages', () => {
    const known = new Set(['src/ledger/db.ts', 'src/ledger/index.ts']);
    expect(resolveSpecifier('src/disputes/reconciler.ts', '../ledger/db.js', known)).toBe('src/ledger/db.ts');
    expect(resolveSpecifier('src/disputes/reconciler.ts', '../ledger', known)).toBe('src/ledger/index.ts');
    expect(resolveSpecifier('src/disputes/reconciler.ts', 'node:fs', known)).toBeUndefined();
  });
});

describe('scanRepository on the baseline sample app', () => {
  const scan = scanRepository(SAMPLE, spec);

  it('measures seven components and eight cross-component dependencies', () => {
    expect(scan.components).toEqual(['api', 'archival', 'disputes', 'ledger', 'notifications', 'orders', 'vault']);
    expect(scan.componentEdges.map(e => `${e.from}->${e.to}`)).toEqual([
      'api->disputes', 'api->ledger', 'api->notifications', 'api->orders',
      'archival->ledger', 'disputes->ledger', 'orders->ledger', 'orders->vault'
    ]);
    expect(scan.couplingScore).toBeCloseTo(8 / 42, 4);
  });

  it('reads the policy constants and finds every invariant holding', () => {
    expect(scan.constants['src/api/disputes.ts#CHARGEBACK_WINDOW_DAYS']).toBe(15);
    expect(scan.constants['src/archival/archival-job.ts#LEDGER_RETENTION_DAYS']).toBe(15);
    expect(scan.boundaryViolations).toEqual([]);
    expect(scan.invariants.filter(r => r.evaluated).map(r => r.status)).toEqual(['HOLDING', 'HOLDING', 'HOLDING']);
    expect(scan.boundaryIntegrityScore).toBe(1);
  });

  it('is deterministic', () => {
    expect(scanRepository(SAMPLE, spec).stateHash).toBe(scan.stateHash);
  });
});

describe('invariant rules', () => {
  const reconcilerWithOrderTable = [
    "import { getSettlement } from '../ledger/ledger-service.js';",
    "import { orders } from '../orders/order-store.js';",
    'export function openReconciliation(orderId: string) { return { orderId, order: orders.get(orderId), settlement: getSettlement(orderId) }; }',
    ''
  ].join('\n');

  it('weakens INV-BOUND-04 at one bypassing import and violates it at two', () => {
    const one = scanRepository(variant({ 'src/disputes/reconciler.ts': reconcilerWithOrderTable }), spec);
    expect(one.invariants.find(r => r.invariantId === 'INV-BOUND-04')?.status).toBe('WEAKENED');
    expect(one.boundaryViolations).toEqual([{ invariantId: 'INV-BOUND-04', module: 'src/orders/order-store.ts', importer: 'src/disputes/reconciler.ts' }]);

    const two = scanRepository(variant({
      'src/disputes/reconciler.ts': reconcilerWithOrderTable.replace("import { getSettlement } from '../ledger/ledger-service.js';", "import { liveSettlements as getSettlement } from '../ledger/db.js';")
    }), spec);
    expect(two.invariants.find(r => r.invariantId === 'INV-BOUND-04')?.status).toBe('VIOLATED');
  });

  it('weakens INV-TIME-02 when the window exceeds retention and escalates when the ledger table is read directly', () => {
    const disputes = fs.readFileSync(path.join(SAMPLE, 'src/api/disputes.ts'), 'utf8').replace('CHARGEBACK_WINDOW_DAYS = 15', 'CHARGEBACK_WINDOW_DAYS = 30');
    const weakened = scanRepository(variant({ 'src/api/disputes.ts': disputes }), spec);
    expect(weakened.invariants.find(r => r.invariantId === 'INV-TIME-02')?.status).toBe('WEAKENED');

    const violated = scanRepository(variant({
      'src/api/disputes.ts': disputes,
      'src/disputes/reconciler.ts': "import { liveSettlements } from '../ledger/db.js';\nexport function openReconciliation(id: string) { return liveSettlements.get(id); }\n"
    }), spec);
    expect(violated.invariants.find(r => r.invariantId === 'INV-TIME-02')?.status).toBe('VIOLATED');
  });

  it('carries test-based invariants forward when tests did not run', () => {
    const previous = scanRepository(SAMPLE, spec);
    const failing = { ...previous, invariants: previous.invariants.map(r => (r.invariantId === 'INV-DATA-01' ? { ...r, status: 'VIOLATED' as const } : r)) };
    const next = scanRepository(SAMPLE, spec, { previous: failing });
    const result = next.invariants.find(r => r.invariantId === 'INV-DATA-01');
    expect(result).toMatchObject({ status: 'VIOLATED', evaluated: false });
  });
});

describe('diffScans', () => {
  it('reports added violations, edges and invariant transitions', () => {
    const before = scanRepository(SAMPLE, spec);
    const after = scanRepository(variant({
      'src/disputes/reconciler.ts': "import { orders } from '../orders/order-store.js';\nexport function openReconciliation(id: string) { return orders.get(id); }\n"
    }), spec);
    const diff = diffScans(before, after);
    expect(diff.addedComponentEdges.map(e => `${e.from}->${e.to}`)).toEqual(['disputes->orders']);
    expect(diff.removedComponentEdges.map(e => `${e.from}->${e.to}`)).toEqual(['disputes->ledger']);
    expect(diff.addedViolations).toHaveLength(1);
    expect(diff.invariantTransitions).toContainEqual({ invariantId: 'INV-BOUND-04', from: 'HOLDING', to: 'WEAKENED' });
  });
});
