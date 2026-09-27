import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { isolate } from '../helpers/isolated.js';
import { resetDemo } from '../../src/demo/seed.js';
import { createApp } from '../../src/api/server.js';

const env = isolate('sse-ready');
const app = createApp({ log: false });

beforeAll(async () => {
  await resetDemo();
});
afterAll(() => env.cleanup());

describe('SSE ready event', () => {
  it('sends a ready event as the first chunk when a client connects', async () => {
    const response = await app.request('/api/v1/stream');

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toMatch(/text\/event-stream/);

    // Read the first chunk only; abort the stream immediately after.
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let accumulated = '';

    // Collect bytes until we see the double-newline that closes the first event.
    while (!accumulated.includes('\n\n')) {
      const { value, done } = await reader.read();
      if (done) break;
      accumulated += decoder.decode(value, { stream: true });
    }
    reader.cancel();

    // The first SSE frame must be the `ready` event.
    expect(accumulated).toContain('event: ready');
    expect(accumulated).toContain('data: {}');
  });
});
