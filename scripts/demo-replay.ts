#!/usr/bin/env tsx
import { apiIsUp, API_URL, fail, post } from './cli.js';
import type { ReplayedStep } from '../src/demo/replay.js';

/**
 * Replay the safe-looking AI changes (M-1051, M-1077,
 * M-1084). Pass --with-feature to land the scripted M-1042 first when Bob has
 * not implemented the chargeback change live.
 */
async function main(): Promise<void> {
  const withFeature = process.argv.includes('--with-feature');
  let steps: ReplayedStep[];
  if (await apiIsUp()) {
    console.log(`Replaying through the running API at ${API_URL} (watch the console) …`);
    steps = (await post<{ steps: ReplayedStep[] }>('/api/demo/replay', { with_feature: withFeature })).steps;
  } else {
    const { resetDemo } = await import('../src/demo/seed.js');
    const { getDb, initializeSchema, mutations, closeDb } = await import('../src/store/index.js');
    initializeSchema(getDb());
    if (mutations.countMutations() === 0) await resetDemo();
    const { replayDrift } = await import('../src/demo/replay.js');
    steps = await replayDrift({ withFeature });
    closeDb();
  }
  for (const step of steps) {
    if (step.skipped) {
      console.log(`• ${step.mutationId} already recorded, skipped`);
      continue;
    }
    console.log(`✔ ${step.mutationId} merged (gate risk ${step.riskLevel}); open findings: ${step.openFindings.join(', ') || 'none'}; open incidents: ${step.openIncidents.join(', ') || 'none'}`);
  }
}

main().catch(fail);
