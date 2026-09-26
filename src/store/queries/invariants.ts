import { getDb } from '../db.js';
import { compact, decodeJson, json, param, type Row } from '../rows.js';
import { InvariantSchema, type Invariant, type InvariantStatus } from '../../shared/schema/invariant.schema.js';

function toInvariant(row: Row): Invariant {
  return InvariantSchema.parse(compact(decodeJson(row, ['scope_components', 'violation_mutations'])));
}

export function insertInvariant(invariant: Invariant): void {
  getDb().prepare(`
    INSERT INTO invariants (
      invariant_id, statement, owner, scope_components, status,
      last_checked_mutation_id, violation_mutations, created_at
    ) VALUES (
      @invariant_id, @statement, @owner, @scope_components, @status,
      @last_checked_mutation_id, @violation_mutations, @created_at
    )
  `).run({
    invariant_id: invariant.invariant_id,
    statement: invariant.statement,
    owner: param(invariant.owner),
    scope_components: json(invariant.scope_components),
    status: invariant.status,
    last_checked_mutation_id: param(invariant.last_checked_mutation_id),
    violation_mutations: json(invariant.violation_mutations),
    created_at: invariant.created_at
  });
}

export function getInvariant(invariantId: string): Invariant | undefined {
  const row = getDb().prepare('SELECT * FROM invariants WHERE invariant_id = ?').get(invariantId) as Row | undefined;
  return row ? toInvariant(row) : undefined;
}

export function listInvariants(): Invariant[] {
  const rows = getDb().prepare('SELECT * FROM invariants ORDER BY invariant_id ASC').all() as Row[];
  return rows.map(toInvariant);
}

export function listInvariantsByComponent(component: string): Invariant[] {
  const rows = getDb().prepare(`
    SELECT * FROM invariants
    WHERE EXISTS (SELECT 1 FROM json_each(invariants.scope_components) WHERE json_each.value = ?)
    ORDER BY invariant_id ASC
  `).all(component) as Row[];
  return rows.map(toInvariant);
}

export function updateInvariantStatus(invariantId: string, status: InvariantStatus, mutationId: string): void {
  getDb()
    .prepare('UPDATE invariants SET status = ?, last_checked_mutation_id = ? WHERE invariant_id = ?')
    .run(status, mutationId, invariantId);
}

export function addViolationMutation(invariantId: string, mutationId: string): void {
  const invariant = getInvariant(invariantId);
  if (!invariant || invariant.violation_mutations.includes(mutationId)) return;
  getDb()
    .prepare('UPDATE invariants SET violation_mutations = ? WHERE invariant_id = ?')
    .run(json([...invariant.violation_mutations, mutationId]), invariantId);
}
