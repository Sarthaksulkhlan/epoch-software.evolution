import { getDb } from '../db.js';
import { compact, decodeJson, json, param, type Row } from '../rows.js';
import { EventSchema, type Event } from '../../shared/schema/event.schema.js';

function toEvent(row: Row): Event {
  return EventSchema.parse(compact(decodeJson(row, ['payload'])));
}

export function insertEvent(event: Event): void {
  getDb().prepare(`
    INSERT INTO events (event_id, type, source, timestamp, repo, branch, payload)
    VALUES (@event_id, @type, @source, @timestamp, @repo, @branch, @payload)
  `).run({
    event_id: event.event_id,
    type: event.type,
    source: event.source,
    timestamp: event.timestamp,
    repo: param(event.repo),
    branch: param(event.branch),
    payload: json(event.payload)
  });
}

export function getEvent(eventId: string): Event | undefined {
  const row = getDb().prepare('SELECT * FROM events WHERE event_id = ?').get(eventId) as Row | undefined;
  return row ? toEvent(row) : undefined;
}

export function listEvents(options: { type?: string | undefined; limit?: number | undefined; offset?: number | undefined } = {}): Event[] {
  const params: unknown[] = [];
  let sql = 'SELECT * FROM events';
  if (options.type) {
    sql += ' WHERE type = ?';
    params.push(options.type);
  }
  sql += ' ORDER BY timestamp DESC, rowid DESC LIMIT ? OFFSET ?';
  params.push(options.limit ?? 100, options.offset ?? 0);
  return (getDb().prepare(sql).all(...params) as Row[]).map(toEvent);
}
