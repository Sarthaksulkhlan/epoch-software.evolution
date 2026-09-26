import { nanoid } from 'nanoid';
import {
  getInvariants,
  createInvariant,
  updateInvariantStore,
  getInvariant,
  addViolationMutation
} from '../../store/index.js';
import type { Invariant, InvariantStatus } from '../../shared/schema/invariant.schema.js';
import type { Mutation } from '../../shared/schema/mutation.schema.js';

export interface Violation {
  invariant_id: string;
  mutation_id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

export class InvariantManager {
  /**
   * Register an existing invariant definition.
   */
  define(invariant: Invariant): void {
    const existing = this.getInvariantById(invariant.invariant_id);
    if (existing) {
      updateInvariantStore(
        invariant.invariant_id,
        invariant.status,
        invariant.last_checked_mutation_id ?? ''
      );
      return;
    }
    createInvariant(invariant as import('../../store/queries/invariants.js').Invariant);
  }

  /**
   * Declare a new invariant.
   */
  declareInvariant(
    statement: string,
    scopeComponents: string[],
    owner?: string
  ): Invariant {
    const invariant: Invariant = {
      invariant_id: nanoid(),
      statement,
      scope_components: scopeComponents,
      owner,
      status: 'HOLDING',
      violation_mutations: [],
      created_at: Date.now()
    };

    createInvariant(invariant as import('../../store/queries/invariants.js').Invariant);
    return invariant;
  }

  /**
   * Check invariants for a set of components after a mutation.
   * Returns invariants whose status may have changed.
   */
  checkInvariants(components: string[], mutationId: string): Invariant[] {
    const relatedInvariants = this.getInvariantsForComponents(components);
    const affectedInvariants: Invariant[] = [];

    for (const inv of relatedInvariants) {
      const previousStatus = inv.status;
      let newStatus: InvariantStatus = previousStatus;

      // Deterministic weakening based on recorded violation history
      const violationCount = inv.violation_mutations.length;
      if (previousStatus === 'HOLDING' && violationCount > 0) {
        newStatus = 'WEAKENED';
      } else if (previousStatus === 'WEAKENED' && violationCount > 2) {
        newStatus = 'VIOLATED';
      }

      if (newStatus !== previousStatus) {
        this.updateStatus(inv.invariant_id, newStatus, mutationId);
        affectedInvariants.push(this.getInvariantById(inv.invariant_id)!);
      }
    }

    return affectedInvariants;
  }

  /**
   * Check a mutation against all registered invariants and return violations.
   */
  check(mutation: Mutation): Violation[] {
    const related = this.getInvariantsForComponents(mutation.affected_components);
    const violations: Violation[] = [];
    const boundaryDelta = mutation.trajectory_delta.boundaryIntegrityDelta;

    for (const inv of related) {
      // A mutation violates an invariant if it degrades boundary integrity
      // for a component the invariant scopes.
      if (boundaryDelta < -0.05 && inv.status !== 'VIOLATED') {
        const severity: Violation['severity'] =
          boundaryDelta < -0.3 ? 'critical' : boundaryDelta < -0.15 ? 'high' : 'medium';
        violations.push({
          invariant_id: inv.invariant_id,
          mutation_id: mutation.mutation_id,
          severity,
          message: `Mutation degraded boundary integrity (${boundaryDelta.toFixed(2)}) for scoped components`
        });

        addViolationMutation(inv.invariant_id, mutation.mutation_id);
        if (inv.status === 'HOLDING') {
          this.updateStatus(inv.invariant_id, 'WEAKENED', mutation.mutation_id);
        } else if (inv.status === 'WEAKENED') {
          this.updateStatus(inv.invariant_id, 'VIOLATED', mutation.mutation_id);
        }
      }
    }

    return violations;
  }

  /**
   * Update invariant status based on evidence.
   */
  updateStatus(
    invariantId: string,
    newStatus: InvariantStatus,
    mutationId: string
  ): void {
    const invariant = this.getInvariantById(invariantId);
    if (invariant) {
      updateInvariantStore(invariantId, newStatus, mutationId);
      if (newStatus !== 'HOLDING') {
        addViolationMutation(invariantId, mutationId);
      }
    }
  }

  /**
   * Get all invariants for given components.
   */
  getInvariantsForComponents(components: string[]): Invariant[] {
    const all = this.getAllInvariants();
    const componentsSet = new Set(components);
    return all.filter(inv =>
      inv.scope_components.some(comp => componentsSet.has(comp))
    );
  }

  /**
   * Get all invariants with their current status.
   */
  getAllInvariants(): Invariant[] {
    return getInvariants() as Invariant[];
  }

  /**
   * Restore an invariant to HOLDING (after remediation).
   */
  restoreInvariant(invariantId: string, mutationId: string): void {
    this.updateStatus(invariantId, 'HOLDING', mutationId);
  }

  private getInvariantById(id: string): Invariant | undefined {
    return getInvariant(id) as Invariant | undefined;
  }
}

export const invariantManager = new InvariantManager();
