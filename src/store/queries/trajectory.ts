import { getDb } from '../db.js';

export interface TrajectoryPoint {
  id?: number;
  mutation_id: string | null;
  timestamp: number;
  coupling_score: number | null;
  boundary_integrity_score: number | null;
  drift_delta: number | null;
  epoch_id: string | null;
  state_hash: string | null;
}

export function insertTrajectoryPoint(point: TrajectoryPoint): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO trajectory_points (
      mutation_id, timestamp, coupling_score, boundary_integrity_score,
      drift_delta, epoch_id, state_hash
    ) VALUES (
      @mutation_id, @timestamp, @coupling_score, @boundary_integrity_score,
      @drift_delta, @epoch_id, @state_hash
    )
  `);
  stmt.run(point);
}

export function getTrajectoryPoint(mutationId: string): TrajectoryPoint | undefined {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM trajectory_points WHERE mutation_id = ?');
  return stmt.get(mutationId) as TrajectoryPoint | undefined;
}

export function listTrajectoryPoints(options: { limit?: number, epochId?: string } = {}): TrajectoryPoint[] {
  const db = getDb();
  let query = 'SELECT * FROM trajectory_points';
  const params: any[] = [];
  
  if (options.epochId) {
    query += ' WHERE epoch_id = ?';
    params.push(options.epochId);
  }
  
  query += ' ORDER BY timestamp DESC';
  
  if (options.limit !== undefined) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }
  
  const stmt = db.prepare(query);
  return stmt.all(...params) as TrajectoryPoint[];
}

export function getLatestTrajectoryPoint(): TrajectoryPoint | undefined {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM trajectory_points ORDER BY timestamp DESC LIMIT 1');
  return stmt.get() as TrajectoryPoint | undefined;
}

export function getTrajectoryWindow(count: number): TrajectoryPoint[] {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM trajectory_points ORDER BY timestamp DESC LIMIT ?');
  const rows = stmt.all(count) as TrajectoryPoint[];
  return rows.reverse(); // Return in chronological order
}
