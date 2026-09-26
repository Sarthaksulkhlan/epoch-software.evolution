import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { historyPatch, isolate } from '../helpers/isolated.js';
import { resetDemo } from '../../src/demo/seed.js';
import { createApp } from '../../src/api/server.js';
import { applyPatch, sampleRepoPath } from '../../src/sandbox/sample-repo.js';
import { eventBus, type PlatformEvent } from '../../src/core/events/bus.js';

/**
 * The demo story, end to end over the HTTP API: a locally-correct feature,
 * safe-looking AI changes, drift and an incident, the candidate causal chain,
 * two measured futures, and the remediation that returns the trajectory to
 * its envelope. The scripted patches stand in for the changes Bob makes live.
 */

const env = isolate('golden');
const app = createApp({ log: false });
const seen: PlatformEvent[] = [];
const listener = (e: PlatformEvent): void => { seen.push(e); };

async function call(method: 'GET' | 'POST', path: string, body?: unknown) {
  const response = await app.request(path, { method, headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const payload = (await response.json()) as Record<string, any>;
  if (response.status >= 400) throw new Error(`${method} ${path} → ${response.status}: ${JSON.stringify(payload)}`);
  return payload;
}

const types = (): string[] => seen.map(e => e.type);

beforeAll(async () => {
  await resetDemo();
  eventBus.onAny(listener);
});
afterAll(() => {
  eventBus.offAny(listener);
  env.cleanup();
});

describe('golden path', () => {
  let workflowId = '';

  it('previews the trajectory impact of the chargeback change before approval', async () => {
    const started = await call('POST', '/api/workflows', { requirement: 'Extend chargeback eligibility from 15 to 30 days. All customer-facing touchpoints must reflect the new window.', author: 'IBM Bob (test stand-in)' });
    workflowId = started.workflow.workflow_id;
    await call('POST', `/api/workflows/${workflowId}/plan`, { actor: 'IBM Bob', plan: 'Update CHARGEBACK_WINDOW_DAYS and the receipt notice.' });
    await call('POST', `/api/workflows/${workflowId}/run`);
    applyPatch(historyPatch('scripted/M-1042.patch'), sampleRepoPath());

    const hook = await call('POST', '/api/hooks/file-changed', { file: 'src/api/disputes.ts' });
    expect(hook.invariantTransitions).toEqual([{ invariantId: 'INV-TIME-02', from: 'HOLDING', to: 'WEAKENED' }]);

    const { package: pkg } = await call('POST', `/api/workflows/${workflowId}/request-approval`, { actor: 'IBM Bob' });
    expect(pkg.status).toBe('AWAITING_APPROVAL');
    expect(pkg.riskLevel).toBe('high');
    expect(pkg.trajectoryPreview.invariantTransitions).toEqual([{ invariantId: 'INV-TIME-02', from: 'HOLDING', to: 'WEAKENED' }]);
    expect(pkg.openQuestions.some((q: string) => q.includes('LEDGER_RETENTION_DAYS'))).toBe(true);
    expect(pkg.tests).toEqual({ passed: 11, failed: 0 });
  });

  it('records M-1042 on approval: tests pass, INV-TIME-02 weakens', async () => {
    const { mutation } = await call('POST', `/api/workflows/${workflowId}/approve`, { actor: 'reviewer', rationale: 'Retention is out of scope' });
    expect(mutation.mutation_id).toBe('M-1042');
    expect(mutation.commit_sha).toMatch(/^[0-9a-f]{40}$/);
    expect(mutation.trajectory_delta.invariantChanges).toEqual([{ invariant_id: 'INV-TIME-02', previousStatus: 'HOLDING', newStatus: 'WEAKENED' }]);
    expect(types()).toContain('drift.detected');
  });

  it('turns safe-looking AI changes into boundary erosion, a new epoch and INC-3312', async () => {
    const { steps } = await call('POST', '/api/demo/replay', {});
    expect(steps.map((s: { mutationId: string }) => s.mutationId)).toEqual(['M-1051', 'M-1077', 'M-1084']);

    const { findings } = await call('GET', '/api/drift?status=open');
    const byPattern = Object.fromEntries(findings.map((f: { pattern: string; severity: string }) => [f.pattern, f.severity]));
    expect(byPattern).toEqual({ boundary_erosion: 'critical', invariant_weakening: 'critical', dependency_growth: 'warning' });

    const { incidents } = await call('GET', '/api/incidents');
    expect(incidents.map((i: { incident_id: string; status: string }) => [i.incident_id, i.status])).toEqual([['INC-3312', 'detected']]);

    const { epochs } = await call('GET', '/api/trajectory/epochs');
    expect(epochs.map((e: { epoch_id: string; start_mutation_id: string }) => [e.epoch_id, e.start_mutation_id])).toEqual([['E-0', 'M-1020'], ['E-1', 'M-1077']]);

    const { snapshot } = await call('GET', '/api/trajectory/snapshot');
    expect(snapshot.boundaryIntegrityScore).toBe(0.5);
    expect(snapshot.withinEnvelope).toBe(false);
  });

  it('traces INC-3312 back to M-1042 as the earliest plausible mutation', async () => {
    const { chain } = await call('GET', '/api/graph/causal-chain?incident=INC-3312');
    expect(chain.chain).toEqual(['M-1042', 'M-1051', 'M-1077']);
    expect(chain.earliestPlausible).toMatchObject({ mutationId: 'M-1042', evidenceStatus: 'hypothesised' });
    expect(chain.mostProximate).toMatchObject({ mutationId: 'M-1077', evidenceStatus: 'inferred' });
  });

  it('measures two futures and recommends restoring the boundary', async () => {
    const { simulation } = await call('POST', '/api/demo/futures');
    const byId = Object.fromEntries(simulation.scenarios.map((s: { scenario_id: string }) => [s.scenario_id, s]));
    expect(byId.A).toMatchObject({ boundary_integrity_after: 0.75, tests_failed: 0, probes_failed: [] });
    expect(byId.B).toMatchObject({ boundary_integrity_after: 1, tests_failed: 0, probes_failed: [] });

    const scenarios = await call('GET', '/api/v1/simulations') as unknown as Array<Record<string, unknown>>;
    expect(scenarios.find(s => s.recommended)?.scenarioId).toBe('B');

    const adopted = await call('POST', '/api/v1/simulations/remediate', { scenarioId: `${simulation.simulation_id}:B`, author: 'reviewer' });
    workflowId = adopted.workflowId;
  });

  it('remediates through the same governed lifecycle and returns to the envelope', async () => {
    await call('POST', `/api/workflows/${workflowId}/plan`, { actor: 'IBM Bob' });
    await call('POST', `/api/workflows/${workflowId}/run`);
    const { package: pkg } = await call('POST', `/api/workflows/${workflowId}/request-approval`, { actor: 'IBM Bob' });
    expect(pkg.riskLevel).toBe('low');
    expect(pkg.trajectoryPreview.withinEnvelope).toBe(true);

    const { mutation } = await call('POST', `/api/workflows/${workflowId}/approve`, { actor: 'reviewer', rationale: 'Adopt future B' });
    expect(mutation.mutation_id).toBe('M-1085');

    const { snapshot } = await call('GET', '/api/trajectory/snapshot');
    expect(snapshot).toMatchObject({ boundaryIntegrityScore: 1, withinEnvelope: true });
    expect(snapshot.invariants.every((i: { status: string }) => i.status === 'HOLDING')).toBe(true);

    const { incident } = await call('GET', '/api/incidents/INC-3312');
    expect(incident.status).toBe('resolved');

    const { epochs } = await call('GET', '/api/trajectory/epochs');
    expect(epochs.at(-1)).toMatchObject({ epoch_id: 'E-2', start_mutation_id: 'M-1085', status: 'proposed' });

    const { edges } = await call('GET', '/api/graph');
    expect(edges.some((e: { relationship: string; to_id: string }) => e.relationship === 'SPAWNED' && e.to_id === 'M-1085')).toBe(true);
    expect(edges.some((e: { relationship: string; to_id: string }) => e.relationship === 'REMEDIATES' && e.to_id === 'INC-3312')).toBe(true);
  });
});
