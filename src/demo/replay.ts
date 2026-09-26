import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { driftFindings, incidents, mutations } from '../store/index.js';
import type { Simulation } from '../shared/schema/simulation.schema.js';
import { applyPatch, hasUncommittedChanges, SAMPLE_APP_SOURCE, sampleRepoPath } from '../sandbox/sample-repo.js';
import { approvalGate, runToApproval, workflowEngine } from '../core/weave/index.js';
import { futuresSimulator } from '../core/futures/simulator.js';

const Step = z.object({ id: z.string().regex(/^M-\d+$/), title: z.string(), intent: z.string(), author: z.string(), patch: z.string() });
const Manifest = z.object({
  description: z.string(),
  feature: Step,
  steps: z.array(Step),
  futures: z.array(z.object({ id: z.string(), label: z.string(), description: z.string(), patch: z.string() }))
});
type Step = z.infer<typeof Step>;

const AUTO_MERGE = 'policy: auto-merge (tests green)';

export interface ReplayedStep {
  mutationId: string;
  workflowId: string;
  skipped: boolean;
  riskLevel?: string;
  openFindings: string[];
  openIncidents: string[];
}

function manifest(): z.infer<typeof Manifest> {
  return Manifest.parse(JSON.parse(fs.readFileSync(path.join(SAMPLE_APP_SOURCE, 'history', 'replay.json'), 'utf8')));
}

function patchText(relative: string): string {
  return fs.readFileSync(path.join(SAMPLE_APP_SOURCE, 'history', relative), 'utf8');
}

/**
 * Apply one recorded change the way it originally landed: through a workflow,
 * the specialists, the verification preview and an approval.
 */
async function landChange(step: Step, kind: 'feature' | 'replay', approver: string): Promise<ReplayedStep> {
  if (mutations.getMutation(step.id)) {
    return { mutationId: step.id, workflowId: '', skipped: true, openFindings: [], openIncidents: [] };
  }
  const repo = sampleRepoPath();
  if (hasUncommittedChanges(repo)) throw new Error('The sample repository has uncommitted changes; approve or reject the open workflow before replaying');

  const { workflow } = workflowEngine.start({ kind, title: step.title, requirement: step.intent, author: step.author, mutationId: step.id, source: 'demo-replay' });
  applyPatch(patchText(step.patch), repo);
  const pkg = await runToApproval(workflow.workflow_id, 'demo-replay');
  const { mutation } = await approvalGate.recordDecision(workflow.workflow_id, approver, 'APPROVED', 'Replayed history: the change passed its own tests and was merged.');
  return {
    mutationId: mutation?.mutation_id ?? step.id,
    workflowId: workflow.workflow_id,
    skipped: false,
    riskLevel: pkg.riskLevel,
    openFindings: driftFindings.listDriftFindings({ status: 'open' }).map(f => `${f.finding_id} ${f.severity}`),
    openIncidents: incidents.listIncidents().filter(i => i.status !== 'resolved').map(i => i.incident_id)
  };
}

/**
 * Replay the safe-looking AI changes after the chargeback
 * feature. `withFeature` lands the scripted M-1042 first when Bob has not made it live.
 */
export async function replayDrift(options: { withFeature?: boolean } = {}): Promise<ReplayedStep[]> {
  const m = manifest();
  const results: ReplayedStep[] = [];
  if (!mutations.getMutation(m.feature.id)) {
    if (!options.withFeature) {
      throw new Error(`${m.feature.id} (the chargeback feature) is not recorded yet. Let Bob implement it with /epoch-feature, or replay with --with-feature to use the scripted fallback.`);
    }
    results.push(await landChange(m.feature, 'feature', 'policy: scripted fallback (demo)'));
  }
  for (const step of m.steps) results.push(await landChange(step, 'replay', AUTO_MERGE));
  return results;
}

/** Fork and measure the two prepared futures from the latest mutation (fallback when Bob does not write them live). */
export async function prepareFutures(): Promise<Simulation> {
  const m = manifest();
  const base = mutations.getLatestMutation();
  if (!base) throw new Error('No mutations recorded; reset the demo first');
  const simulation = futuresSimulator.fork(
    base.mutation_id,
    'Can the 30-day chargeback window stay while the order and ledger boundaries are restored?',
    m.futures.map(f => ({ id: f.id, label: f.label, description: f.description, patch: patchText(f.patch) }))
  );
  return futuresSimulator.evaluateAll(simulation.simulation_id);
}
