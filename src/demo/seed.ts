import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { closeDb, deleteDbFile, events, getDb, initializeSchema, workflows } from '../store/index.js';
import { generateEventId, generateWorkflowId } from '../shared/utils/id.js';
import { scanRepository } from '../graph/scanner/scanner.js';
import { epochWorkDir, initSampleRepo, SAMPLE_APP_SOURCE, sampleRepoPath } from '../sandbox/sample-repo.js';
import { runProbes, runTests } from '../sandbox/runner.js';
import { clearRepoSpecCache, getRepoSpec } from '../core/epoch/spec-registry.js';
import { invariantManager } from '../core/epoch/invariant-store.js';
import { epochDetector } from '../core/epoch/epoch-detector.js';
import { mutationEngine } from '../core/epoch/mutation-engine.js';

const BaselineSchema = z.object({
  description: z.string(),
  epoch: z.object({ id: z.string(), name: z.string(), properties: z.array(z.string()) }),
  mutations: z.array(z.object({
    id: z.string().regex(/^M-\d+$/),
    at: z.string(),
    author: z.string(),
    components: z.array(z.string()).min(1),
    intent: z.string().min(1)
  })).min(1)
});

export interface SeedSummary {
  mutations: number;
  baselineSha: string;
  couplingScore: number;
  boundaryIntegrityScore: number;
  testsPassed: number;
  testsFailed: number;
  durationMs: number;
}

/**
 * Rebuild the demo from scratch: fresh database, fresh sample repository,
 * and the seeded E-0 history from packages/sample-app/history/baseline.json.
 * Deterministic: timestamps come from the history file and every score from
 * one scan of the baseline code.
 */
export async function resetDemo(): Promise<SeedSummary> {
  const started = Date.now();
  deleteDbFile();
  fs.rmSync(path.join(epochWorkDir(), 'context'), { recursive: true, force: true });
  fs.rmSync(path.join(epochWorkDir(), 'plans'), { recursive: true, force: true });
  fs.rmSync(path.join(epochWorkDir(), 'verifications'), { recursive: true, force: true });
  fs.rmSync(path.join(epochWorkDir(), 'futures'), { recursive: true, force: true });
  initializeSchema(getDb());

  const baselineSha = initSampleRepo('M-1041 baseline: payments service at the end of epoch E-0');
  clearRepoSpecCache();
  const spec = getRepoSpec();
  const history = BaselineSchema.parse(JSON.parse(fs.readFileSync(path.join(SAMPLE_APP_SOURCE, 'history', 'baseline.json'), 'utf8')));

  const first = history.mutations[0]!;
  const firstAt = Date.parse(first.at);
  invariantManager.syncFromSpec(spec, firstAt);
  epochDetector.ensureBaseline(history.epoch.id, history.epoch.name, history.epoch.properties, first.id, firstAt);

  const repo = sampleRepoPath();
  const [tests, probes] = await Promise.all([runTests(repo), runProbes(repo)]);
  const scan = scanRepository(repo, spec, { tests, probes });
  const last = history.mutations.at(-1)!;

  for (const m of history.mutations) {
    const at = Date.parse(m.at);
    const eventId = generateEventId();
    events.insertEvent({ event_id: eventId, type: 'pr.merged', source: 'seed history', timestamp: at, repo: 'sample-app', branch: 'main', payload: { requirement: m.intent, author: m.author } });
    const workflowId = generateWorkflowId();
    workflows.insertWorkflow({ workflow_id: workflowId, trigger_event_id: eventId, kind: 'seed', title: m.intent, status: 'COMPLETED', created_at: at, completed_at: at });
    mutationEngine.recordMutation({
      workflowId,
      mutationId: m.id,
      intent: m.intent,
      author: m.author,
      createdAt: at,
      changedFiles: [],
      declaredComponents: m.components,
      scan,
      commitSha: m.id === last.id ? baselineSha : undefined,
      deltaSummary: m.id === last.id ? 'Baseline commit of the sample repository' : 'Seeded history (no commit in the sample repository)',
      allowEpochProposal: false
    });
  }

  return {
    mutations: history.mutations.length,
    baselineSha,
    couplingScore: scan.couplingScore,
    boundaryIntegrityScore: scan.boundaryIntegrityScore,
    testsPassed: tests.passed,
    testsFailed: tests.failed,
    durationMs: Date.now() - started
  };
}

/** Close the store so a script can exit cleanly. */
export function finishSeed(): void {
  closeDb();
}
