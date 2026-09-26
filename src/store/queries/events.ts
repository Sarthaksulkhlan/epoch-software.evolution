import { getDb } from '../db.js';

export interface Event {
  event_id: string;
  type: string;
  source: string;
  timestamp: number;
  repo: string | null;
  branch: string | null;
  payload: any;
}

export function insertEvent(event: Event): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO events (event_id, type, source, timestamp, repo, branch, payload)
    VALUES (@event_id, @type, @source, @timestamp, @repo, @branch, @payload)
  `);
  
  stmt.run({
    ...event,
    payload: JSON.stringify(event.payload)
  });
}

export function getEvent(eventId: string): Event | undefined {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM events WHERE event_id = ?');
  const row = stmt.get(eventId) as any;
  if (!row) return undefined;
  
  return {
    ...row,
    payload: JSON.parse(row.payload)
  };
}

export function listEvents(options: { type?: string, limit?: number, offset?: number } = {}): Event[] {
  const db = getDb();
  let query = 'SELECT * FROM events';
  const params: any[] = [];
  
  if (options.type) {
    query += ' WHERE type = ?';
    params.push(options.type);
  }
  
  query += ' ORDER BY timestamp DESC';
  
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
  
  return rows.map(row => ({
    ...row,
    payload: JSON.parse(row.payload)
  }));
}

export function countEvents(): number {
  const db = getDb();
  const stmt = db.prepare('SELECT COUNT(*) as count FROM events');
  const row = stmt.get() as { count: number };
  return row.count;
}
