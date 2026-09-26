import { decisions, driftFindings, epochs, graphEdges, incidents, invariants, mutations, workflows } from '../store/index.js';
import type { GraphEdge } from '../shared/schema/graph-edge.schema.js';
import { getInvariantSpec } from '../core/epoch/spec-registry.js';

export type GraphNodeType = 'mutation' | 'component' | 'invariant' | 'incident' | 'epoch' | 'workflow' | 'decision';

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  data: Record<string, unknown>;
}

export interface EvolutionGraph {
  '@context': Record<string, string>;
  nodes: GraphNode[];
  edges: GraphEdge[];
  generatedAt: number;
}

const CONTEXT = {
  '@vocab': 'https://github.com/vighriday/epoch-software-evolution/blob/main/docs/DATA_MODEL.md#',
  nodes: '@graph'
};

/** The evolution graph as JSON-LD-style nodes and edges (ADR-003), with node details for the console. */
export function exportGraph(options: { includeWorkflows?: boolean } = {}): EvolutionGraph {
  const nodes: GraphNode[] = [];
  const allMutations = mutations.listMutations({ order: 'asc' });

  for (const m of allMutations) {
    nodes.push({
      id: m.mutation_id,
      type: 'mutation',
      label: m.mutation_id,
      data: {
        intent: m.intent,
        author: m.author ?? null,
        epochId: m.epoch_id,
        components: m.affected_components,
        createdAt: m.created_at,
        commitSha: m.commit_sha ?? null,
        compensates: m.compensates_mutation_id ?? null,
        trajectoryDelta: m.trajectory_delta,
        workflowId: m.workflow_id
      }
    });
  }

  const components = new Set(allMutations.flatMap(m => m.affected_components));
  for (const c of [...components].sort()) nodes.push({ id: c, type: 'component', label: c, data: {} });

  for (const inv of invariants.listInvariants()) {
    const spec = getInvariantSpec(inv.invariant_id);
    nodes.push({
      id: inv.invariant_id,
      type: 'invariant',
      label: spec?.name ?? inv.invariant_id,
      data: { status: inv.status, category: spec?.category ?? null, statement: inv.statement, scope: inv.scope_components, violationMutations: inv.violation_mutations }
    });
  }

  for (const inc of incidents.listIncidents()) {
    nodes.push({
      id: inc.incident_id,
      type: 'incident',
      label: inc.incident_id,
      data: { signal: inc.signal, severity: inc.severity, status: inc.status, component: inc.affected_component, candidateMutations: inc.candidate_mutations ?? [], detectedAt: inc.detected_at }
    });
  }

  for (const e of epochs.listEpochs()) {
    nodes.push({ id: e.epoch_id, type: 'epoch', label: e.name, data: { status: e.status, start: e.start_mutation_id, end: e.end_mutation_id ?? null, properties: e.defining_properties } });
  }

  if (options.includeWorkflows) {
    for (const w of workflows.listWorkflows({ limit: 500 })) {
      if (w.kind === 'seed') continue;
      nodes.push({ id: w.workflow_id, type: 'workflow', label: w.title ?? w.workflow_id, data: { kind: w.kind, status: w.status, mutationId: w.mutation_id ?? null } });
    }
    for (const d of decisions.listDecisions(500)) {
      nodes.push({ id: d.decision_id, type: 'decision', label: d.action, data: { actor: d.actor, workflowId: d.workflow_id, rationale: d.rationale ?? null } });
    }
  }

  const ids = new Set(nodes.map(n => n.id));
  const edges = graphEdges.listAllEdges().filter(e => ids.has(e.from_id) && ids.has(e.to_id));
  return { '@context': CONTEXT, nodes, edges, generatedAt: Date.now() };
}

/** Findings that are still open, newest first, for graph overlays. */
export function openFindings() {
  return driftFindings.listDriftFindings({ status: 'open' });
}
