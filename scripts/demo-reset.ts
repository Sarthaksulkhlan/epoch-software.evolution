#!/usr/bin/env tsx
import { apiIsUp, API_URL, fail, post } from './cli.js';
import type { SeedSummary } from '../src/demo/seed.js';

/** Rebuild the demo: fresh database, fresh sample repository, seeded E-0 history. */
async function main(): Promise<void> {
  let summary: SeedSummary;
  if (await apiIsUp()) {
    console.log(`Resetting through the running API at ${API_URL} …`);
    summary = (await post<{ summary: SeedSummary }>('/api/demo/reset')).summary;
  } else {
    const { resetDemo, finishSeed } = await import('../src/demo/seed.js');
    summary = await resetDemo();
    finishSeed();
  }
  console.log(`✔ Seeded ${summary.mutations} mutations (epoch E-0) in ${summary.durationMs} ms`);
  console.log(`  Sample repo baseline ${summary.baselineSha.slice(0, 7)}; tests ${summary.testsPassed} passed, ${summary.testsFailed} failed`);
  console.log(`  Boundary integrity ${summary.boundaryIntegrityScore.toFixed(3)}, coupling ${summary.couplingScore.toFixed(3)}`);
}

main().catch(fail);
