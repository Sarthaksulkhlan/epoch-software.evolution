import { getDb } from '../db.js';
import { compact, decodeJson, json, param, type Row } from '../rows.js';
import { MutationSchema, type Mutation } from '../../shared/schema/mutation.schema.js';

const JSON_COLUMNS = ['affected_components', 'evidence_refs', 'trajectory_delta'] as const;
const SEQUENCE_ORDER = 'CAST(SUBSTR(mutation_id, 3) AS INTEGER)';

function toMutation(row: Row): Mutation {
  return MutationSchema.parse(compact(decodeJson(row, JSON_COLUMNS)));
}

export function insertMutation(mutation: Mutation): void {
  getDb().prepare(`
    INSERT INTO mutations (
      mutation_id, workflow_id, intent, affected_components, delta_summary,
      evidence_refs, trajectory_delta, epoch_id, created_at,
      commit_sha, author, compensates_mutation_id
    ) VALUES (
      @mutation_id, @workflow_id, @intent, @affected_components, @delta_summary,
      @evidence_refs, @trajectory_delta, @epoch_id, @created_at,
      @commit_sha, @author, @compensates_mutation_id
    )
  `).run({
    mutation_id: mutation.mutation_id,
    workflow_id: mutation.workflow_id,
    intent: mutation.intent,
    affected_components: json(mutation.affected_components),
    delta_summary: param(mutation.delta_summary),
    evidence_refs: json(mutation.evidence_refs),
    trajectory_delta: json(mutation.trajectory_delta),
    epoch_id: mutation.epoch_id,
    created_at: mutation.created_at,
    commit_sha: param(mutation.commit_sha),
    author: param(mutation.author),
    compensates_mutation_id: param(mutation.compensates_mutation_id)
  });
}

export function getMutation(mutationId: string): Mutation | undefined {
  const row = getDb().prepare('SELECT * FROM mutations WHERE mutation_id = ?').get(mutationId) as Row | undefined;
  return row ? toMutation(row) : undefined;
}

export interface ListMutationsOptions {
  component?: string | undefined;
  epochId?: string | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
  /** 'desc' (default) returns the newest first. */
  order?: 'asc' | 'desc' | undefined;
}

export function listMutations(options: ListMutationsOptions = {}): Mutation[] {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options.component) {
    conditions.push('EXISTS (SELECT 1 FROM json_each(mutations.affected_components) WHERE json_each.value = ?)');
    params.push(options.component);
  }
  if (options.epochId) {
    conditions.push('epoch_id = ?');
    params.push(options.epochId);
  }

  const direction = options.order === 'asc' ? 'ASC' : 'DESC';
  let sql = 'SELECT * FROM mutations';
  if (conditions.length > 0) sql += ` WHERE ${conditions.join(' AND ')}`;
  sql += ` ORDER BY ${SEQUENCE_ORDER} ${direction} LIMIT ? OFFSET ?`;
  params.push(options.limit ?? -1, options.offset ?? 0);

  return (getDb().prepare(sql).all(...params) as Row[]).map(toMutation);
}

/** Highest numeric mutation sequence recorded so far (M-1041 → 1041), or 0. */
export function getLatestMutationSequence(): number {
  const row = getDb()
    .prepare(`SELECT mutation_id FROM mutations ORDER BY ${SEQUENCE_ORDER} DESC LIMIT 1`)
    .get() as { mutation_id: string } | undefined;
  if (!row) return 0;
  const match = /^M-(\d+)$/.exec(row.mutation_id);
  return match?.[1] ? Number.parseInt(match[1], 10) : 0;
}

export function getLatestMutation(): Mutation | undefined {
  const row = getDb()
    .prepare(`SELECT * FROM mutations ORDER BY ${SEQUENCE_ORDER} DESC LIMIT 1`)
    .get() as Row | undefined;
  return row ? toMutation(row) : undefined;
}

export function getMutationByWorkflow(workflowId: string): Mutation | undefined {
  const row = getDb().prepare('SELECT * FROM mutations WHERE workflow_id = ?').get(workflowId) as Row | undefined;
  return row ? toMutation(row) : undefined;
}

export function countMutations(): number {
  const row = getDb().prepare('SELECT COUNT(*) AS count FROM mutations').get() as { count: number };
  return row.count;
}
