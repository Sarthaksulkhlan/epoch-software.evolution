import { mutations, invariants, events } from '../../store/index.js';

import type { ContextBundle, MutationSummary, Event, Invariant } from '../../shared/schema/index.js';

export class ContextBuilder {
  /**
   * Assemble a full ContextBundle for a workflow.
   * Queries the store for prior mutations, invariants, and telemetry.
   */
  async build(workflowId: string, triggerEventId: string): Promise<ContextBundle> {
    const event = events.getEvent(triggerEventId);
    const repository = {
      repo: event?.repo ?? 'sample-app',
      branch: event?.branch ?? 'main',
      head_commit: 'HEAD',
      file_tree_digest: 'sha256:...',
      relevant_files: []
    };

    const components = this.resolveComponents(event);

    const prior_mutations = this.getPriorMutations(components, 10);
    const active_invariants = this.getRelevantInvariants(components);

    return {
      workflow_id: workflowId,
      assembled_at: Date.now(),
      repository,
      requirements: [], // Stub
      prior_mutations,
      invariants: active_invariants,
      provenance: []
    };
  }

  /**
   * Resolve affected components from the trigger event payload.
   */
  private resolveComponents(event: Event | undefined): string[] {
    if (!event) return ['system'];

    const payload = event.payload ?? {};
    const fromPayload = payload.affected_components;
    if (Array.isArray(fromPayload) && fromPayload.length > 0) {
      return fromPayload.map(String);
    }

    const fromComponent = payload.component;
    if (typeof fromComponent === 'string' && fromComponent.length > 0) {
      return [fromComponent];
    }

    return ['system'];
  }

  /**
   * Get prior mutations relevant to the affected components.
   */
  private getPriorMutations(components: string[], limit: number): MutationSummary[] {
    const results: MutationSummary[] = [];
    for (const component of components) {
      const muts = mutations.listMutations({ component, limit });
      for (const m of muts) {
        results.push({
          mutation_id: m.mutation_id,
          intent: m.intent,
          affected_components: m.affected_components,
          trajectory_delta: m.trajectory_delta,
          created_at: m.created_at
        });
      }
    }
    return results;
  }

  /**
   * Get active invariants for affected components.
   */
  private getRelevantInvariants(components: string[]): Invariant[] {
    const results: Invariant[] = [];
    for (const component of components) {
      results.push(...invariants.getInvariantsByComponent(component));
    }
    return results;
  }
}

export const contextBuilder = new ContextBuilder();
