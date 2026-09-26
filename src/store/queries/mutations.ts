import { getDb } from '../db.js';

export interface Mutation {
  mutation_id: string;
  workflow_id: string | null;
  intent: string;
  affected_components: string[]; // JSON
  delta_summary: string | null;
  evidence_refs: string[]; // JSON
  trajectory_delta: any; // JSON
  epoch_id: string | null;
  created_at: number;
}

export function insertMutation(mutation: Mutation): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO mutations (
      mutation_id, workflow_id, intent, affected_components,
      delta_summary, evidence_refs, trajectory_delta, epoch_id, created_at
    ) VALUES (
      @mutation_id, @workflow_id, @intent, @affected_components,
      @delta_summary, @evidence_refs, @trajectory_delta, @epoch_id, @created_at
    )
  `);
  stmt.run({
    ...mutation,
    affected_components: JSON.stringify(mutation.affected_components),
    evidence_refs: JSON.stringify(mutation.evidence_refs),
    trajectory_delta: JSON.stringify(mutation.trajectory_delta)
  });
}

export function getMutation(mutationId: string): Mutation | undefined {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM mutations WHERE mutation_id = ?');
  const row = stmt.get(mutationId) as any;
  if (!row) return undefined;
  
  return {
    ...row,
    affected_components: JSON.parse(row.affected_components),
    evidence_refs: JSON.parse(row.evidence_refs),
    trajectory_delta: JSON.parse(row.trajectory_delta)
  };
}

export function listMutations(options: { component?: string, epochId?: string, limit?: number, offset?: number } = {}): Mutation[] {
  const db = getDb();
  let query = 'SELECT * FROM mutations';
  const params: any[] = [];
  const conditions: string[] = [];

  if (options.epochId) {
    conditions.push('epoch_id = ?');
    params.push(options.epochId);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY created_at DESC';

  if (options.limit !== undefined) {
    query += ' LIMIT ?';
    params.push(options.limit);
    if (options.offset !== undefined) {
      query += ' OFFSET ?';
      params.push(options.offset);
    }
  }

  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as any[];
  
  let result = rows.map(row => ({
    ...row,
    affected_components: JSON.parse(row.affected_components),
    evidence_refs: JSON.parse(row.evidence_refs),
    trajectory_delta: JSON.parse(row.trajectory_delta)
  }));
  
  if (options.component) {
    result = result.filter(m => m.affected_components.includes(options.component!));
  }
  
  return result;
}

export function getLatestMutationSequence(): number {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT mutation_id FROM mutations 
    WHERE mutation_id LIKE 'M-%' 
    ORDER BY CAST(SUBSTR(mutation_id, 3) AS INTEGER) DESC 
    LIMIT 1
  `);
  const row = stmt.get() as { mutation_id: string } | undefined;
  if (!row) return 0;
  
  const match = row.mutation_id.match(/^M-(\d+)$/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 0;
}

export function getMutationsByComponent(component: string): Mutation[] {
  return listMutations({ component });
}

export function countMutations(): number {
  const db = getDb();
  const stmt = db.prepare('SELECT COUNT(*) as count FROM mutations');
  const row = stmt.get() as { count: number };
  return row.count;
}
