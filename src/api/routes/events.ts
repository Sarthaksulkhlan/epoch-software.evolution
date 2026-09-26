import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { events } from '../../store/index.js';
import type { Event } from '../../store/queries/events.js';

export const eventRoutes = new Hono();

function parseEventPayload(body: Record<string, unknown>): Record<string, unknown> {
  return (body.payload ?? {}) as Record<string, unknown>;
}

eventRoutes.post('/', async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  const now = Date.now();

  const event: Event = {
    event_id: body.event_id ? String(body.event_id) : nanoid(),
    type: String(body.type ?? 'requirement.created'),
    source: String(body.source ?? 'api'),
    timestamp: typeof body.timestamp === 'number' ? body.timestamp : now,
    repo: body.repo ? String(body.repo) : null,
    branch: body.branch ? String(body.branch) : null,
    payload: parseEventPayload(body)
  };

  events.insertEvent(event);
  return c.json({ status: 'created', event }, 201);
});

eventRoutes.get('/', (c) => {
  const type = c.req.query('type');
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const offset = c.req.query('offset') ? parseInt(c.req.query('offset')!, 10) : undefined;

  const result = events.listEvents({ type, limit, offset });
  return c.json({ events: result });
});

eventRoutes.get('/:id', (c) => {
  const id = c.req.param('id');
  const event = events.getEvent(id);

  if (!event) {
    return c.json({ error: 'Event not found' }, 404);
  }

  return c.json({ event });
});

export function registerEventRoutes(app: Hono): void {
  app.route('/api/events', eventRoutes);
}
