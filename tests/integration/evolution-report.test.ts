import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { isolate } from '../helpers/isolated.js';
import { createApp } from '../../src/api/server.js';
import { publicDemo } from '../../src/api/public-demo.js';

/**
 * Verify that after the showcase is prepared and future B is adopted through
 * the approval gate, the evolution report contains INC-3312, DRIFT-401 and
 * M-1085.
 */
const env = isolate('evolution-report');
const consoleDir = path.join(env.dir, 'console');
fs.mkdirSync(path.join(consoleDir, 'assets'), { recursive: true });
fs.writeFileSync(path.join(consoleDir, 'index.html'), '<!doctype html><title>EPOCH console</title>');
fs.writeFileSync(path.join(consoleDir, 'assets', 'app.js'), 'console.log("epoch");');

process.env.EPOCH_PUBLIC_DEMO = '1';
process.env.EPOCH_SHOWCASE_SNAPSHOT = path.join(env.dir, 'showcase');
process.env.EPOCH_CONSOLE_DIR = consoleDir;
const app = createApp({ log: false });
delete process.env.EPOCH_CONSOLE_DIR;

async function call(method: string, url: string, body?: unknown) {
  const response = await app.request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const text = await response.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    // text/markdown and HTML stay as strings
  }
  return { status: response.status, body: parsed, text, type: response.headers.get('content-type') ?? '' };
}

beforeAll(async () => {
  // Seed the showcase (M-1042 … M-1084, INC-3312 open, futures A and B measured)
  const restored = await call('POST', '/api/demo/showcase');
  expect(restored.status, 'showcase restore').toBe(200);

  // Adopt future B (the recommended one)
  const scenarios = await call('GET', '/api/v1/simulations');
  expect(scenarios.status).toBe(200);
  const [b] = (scenarios.body as Array<{ scenarioId: string; recommended: boolean; id: string }>)
    .filter(s => s.scenarioId === 'B');
  expect(b, 'future B exists').toBeDefined();

  const adopted = await call('POST', '/api/v1/simulations/remediate', {
    scenarioId: b.id,
    author: 'test'
  });
  expect(adopted.status, 'remediate').toBe(201);
  const workflowId = (adopted.body as { workflowId: string }).workflowId;

  // Run to the approval gate
  const gate = await call('POST', `/api/workflows/${workflowId}/run-to-approval`, { actor: 'test' });
  expect(gate.status, 'run-to-approval').toBe(200);

  // Approve — this records M-1085
  const decided = await call('POST', `/api/v1/workflows/${workflowId}/decision`, {
    decision: 'APPROVED',
    actor: 'test'
  });
  expect(decided.status, 'decision').toBe(200);
  expect((decided.body as { mutation: { id: string } }).mutation.id, 'mutation id').toBe('M-1085');
}, 120_000);

afterAll(() => {
  delete process.env.EPOCH_PUBLIC_DEMO;
  delete process.env.EPOCH_SHOWCASE_SNAPSHOT;
  env.cleanup();
});

describe('evolution report', () => {
  it('contains INC-3312, DRIFT-401 and M-1085', async () => {
    const r = await call('GET', '/api/v1/report');
    expect(r.status).toBe(200);
    expect(r.type).toMatch(/text\/markdown/);
    expect(r.text).toContain('INC-3312');
    expect(r.text).toContain('DRIFT-401');
    expect(r.text).toContain('M-1085');
  });
});
