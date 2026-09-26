import { getDb } from '../db.js';
import { compact, decodeJson, json, param, type Row } from '../rows.js';
import { EpochSchema, type Epoch, type EpochStatus } from '../../shared/schema/epoch.schema.js';

function toEpoch(row: Row): Epoch {
  return EpochSchema.parse(compact(decodeJson(row, ['defining_properties', 'boundary_evidence'])));
}

export function insertEpoch(epoch: Epoch): void {
  getDb().prepare(`
    INSERT INTO epochs (
      epoch_id, name, start_mutation_id, end_mutation_id,
      defining_properties, boundary_evidence, status, created_at
    ) VALUES (
      @epoch_id, @name, @start_mutation_id, @end_mutation_id,
      @defining_properties, @boundary_evidence, @status, @created_at
    )
  `).run({
    epoch_id: epoch.epoch_id,
    name: epoch.name,
    start_mutation_id: epoch.start_mutation_id,
    end_mutation_id: param(epoch.end_mutation_id),
    defining_properties: json(epoch.defining_properties),
    boundary_evidence: json(epoch.boundary_evidence),
    status: epoch.status,
    created_at: epoch.created_at
  });
}

export function getEpoch(epochId: string): Epoch | undefined {
  const row = getDb().prepare('SELECT * FROM epochs WHERE epoch_id = ?').get(epochId) as Row | undefined;
  return row ? toEpoch(row) : undefined;
}

/** All epochs in the order they began. */
export function listEpochs(): Epoch[] {
  return (getDb().prepare('SELECT * FROM epochs ORDER BY created_at ASC, rowid ASC').all() as Row[]).map(toEpoch);
}

/** The most recent epoch regardless of status; new mutations belong to it. */
export function getLatestEpoch(): Epoch | undefined {
  const row = getDb().prepare('SELECT * FROM epochs ORDER BY created_at DESC, rowid DESC LIMIT 1').get() as Row | undefined;
  return row ? toEpoch(row) : undefined;
}

export function updateEpochStatus(epochId: string, status: EpochStatus): void {
  getDb().prepare('UPDATE epochs SET status = ? WHERE epoch_id = ?').run(status, epochId);
}

export function closeEpoch(epochId: string, endMutationId: string): void {
  getDb().prepare('UPDATE epochs SET end_mutation_id = ? WHERE epoch_id = ?').run(endMutationId, epochId);
}

export function nextEpochSequence(): number {
  const row = getDb()
    .prepare('SELECT MAX(CAST(SUBSTR(epoch_id, 3) AS INTEGER)) AS max FROM epochs')
    .get() as { max: number | null };
  return row.max === null ? 0 : row.max + 1;
}
