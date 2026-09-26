import { driftFindings, evidence, graphEdges, incidents, invariants, mutations, trajectory } from '../store/index.js';
import type { Invariant } from '../shared/schema/invariant.schema.js';
import type { Mutation } from '../shared/schema/mutation.schema.js';
import type { ScanResult } from '../graph/scanner/scanner.js';
import { getInvariantSpec } from '../core/epoch/spec-registry.js';
import { mutationEngine } from '../core/epoch/mutation-engine.js';

export interface InvariantView extends Invariant {
  name: string;
  category: string | null;
  ruleType: string | null;
  detail: string | null;
  evaluated: boolean;
}

export function latestScan(): ScanResult | undefined {
  return trajectory.getLatestScan()?.scan as ScanResult | undefined;
}

export function invariantView(invariant: Invariant, scan: ScanResult | undefined = latestScan()): InvariantView {
  const spec = getInvariantSpec(invariant.invariant_id);
  const result = scan?.invariants.find(r => r.invariantId === invariant.invariant_id);
  return {
    ...invariant,
    name: spec?.name ?? invariant.invariant_id,
    category: spec?.category ?? null,
    ruleType: spec?.rule.type ?? null,
    detail: result?.detail ?? null,
    evaluated: result?.evaluated ?? false
  };
}

export function allInvariantViews(): InvariantView[] {
  const scan = latestScan();
  return invariants.listInvariants().map(i => invariantView(i, scan));
}

/** Status of each invariant at each recorded mutation, from the stored scans. */
export function invariantHistory(invariantId: string): Array<{ mutationId: string; epochId: string; status: string }> {
  return trajectory.listTrajectoryPoints().map(point => {
    const scan = trajectory.getScanForMutation(point.mutation_id) as ScanResult | undefined;
    const status = scan?.invariants.find(r => r.invariantId === invariantId)?.status ?? 'HOLDING';
    return { mutationId: point.mutation_id, epochId: point.epoch_id, status };
  });
}

export interface MutationDetail {
  mutation: Mutation;
  evidence: ReturnType<typeof evidence.listEvidenceByIds>;
  point: ReturnType<typeof trajectory.getTrajectoryPoint>;
  edges: ReturnType<typeof graphEdges.listEdgesForNode>;
  weakened: string[];
  incidents: string[];
  findings: string[];
  compensatedBy: string | null;
  diff: string | null;
}

export function mutationDetail(mutationId: string): MutationDetail | undefined {
  const mutation = mutations.getMutation(mutationId);
  if (!mutation) return undefined;
  const edges = graphEdges.listEdgesForNode(mutationId);
  const compensatedBy = mutations.listMutations().find(m => m.compensates_mutation_id === mutationId)?.mutation_id ?? null;
  return {
    mutation,
    evidence: evidence.listEvidenceByIds(mutation.evidence_refs),
    point: trajectory.getTrajectoryPoint(mutationId),
    edges,
    weakened: edges.filter(e => e.relationship === 'WEAKENS' && e.from_id === mutationId).map(e => e.to_id),
    incidents: edges.filter(e => e.relationship === 'CAUSED_BY' && e.to_id === mutationId).map(e => e.from_id)
      .concat(incidents.listIncidents().filter(i => i.reproduction_ref?.endsWith(`@${mutationId}`)).map(i => i.incident_id))
      .filter((id, i, all) => all.indexOf(id) === i),
    findings: driftFindings.listDriftFindings().filter(f => f.mutation_ids.includes(mutationId) || f.detected_by_mutation_id === mutationId).map(f => f.finding_id),
    compensatedBy,
    diff: mutationEngine.mutationDiff(mutationId) ?? null
  };
}
