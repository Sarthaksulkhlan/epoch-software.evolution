import type { InvariantStatus } from '../../shared/schema/invariant.schema.js';
import type { BoundaryViolation, ComponentEdge, ModuleEdge, ScanResult } from './scanner.js';

export interface InvariantTransition {
  invariantId: string;
  from: InvariantStatus;
  to: InvariantStatus;
}

export interface ProbeChange {
  id: string;
  from: boolean | undefined;
  to: boolean;
}

export interface ScanDiff {
  addedComponentEdges: ComponentEdge[];
  removedComponentEdges: ComponentEdge[];
  addedModuleEdges: ModuleEdge[];
  removedModuleEdges: ModuleEdge[];
  addedViolations: BoundaryViolation[];
  removedViolations: BoundaryViolation[];
  invariantTransitions: InvariantTransition[];
  probeChanges: ProbeChange[];
  couplingDelta: number;
  boundaryIntegrityDelta: number;
  /** Change in the share of failing tests plus failing probes (positive = worse). */
  behaviorDelta: number;
}

const edgeKey = (e: { from: string; to: string }): string => `${e.from}->${e.to}`;
const violationKey = (v: BoundaryViolation): string => `${v.invariantId}|${v.importer}->${v.module}`;

/** What changed structurally and behaviourally between two scans. `before` is empty for the first scan. */
export function diffScans(before: ScanResult | undefined, after: ScanResult): ScanDiff {
  const beforeComponentEdges = before?.componentEdges ?? [];
  const beforeModuleEdges = before?.moduleEdges ?? [];
  const beforeViolations = before?.boundaryViolations ?? [];

  const invariantTransitions: InvariantTransition[] = [];
  for (const result of after.invariants) {
    const prior = before?.invariants.find(r => r.invariantId === result.invariantId);
    if (prior && prior.status !== result.status) {
      invariantTransitions.push({ invariantId: result.invariantId, from: prior.status, to: result.status });
    }
  }

  const probeChanges: ProbeChange[] = [];
  for (const probe of after.probes ?? []) {
    const prior = before?.probes?.find(p => p.id === probe.id);
    if (!prior || prior.ok !== probe.ok) probeChanges.push({ id: probe.id, from: prior?.ok, to: probe.ok });
  }

  return {
    addedComponentEdges: minus(after.componentEdges, beforeComponentEdges, edgeKey),
    removedComponentEdges: minus(beforeComponentEdges, after.componentEdges, edgeKey),
    addedModuleEdges: minus(after.moduleEdges, beforeModuleEdges, edgeKey),
    removedModuleEdges: minus(beforeModuleEdges, after.moduleEdges, edgeKey),
    addedViolations: minus(after.boundaryViolations, beforeViolations, violationKey),
    removedViolations: minus(beforeViolations, after.boundaryViolations, violationKey),
    invariantTransitions,
    probeChanges,
    couplingDelta: round4(after.couplingScore - (before?.couplingScore ?? after.couplingScore)),
    boundaryIntegrityDelta: round4(after.boundaryIntegrityScore - (before?.boundaryIntegrityScore ?? after.boundaryIntegrityScore)),
    behaviorDelta: round4(failureShare(after) - (before ? failureShare(before) : failureShare(after)))
  };
}

function failureShare(scan: ScanResult): number {
  const tests = scan.tests;
  const probes = scan.probes ?? [];
  const testShare = tests && tests.passed + tests.failed > 0 ? tests.failed / (tests.passed + tests.failed) : 0;
  const probeShare = probes.length > 0 ? probes.filter(p => !p.ok).length / probes.length : 0;
  return testShare + probeShare;
}

function minus<T>(left: readonly T[], right: readonly T[], key: (item: T) => string): T[] {
  const rightKeys = new Set(right.map(key));
  return left.filter(item => !rightKeys.has(key(item)));
}

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}
