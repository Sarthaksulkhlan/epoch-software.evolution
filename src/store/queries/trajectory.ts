import { getDb } from '../db.js';
import { compact, json, type Row } from '../rows.js';
import { TrajectoryPointSchema, type TrajectoryPoint } from '../../shared/schema/trajectory-point.schema.js';

function toPoint(row: Row): TrajectoryPoint {
  const { scan: _scan, ...rest } = row;
  return TrajectoryPointSchema.parse(compact(rest));
}

/**
 * Insert a trajectory point. The structural scan behind it is stored alongside
 * so later mutations can be diffed against it.
 */
export function insertTrajectoryPoint(point: TrajectoryPoint, scan: unknown): number {
  const result = getDb().prepare(`
    INSERT INTO trajectory_points (
      mutation_id, timestamp, coupling_score, boundary_integrity_score,
      drift_delta, epoch_id, state_hash, scan
    ) VALUES (
      @mutation_id, @timestamp, @coupling_score, @boundary_integrity_score,
      @drift_delta, @epoch_id, @state_hash, @scan
    )
  `).run({
    mutation_id: point.mutation_id,
    timestamp: point.timestamp,
    coupling_score: point.coupling_score,
    boundary_integrity_score: point.boundary_integrity_score,
    drift_delta: point.drift_delta,
    epoch_id: point.epoch_id,
    state_hash: point.state_hash,
    scan: json(scan)
  });
  return Number(result.lastInsertRowid);
}

export function getTrajectoryPoint(mutationId: string): TrajectoryPoint | undefined {
  const row = getDb().prepare('SELECT * FROM trajectory_points WHERE mutation_id = ? ORDER BY id DESC LIMIT 1').get(mutationId) as Row | undefined;
  return row ? toPoint(row) : undefined;
}

export function getLatestTrajectoryPoint(): TrajectoryPoint | undefined {
  const row = getDb().prepare('SELECT * FROM trajectory_points ORDER BY id DESC LIMIT 1').get() as Row | undefined;
  return row ? toPoint(row) : undefined;
}

/** Points in chronological order; `limit` keeps the most recent N. */
export function listTrajectoryPoints(options: { limit?: number | undefined; epochId?: string | undefined } = {}): TrajectoryPoint[] {
  const params: unknown[] = [];
  let sql = 'SELECT * FROM trajectory_points';
  if (options.epochId) {
    sql += ' WHERE epoch_id = ?';
    params.push(options.epochId);
  }
  sql += ' ORDER BY id DESC LIMIT ?';
  params.push(options.limit ?? -1);
  return (getDb().prepare(sql).all(...params) as Row[]).map(toPoint).reverse();
}

/** The structural scan recorded with a mutation's trajectory point (untyped JSON). */
export function getScanForMutation(mutationId: string): unknown {
  const row = getDb()
    .prepare('SELECT scan FROM trajectory_points WHERE mutation_id = ? ORDER BY id DESC LIMIT 1')
    .get(mutationId) as { scan: string | null } | undefined;
  return row?.scan ? (JSON.parse(row.scan) as unknown) : undefined;
}

export function getLatestScan(): { mutationId: string; scan: unknown } | undefined {
  const row = getDb()
    .prepare('SELECT mutation_id, scan FROM trajectory_points WHERE scan IS NOT NULL ORDER BY id DESC LIMIT 1')
    .get() as { mutation_id: string; scan: string } | undefined;
  return row ? { mutationId: row.mutation_id, scan: JSON.parse(row.scan) as unknown } : undefined;
}
