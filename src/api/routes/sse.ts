import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { eventBus, type PlatformEvent } from '../../core/events/bus.js';

export const sseRoutes = new Hono();

sseRoutes.get('/', (c) => {
  return streamSSE(c, async (stream) => {
    const handler = (event: PlatformEvent) => {
      stream.writeSSE({
        event: event.type,
        data: JSON.stringify(event),
        id: String(event.timestamp)
      });
    };

    eventBus.onAny(handler);

    const keepAlive = setInterval(() => {
      stream.writeSSE({ event: 'ping', data: '{}' });
    }, 30000);

    stream.onAbort(() => {
      eventBus.offAny(handler);
      clearInterval(keepAlive);
    });

    await new Promise(() => {});
  });
});

export function registerSSERoutes(app: Hono): void {
  app.route('/api/stream', sseRoutes);
}
