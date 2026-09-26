import { getDb } from '../db.js';

export interface Invariant {
  invariant_id: string;
  statement: string;
  owner: string | null;
  scope_components: string[]; // JSON
  status: string;
  last_checked_mutation_id: string | null;
  violation_mutations: string[]; // JSON
  created_at: number;
}

export function insertInvariant(invariant: Invariant): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO invariants (
      invariant_id, statement, owner, scope_components,
      status, last_checked_mutation_id, violation_mutations, created_at
    ) VALUES (
      @invariant_id, @statement, @owner, @scope_components,
      @status, @last_checked_mutation_id, @violation_mutations, @created_at
    )
  `);
  stmt.run({
    ...invariant,
    scope_components: JSON.stringify(invariant.scope_components),
    violation_mutations: JSON.stringify(invariant.violation_mutations)
  });
}

export function getInvariant(invariantId: string): Invariant | undefined {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM invariants WHERE invariant_id = ?');
  const row = stmt.get(invariantId) as any;
  if (!row) return undefined;
  
  return {
    ...row,
    scope_components: JSON.parse(row.scope_components),
    violation_mutations: JSON.parse(row.violation_mutations)
  };
}

export function listInvariants(): Invariant[] {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM invariants');
  const rows = stmt.all() as any[];
  
  return rows.map(row => ({
    ...row,
    scope_components: JSON.parse(row.scope_components),
    violation_mutations: JSON.parse(row.violation_mutations)
  }));
}

export function updateInvariantStatus(invariantId: string, status: string, mutationId: string): void {
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE invariants 
    SET status = ?, last_checked_mutation_id = ? 
    WHERE invariant_id = ?
  `);
  stmt.run(status, mutationId, invariantId);
}

export function addViolationMutation(invariantId: string, mutationId: string): void {
  const invariant = getInvariant(invariantId);
  if (!invariant) return;
  
  const violations = new Set(invariant.violation_mutations);
  violations.add(mutationId);
  
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE invariants 
    SET violation_mutations = ? 
    WHERE invariant_id = ?
  `);
  stmt.run(JSON.stringify(Array.from(violations)), invariantId);
}

export function getInvariantsByComponent(component: string): Invariant[] {
  const all = listInvariants();
  return all.filter(inv => inv.scope_components.includes(component));
}
