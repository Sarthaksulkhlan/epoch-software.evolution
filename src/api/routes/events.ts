import { Hono } from 'hono';
import { z } from 'zod';
import { events } from '../../store/index.js';
import { EventType } from '../../shared/schema/event.schema.js';
import { generateEventId } from '../../shared/utils/id.js';
import { eventBus } from '../../core/events/bus.js';
import { notFound, parseBody, queryInt } from '../http.js';

export const eventRoutes = new Hono();

const EventBody = z.object({
  type: EventType,
  source: z.string().trim().min(1).max(120),
  payload: z.record(z.string(), z.unknown()).default({}),
  repo: z.string().optional(),
  branch: z.string().optional(),
  timestamp: z.number().int().positive().optional()
});

/** Record an external event (webhook, alert). Starting a workflow is a separate, explicit call. */
eventRoutes.post('/', async c => {
  const body = await parseBody(c, EventBody);
  const event = {
    event_id: generateEventId(),
    type: body.type,
    source: body.source,
    timestamp: body.timestamp ?? Date.now(),
    payload: body.payload,
    ...(body.repo ? { repo: body.repo } : {}),
    ...(body.branch ? { branch: body.branch } : {})
  };
  events.insertEvent(event);
  eventBus.emit('event.ingested', { eventId: event.event_id, type: event.type, source: event.source });
  return c.json({ event }, 201);
});

eventRoutes.get('/', c => c.json({
  events: events.listEvents({ type: c.req.query('type'), limit: queryInt(c, 'limit', 50), offset: queryInt(c, 'offset', 0) })
}));

eventRoutes.get('/:id', c => {
  const event = events.getEvent(c.req.param('id'));
  if (!event) throw notFound(`Event ${c.req.param('id')}`);
  return c.json({ event });
});

export function registerEventRoutes(app: Hono): void {
  app.route('/api/events', eventRoutes);
}
