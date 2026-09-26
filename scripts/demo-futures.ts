#!/usr/bin/env tsx
import { apiIsUp, API_URL, fail, post } from './cli.js';
import type { Simulation } from '../src/shared/schema/simulation.schema.js';

/**
 * Fork and measure the two prepared futures (A: extend retention, B: restore
 * the boundary) from the latest mutation. Fallback for when Bob does not write
 * the futures live.
 */
async function main(): Promise<void> {
  let simulation: Simulation;
  if (await apiIsUp()) {
    console.log(`Forking futures through the running API at ${API_URL} …`);
    simulation = (await post<{ simulation: Simulation }>('/api/demo/futures')).simulation;
  } else {
    const { prepareFutures } = await import('../src/demo/replay.js');
    const { closeDb } = await import('../src/store/index.js');
    simulation = await prepareFutures();
    closeDb();
  }
  console.log(`✔ Simulation ${simulation.simulation_id} from ${simulation.base_mutation_id}`);
  for (const s of simulation.scenarios) {
    console.log(`  ${s.label}: boundary integrity ${s.boundary_integrity_after}, coupling ${s.coupling_score_after}, tests ${s.tests_passed}/${(s.tests_passed ?? 0) + (s.tests_failed ?? 0)}, failing probes: ${s.probes_failed?.join(', ') || 'none'}`);
  }
}

main().catch(fail);
