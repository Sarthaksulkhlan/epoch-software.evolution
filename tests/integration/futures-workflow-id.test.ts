import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { isolate } from '../helpers/isolated.js';
import { resetDemo } from '../../src/demo/seed.js';
import { createApp } from '../../src/api/server.js';
import { mutations, simulations } from '../../src/store/index.js';
import type { Simulation } from '../../src/shared/schema/simulation.schema.js';

const env = isolate('futures-workflow-id');
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

describe('GET /api/v1/simulations — remediationWorkflowId', () => {
  it('returns remediationWorkflowId on the adopted scenario after select', async () => {
    // Use the latest seeded mutation as the divergence point.
    const base = mutations.getLatestMutation();
    expect(base).toBeTruthy();

    // Insert a completed simulation directly to avoid running real worktrees.
    const sim: Simulation = {
      simulation_id: 'sim-test-001',
      base_mutation_id: base!.mutation_id,
      base_state_hash: 'abc123',
      hypothesis: 'Test hypothesis',
      scenarios: [
        {
          scenario_id: 'sc-a',
          label: 'Option A',
          description: 'First option',
          branch_name: 'epoch/sim-sc-a-sim-test-001',
          status: 'COMPLETED',
          changes: ['src/api/disputes.ts'],
          diff: '--- a/src/api/disputes.ts\n+++ b/src/api/disputes.ts\n@@ -1 +1 @@\n-x\n+y\n',
          tests_passed: 5,
          tests_failed: 0,
          probes_failed: [],
          boundary_integrity_after: 1,
          coupling_score_after: 0.2,
          test_pass_rate: 1
        }
      ],
      status: 'COMPLETED',
      created_at: Date.now()
    };
    simulations.insertSimulation(sim);

    // Start a workflow and simulate the adopted state by calling the console remediate endpoint.
    // We need a workflow to already be in a state where we can select. Instead, manually update
    // the simulation to set selected_scenario_id and outcome_ref (as futuresSimulator.select does).
    const wfRes = await json('/api/v1/workflows', {
      method: 'POST',
      body: { requirement: 'Adopt scenario A from simulation sim-test-001', author: 'test', auto: false }
    });
    expect(wfRes.status).toBe(201);
    const workflowId = wfRes.body.id as string;

    // Directly update the simulation to mirror what futuresSimulator.select does.
    simulations.updateSimulation({
      ...sim,
      selected_scenario_id: 'sc-a',
      outcome_ref: workflowId
    });

    // GET /api/v1/simulations must include remediationWorkflowId on the adopted scenario.
    const simsRes = await json('/api/v1/simulations');
    expect(simsRes.status).toBe(200);
    const items = simsRes.body as Array<Record<string, unknown>>;
    const adopted = items.find(s => s.selected === true);
    expect(adopted).toBeTruthy();
    expect(adopted!.remediationWorkflowId).toBe(workflowId);

    // Non-adopted scenarios must not carry the field.
    const nonAdopted = items.filter(s => s.selected !== true);
    for (const s of nonAdopted) {
      expect(s.remediationWorkflowId).toBeUndefined();
    }
  });
});
