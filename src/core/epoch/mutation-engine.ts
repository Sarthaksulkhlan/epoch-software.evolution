import { eventBus } from '../events/bus.js';
import { nanoid } from 'nanoid';
import {
  workflows,
  evidence,
  mutations,
  graphEdges,
  trajectory,
  invariants,
  createMutation,
  getMutation,
  getEdgesFrom,
  getGraphEdgesByTarget,
  getDb
} from '../../store/index.js';
import type { Mutation, TrajectoryDelta } from '../../shared/schema/mutation.schema.js';
import type { GraphEdge } from '../../shared/schema/graph-edge.schema.js';
import { trajectoryEngine } from './trajectory.js';
import { epochDetector } from './epoch-detector.js';
import { invariantManager } from './invariant-store.js';

export interface MutationRecord {
  mutation_id: string;
  workflow_id: string;
  intent: string;
  affected_components: string[];
  trajectory_delta: TrajectoryDelta;
  evidence_refs: string[];
  epoch_id: string;
  created_at: number;
}

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export class MutationEngine {
  /**
   * Apply a mutation to the system.
   * Validates, persists, links graph edges, checks invariants, and updates trajectory.
   */
  apply(mutation: Mutation): Result<MutationRecord> {
    // Validate required fields
    if (!mutation.mutation_id || !mutation.workflow_id || !mutation.intent) {
      return { ok: false, error: 'Mutation missing required fields' };
    }
    if (!mutation.affected_components || mutation.affected_components.length === 0) {
      return { ok: false, error: 'Mutation must affect at least one component' };
    }

    const existing = getMutation(mutation.mutation_id);
    if (existing) {
      return { ok: false, error: `Mutation ${mutation.mutation_id} already exists` };
    }

    createMutation(mutation);

    // Create graph edges
    this.linkMutation(mutation);

    // Check invariants and create WEAKENS edges for severe violations
    const violations = invariantManager.check(mutation);
    for (const violation of violations) {
      if (violation.severity === 'high' || violation.severity === 'critical') {
        graphEdges.insertEdge(this.makeEdge({
          fromId: mutation.mutation_id,
          fromType: 'mutation',
          toId: violation.invariant_id,
          toType: 'invariant',
          relationship: 'WEAKENS',
          evidenceRef: violation.mutation_id
        }));
      }
    }

    // Compute trajectory point
    trajectoryEngine.computeTrajectoryPoint(mutation.mutation_id);

    // Check for epoch boundaries
    epochDetector.checkForEpochBoundary(mutation.mutation_id);

    // Emit mutation.committed event
    eventBus.emit('mutation.committed', { mutationId: mutation.mutation_id });

    return { ok: true, value: mutation };
  }

  /**
   * Roll back a mutation by removing it and its derived records.
   */
  rollback(mutationId: string): Result<void> {
    const mutation = getMutation(mutationId);
    if (!mutation) {
      return { ok: false, error: `Mutation not found: ${mutationId}` };
    }

    const db = getDb();

    // Remove graph edges originating from or targeting this mutation
    const outgoing = getEdgesFrom(mutationId);
    const incoming = getGraphEdgesByTarget(mutationId);
    for (const edge of [...outgoing, ...incoming]) {
      db.prepare('DELETE FROM graph_edges WHERE edge_id = ?').run(edge.edge_id);
    }

    // Remove trajectory points for this mutation
    db.prepare('DELETE FROM trajectory_points WHERE mutation_id = ?').run(mutationId);

    // Remove the mutation
    db.prepare('DELETE FROM mutations WHERE mutation_id = ?').run(mutationId);

    eventBus.emit('mutation.rolled_back', { mutationId });
    return { ok: true, value: undefined };
  }

  /**
   * Process a completed workflow and create a Mutation record.
   */
  async processMutation(workflowId: string): Promise<Mutation> {
    const workflow = workflows.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const evidenceList = evidence.listEvidenceByWorkflow(workflowId);

    const intent = workflow.plan_ref
      ? `Applied plan: ${workflow.plan_ref}`
      : `Workflow ${workflowId} completion`;

    const affectedComponents = this.extractAffectedComponents(evidenceList);
    if (affectedComponents.length === 0) {
      affectedComponents.push('system');
    }

    const evidenceRefs = evidenceList.map(e => e.evidence_id);

    const priorMutations = mutations.listMutations({
      component: affectedComponents[0] ?? 'system',
      limit: 10
    });
    const trajectoryDelta = this.computeTrajectoryDelta(priorMutations as Mutation[]);

    const mutationId = this.getNextMutationId();

    const mutation: Mutation = {
      mutation_id: mutationId,
      workflow_id: workflowId,
      intent,
      created_at: Date.now(),
      affected_components: affectedComponents,
      trajectory_delta: trajectoryDelta,
      evidence_refs: evidenceRefs.length > 0 ? evidenceRefs : ['none'],
      epoch_id: epochDetector.getCurrentEpoch()?.epoch_id ?? 'E-001'
    };

    const result = this.apply(mutation);
    if (!result.ok) {
      throw new Error(result.error);
    }

    return mutation;
  }

  private extractAffectedComponents(
    evidenceList: Array<{ component_id?: string; componentId?: string }>
  ): string[] {
    const components = new Set<string>();
    for (const ev of evidenceList) {
      if (ev.component_id) components.add(ev.component_id);
      if (ev.componentId) components.add(ev.componentId);
    }
    return Array.from(components);
  }

  private computeTrajectoryDelta(priorMutations: Mutation[]): TrajectoryDelta {
    const latestPoint = trajectory.getLatestTrajectoryPoint();

    const prevCoupling = latestPoint?.coupling_score ?? 0;
    const prevBoundary = latestPoint?.boundary_integrity_score ?? 1;

    const recentComponentTouches = priorMutations.slice(0, 5);
    const avgComponentsTouched = recentComponentTouches.length > 0
      ? recentComponentTouches.reduce((sum, m) => sum + m.affected_components.length, 0) / recentComponentTouches.length
      : 1;

    const couplingDelta = avgComponentsTouched > 1 ? 0.1 : 0;
    const boundaryIntegrityDelta = recentComponentTouches.length > 0 ? -0.05 : 0;
    const behaviorDelta = recentComponentTouches.length > 0 ? 0.05 : 0;

    const invariantChanges: TrajectoryDelta['invariantChanges'] = [];
    for (const mutation of recentComponentTouches) {
      const edges = getEdgesFrom(mutation.mutation_id, 'WEAKENS');
      for (const edge of edges) {
        const inv = invariants.getInvariant(edge.to_id);
        if (inv && inv.status !== 'HOLDING') {
          invariantChanges.push({
            invariant_id: inv.invariant_id,
            previousStatus: 'HOLDING',
            newStatus: inv.status as TrajectoryDelta['invariantChanges'][number]['newStatus']
          });
        }
      }
    }

    return {
      couplingDelta,
      boundaryIntegrityDelta,
      behaviorDelta,
      invariantChanges
    };
  }

  private getNextMutationId(): string {
    const count = mutations.countMutations();
    return `M-${count + 1001}`;
  }

  private linkMutation(mutation: Mutation): void {
    graphEdges.insertEdge(this.makeEdge({
      fromId: mutation.workflow_id,
      fromType: 'workflow',
      toId: mutation.mutation_id,
      toType: 'mutation',
      relationship: 'PRODUCES'
    }));

    for (const compId of mutation.affected_components) {
      graphEdges.insertEdge(this.makeEdge({
        fromId: mutation.mutation_id,
        fromType: 'mutation',
        toId: compId,
        toType: 'component',
        relationship: 'TOUCHES'
      }));
    }

    const previous = mutations.listMutations({ limit: 2 });
    if (previous.length >= 2) {
      const prevMutation = previous[1];
      graphEdges.insertEdge(this.makeEdge({
        fromId: prevMutation.mutation_id,
        fromType: 'mutation',
        toId: mutation.mutation_id,
        toType: 'mutation',
        relationship: 'FOLLOWS'
      }));
    }
  }

  private makeEdge(params: {
    fromId: string;
    fromType: GraphEdge['from_type'];
    toId: string;
    toType: GraphEdge['to_type'];
    relationship: GraphEdge['relationship'];
    evidenceRef?: string;
  }): GraphEdge {
    return {
      edge_id: nanoid(),
      from_id: params.fromId,
      from_type: params.fromType,
      to_id: params.toId,
      to_type: params.toType,
      relationship: params.relationship,
      confidence: 1.0,
      evidence_ref: params.evidenceRef ?? null,
      created_at: Date.now()
    };
  }
}

export const mutationEngine = new MutationEngine();
