import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { isolate } from '../helpers/isolated.js';
import { resetDemo } from '../../src/demo/seed.js';
import { createApp } from '../../src/api/server.js';

const env = isolate('api');
const app = createApp({ log: false });

async function json(path: string, init?: { method?: string; body?: unknown }) {
  const response = await app.request(path, {
    method: init?.method ?? 'GET',
    headers: { 'Content-Type': 'application/json' },
    ...(init?.body === undefined ? {} : { body: JSON.stringify(init.body) })
  });
  return { status: response.status, body: (await response.json()) as Record<string, any> };
}

beforeAll(async () => {
  await resetDemo();
});
afterAll(() => env.cleanup());

describe('API contract', () => {
  it('reports health with the seeded sample repo', async () => {
    const { status, body } = await json('/api/health');
    expect(status).toBe(200);
    expect(body).toMatchObject({ status: 'ok', mutations: 22, seeded: true });
    expect(body.sampleRepo.head).toMatch(/^[0-9a-f]{40}$/);
  });

  it('rejects invalid bodies with 400 and unknown routes with 404', async () => {
    expect((await json('/api/workflows', { method: 'POST', body: { requirement: '' } })).status).toBe(400);
    expect((await json('/api/nowhere')).status).toBe(404);
    expect((await json('/api/mutations/M-9999')).status).toBe(404);
  });

  it('starts a workflow with a context bundle and enforces the state machine', async () => {
    const started = await json('/api/workflows', { method: 'POST', body: { requirement: 'Extend chargeback eligibility from 15 to 30 days. All customer-facing touchpoints must reflect the new window.', author: 'test' } });
    expect(started.status).toBe(201);
    expect(started.body.workflow.status).toBe('PLANNING');
    expect(started.body.context.repository.relevant_files).toEqual(['src/api/disputes.ts', 'src/orders/order-service.ts']);

    const id = started.body.workflow.workflow_id as string;
    const skip = await json(`/api/workflows/${id}/request-approval`, { method: 'POST', body: { actor: 'test' } });
    expect(skip.status).toBe(409);

    const approveEarly = await json(`/api/workflows/${id}/approve`, { method: 'POST', body: { actor: 'test' } });
    expect(approveEarly.status).toBe(409);

    const plan = await json(`/api/workflows/${id}/plan`, { method: 'POST', body: { actor: 'test', plan: 'Change the two constants.' } });
    expect(plan.status).toBe(200);
    expect(plan.body.workflow.status).toBe('EXECUTING');

    const context = await json(`/api/workflows/${id}/specialists/context`, { method: 'POST' });
    expect(context.body.summary).toBe('1 acceptance criteria, 2 touchpoint(s), 1 open question(s).');
    expect(context.body.evidence.some((e: { claim: string }) => e.claim.includes('LEDGER_RETENTION_DAYS'))).toBe(true);

    const abort = await json(`/api/workflows/${id}/transition`, { method: 'POST', body: { status: 'REJECTED', actor: 'test' } });
    expect(abort.body.workflow.status).toBe('REJECTED');
  });

  it('serves the console view models on /api/v1', async () => {
    const invariantsView = await json('/api/v1/invariants');
    expect(invariantsView.status).toBe(200);
    expect((invariantsView.body as unknown as Array<Record<string, unknown>>).map(i => i.id)).toEqual(['INV-BOUND-04', 'INV-DATA-01', 'INV-SEC-09', 'INV-TIME-02']);

    const snapshots = await json('/api/v1/trajectory/snapshots');
    expect((snapshots.body as unknown as Array<Record<string, unknown>>)[0]).toMatchObject({ epoch: 0, boundaryIntegrityScore: 100 });

    const graph = await json('/api/v1/trajectory/graph');
    expect(graph.body.nodes.some((n: { type: string }) => n.type === 'EpochBoundaryNode')).toBe(true);

    const active = await json('/api/v1/workflows/active');
    expect(active.status).toBe(200);
    expect(active.body.state).toBe('HALTED');
  });
});
