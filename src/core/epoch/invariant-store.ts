import { eventBus } from '../events/bus.js';
import { invariants } from '../../store/index.js';
import type { Invariant, InvariantStatus } from '../../shared/schema/invariant.schema.js';
import type { RepoSpec } from '../../graph/scanner/spec.js';
import type { ScanResult } from '../../graph/scanner/scanner.js';
import type { InvariantTransition } from '../../graph/scanner/diff.js';

const SEVERITY_RANK: Record<InvariantStatus, number> = { HOLDING: 0, WEAKENED: 1, VIOLATED: 2 };

export function isDegradation(from: InvariantStatus, to: InvariantStatus): boolean {
  return SEVERITY_RANK[to] > SEVERITY_RANK[from];
}

/**
 * Keeps the invariant registry in step with the watched repository. Statuses
 * change only from scanner results (observed), never from declared deltas.
 */
export class InvariantManager {
  /** Declare every invariant from the spec that is not registered yet. */
  syncFromSpec(spec: RepoSpec, at: number): void {
    for (const item of spec.invariants) {
      if (invariants.getInvariant(item.id)) continue;
      const invariant: Invariant = {
        invariant_id: item.id,
        statement: `${item.name}: ${item.statement}`,
        scope_components: item.components,
        status: 'HOLDING',
        violation_mutations: [],
        created_at: at
      };
      if (item.owner) invariant.owner = item.owner;
      invariants.insertInvariant(invariant);
    }
  }

  /** Apply a scan to the registry and return the status transitions it caused. */
  applyScan(scan: ScanResult, mutationId: string): InvariantTransition[] {
    const transitions: InvariantTransition[] = [];
    for (const result of scan.invariants) {
      const current = invariants.getInvariant(result.invariantId);
      if (!current) continue;
      invariants.updateInvariantStatus(result.invariantId, result.status, mutationId);
      if (current.status === result.status) continue;
      transitions.push({ invariantId: result.invariantId, from: current.status, to: result.status });
      if (isDegradation(current.status, result.status)) invariants.addViolationMutation(result.invariantId, mutationId);
    }
    return transitions;
  }

  /** Emit invariant.changed for transitions once the mutation is committed. */
  announce(transitions: InvariantTransition[], mutationId: string): void {
    for (const t of transitions) {
      eventBus.emit('invariant.changed', { invariantId: t.invariantId, from: t.from, to: t.to, mutationId });
    }
  }

  /** Register an invariant declared by a person through the API. It has no machine rule. */
  declare(id: string, statement: string, scopeComponents: string[], at: number, owner?: string): Invariant {
    const invariant: Invariant = {
      invariant_id: id,
      statement,
      scope_components: scopeComponents,
      status: 'HOLDING',
      violation_mutations: [],
      created_at: at
    };
    if (owner) invariant.owner = owner;
    invariants.insertInvariant(invariant);
    return invariant;
  }

  getAll(): Invariant[] {
    return invariants.listInvariants();
  }

  get(invariantId: string): Invariant | undefined {
    return invariants.getInvariant(invariantId);
  }
}

export const invariantManager = new InvariantManager();
