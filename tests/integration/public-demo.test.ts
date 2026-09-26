import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { isolate } from '../helpers/isolated.js';
import { createApp } from '../../src/api/server.js';
import { publicDemo } from '../../src/api/public-demo.js';

/**
 * The hosted demo runs with EPOCH_PUBLIC_DEMO=1: reads are open, writes are
 * limited to adopting a measured future, running it to the gate, deciding and
 * restoring the showcase. Routes that accept patches or files are refused.
 */
const env = isolate('public-demo');
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
  let parsed: any = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    // HTML and static assets stay as text.
  }
  return { status: response.status, body: parsed, type: response.headers.get('content-type') ?? '' };
}

beforeAll(async () => {
  const restored = await call('POST', '/api/demo/showcase');
  expect(restored.status).toBe(200);
});
afterAll(() => {
  delete process.env.EPOCH_PUBLIC_DEMO;
  delete process.env.EPOCH_SHOWCASE_SNAPSHOT;
  env.cleanup();
});

describe('public demo mode', () => {
  it('prepares the showcase: drift recorded, INC-3312 open, futures A and B measured', async () => {
    const health = await call('GET', '/api/health');
    expect(health.body.demo).toMatchObject({ mode: 'public', showcase: 'ready', restoresAfterIdleMinutes: 20 });
    expect(health.body.mutations).toBe(26);

    const incident = await call('GET', '/api/incidents/INC-3312');
    expect(incident.body.incident.status).not.toBe('resolved');

    const scenarios = await call('GET', '/api/v1/simulations');
    expect(scenarios.body.map((s: { scenarioId: string }) => s.scenarioId).sort()).toEqual(['A', 'B']);
    expect(scenarios.body.find((s: { recommended: boolean }) => s.recommended)?.scenarioId).toBe('B');
  });

  it('refuses writes outside the allowed actions, including every route that takes a patch or a file', async () => {
    const refused: Array<[string, unknown]> = [
      ['/api/workflows', { requirement: 'Anything at all' }],
      ['/api/v1/workflows', { requirement: 'Anything at all' }],
      ['/api/simulations', { base_mutation_id: 'M-1084', hypothesis: 'x', scenarios: [{ id: 'X', label: 'x', patch: 'diff --git a/x b/x' }] }],
      ['/api/hooks/file-changed', { file: 'src/api/disputes.ts' }],
      ['/api/repo/discard', { actor: 'someone' }],
      ['/api/demo/reset', {}],
      ['/api/events', { type: 'workflow.manual', source: 'test', payload: {} }]
    ];
    for (const [url, body] of refused) {
      const response = await call('POST', url, body);
      expect(response.status, url).toBe(403);
      expect(response.body.error).toMatch(/read-only/);
    }
  });

  it('runs one allowed action at a time and rate-limits restoring the showcase', async () => {
    const [first, second] = await Promise.all([
      call('POST', '/api/v1/simulations/remediate', { scenarioId: 'nope:nope' }),
      call('POST', '/api/v1/simulations/remediate', { scenarioId: 'nope:nope' })
    ]);
    expect(first.status).toBe(404);
    expect(second.status).toBe(429);

    const again = await call('POST', '/api/demo/showcase');
    expect(again.status).toBe(429);
  });

  it('lets a visitor adopt future B, run it to the gate and approve it', async () => {
    const [b] = (await call('GET', '/api/v1/simulations')).body.filter((s: { scenarioId: string }) => s.scenarioId === 'B');
    const adopted = await call('POST', '/api/v1/simulations/remediate', { scenarioId: b.id, author: 'visitor' });
    expect(adopted.status).toBe(201);
    const workflowId = adopted.body.workflowId as string;

    const gate = await call('POST', `/api/workflows/${workflowId}/run-to-approval`, { actor: 'visitor' });
    expect(gate.status).toBe(200);
    expect(gate.body.package.trajectoryPreview.withinEnvelope).toBe(true);

    const decided = await call('POST', `/api/v1/workflows/${workflowId}/decision`, { decision: 'APPROVED', actor: 'visitor' });
    expect(decided.status).toBe(200);
    expect(decided.body.mutation.id).toBe('M-1085');

    const incident = await call('GET', '/api/incidents/INC-3312');
    expect(incident.body.incident.status).toBe('resolved');
  });

  it('restores the saved showcase after a visitor has changed the demo', async () => {
    expect(fs.existsSync(path.join(env.dir, 'showcase', 'epoch.db'))).toBe(true);
    const started = Date.now();
    expect(await publicDemo.buildShowcase()).toBe('ready');
    expect(Date.now() - started).toBeLessThan(10_000);

    const health = await call('GET', '/api/health');
    expect(health.body.mutations).toBe(26);
    expect((await call('GET', '/api/incidents/INC-3312')).body.incident.status).not.toBe('resolved');

    // The restored sample repository and futures worktrees are usable: future B can be adopted again.
    const [b] = (await call('GET', '/api/v1/simulations')).body.filter((s: { scenarioId: string }) => s.scenarioId === 'B');
    const adopted = await call('POST', '/api/v1/simulations/remediate', { scenarioId: b.id, author: 'second visitor' });
    expect(adopted.status).toBe(201);
    expect((await call('GET', '/api/repo/status')).body.changedFiles.length).toBeGreaterThan(0);
  });

  it('serves the built console next to the API', async () => {
    const index = await call('GET', '/');
    expect(index.type).toMatch(/text\/html/);
    expect(index.body).toContain('EPOCH console');

    const deepLink = await call('GET', '/trajectory');
    expect(deepLink.body).toContain('EPOCH console');

    const asset = await call('GET', '/assets/app.js');
    expect(asset.body).toContain('epoch');

    const missingApi = await call('GET', '/api/nowhere');
    expect(missingApi.status).toBe(404);
    expect(missingApi.body.error).toMatch(/No route/);
  });
});
