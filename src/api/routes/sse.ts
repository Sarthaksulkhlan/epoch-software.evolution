import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { eventBus, type PlatformEvent } from '../../core/events/bus.js';

const KEEP_ALIVE_MS = 25_000;

/**
 * Stream platform events as Server-Sent Events (ADR-006). The event name is
 * the platform event type, the id is the bus id, and a reconnecting client
 * that sends Last-Event-ID receives what it missed from the retained buffer.
 */
export type SseMessage = { event: string; data: unknown };

export function streamEvents(transform: (event: PlatformEvent) => SseMessage[]) {
  return new Hono().get('/', c => streamSSE(c, async stream => {
    const lastId = Number.parseInt(c.req.header('Last-Event-ID') ?? c.req.query('since') ?? '0', 10) || 0;
    let open = true;

    const send = async (event: PlatformEvent): Promise<void> => {
      for (const out of transform(event)) {
        if (!open) return;
        await stream.writeSSE({ event: out.event, data: JSON.stringify(out.data), id: String(event.id) });
      }
    };

    if (lastId > 0) for (const past of eventBus.recent(lastId)) await send(past);
    const handler = (event: PlatformEvent): void => { void send(event); };
    eventBus.onAny(handler);
    const keepAlive = setInterval(() => { void stream.writeSSE({ event: 'ping', data: '{}' }); }, KEEP_ALIVE_MS);

    // Signal that the stream is open immediately so clients don't wait up to 25 s.
    await stream.writeSSE({ event: 'ready', data: '{}' });

    stream.onAbort(() => {
      open = false;
      eventBus.offAny(handler);
      clearInterval(keepAlive);
    });
    while (open) await stream.sleep(1000);
  }));
}

export function registerSSERoutes(app: Hono): void {
  app.route('/api/stream', streamEvents(event => [{ event: event.type, data: event }]));
}
