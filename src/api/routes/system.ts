import { Hono } from 'hono';
import { z } from 'zod';
import { getDbPath, mutations, workflows } from '../../store/index.js';
import { eventBus } from '../../core/events/bus.js';
import { computeMetrics } from '../../core/metrics.js';
import { trajectoryEngine } from '../../core/epoch/trajectory.js';
import { getRepoSpec } from '../../core/epoch/spec-registry.js';
import { loadHistory } from '../../core/epoch/history.js';
import { diffScans } from '../../graph/scanner/diff.js';
import { componentOf, scanRepository } from '../../graph/scanner/scanner.js';
import { changedFiles, currentBranch, diffStat, discardChanges, headSha, sampleRepoExists, sampleRepoPath, workingTreeDiff } from '../../sandbox/sample-repo.js';
import { resetDemo } from '../../demo/seed.js';
import { prepareFutures, replayDrift } from '../../demo/replay.js';
import { ActorSchema, HttpError, parseBody } from '../http.js';
import { publicDemo, ShowcaseBusyError } from '../public-demo.js';

export const systemRoutes = new Hono();

systemRoutes.get('/health', c => {
  const repo = sampleRepoPath();
  const ready = sampleRepoExists(repo);
  return c.json({
    status: 'ok',
    timestamp: Date.now(),
    database: getDbPath(),
    sampleRepo: ready ? { path: repo, head: headSha(repo), branch: currentBranch(repo) } : null,
    mutations: mutations.countMutations(),
    seeded: mutations.countMutations() > 0,
    demo: publicDemo.status()
  });
});

systemRoutes.get('/repo/status', c => {
  const repo = sampleRepoPath();
  if (!sampleRepoExists(repo)) throw new HttpError(409, 'Sample repository not initialised; run pnpm demo-reset');
  const diff = workingTreeDiff(repo);
  return c.json({ path: repo, head: headSha(repo), branch: currentBranch(repo), changedFiles: changedFiles(repo), diffStat: diffStat(diff) });
});

systemRoutes.get('/repo/diff', c => c.text(workingTreeDiff(sampleRepoPath())));

systemRoutes.post('/repo/discard', async c => {
  const body = await parseBody(c, z.object({ actor: ActorSchema }));
  const open = workflows.getActiveWorkflows().filter(w => w.status === 'EXECUTING' || w.status === 'VERIFYING' || w.status === 'AWAITING_APPROVAL');
  if (open.length > 0) throw new HttpError(409, `Workflow ${open[0]!.workflow_id} is ${open[0]!.status}; reject it instead of discarding its changes`);
  discardChanges(sampleRepoPath());
  return c.json({ discarded: true, actor: body.actor });
});

systemRoutes.post('/demo/reset', async c => {
  const summary = await resetDemo();
  eventBus.emit('demo.reset', { ...summary });
  return c.json({ summary });
});

systemRoutes.post('/demo/replay', async c => {
  const body = await parseBody(c, z.object({ with_feature: z.boolean().default(false) }));
  return c.json({ steps: await replayDrift({ withFeature: body.with_feature }) });
});

systemRoutes.post('/demo/futures', async c => {
  const simulation = await prepareFutures();
  return c.json({ simulation }, 201);
});

/** Reset and replay up to the moment a reviewer chooses a future: drift, INC-3312 and futures A and B measured. */
systemRoutes.post('/demo/showcase', async c => {
  try {
    const showcase = await publicDemo.buildShowcase();
    if (showcase === 'failed') throw new HttpError(500, 'Preparing the showcase failed; see the server log');
    return c.json({ showcase, mutations: mutations.countMutations() });
  } catch (error) {
    if (error instanceof ShowcaseBusyError) throw new HttpError(409, error.message);
    throw error;
  }
});

/**
 * Bob hook: a file in the sample repo changed. A fast structural scan (no tests)
 * previews what approving the working tree would do to the invariants.
 */
systemRoutes.post('/hooks/file-changed', async c => {
  const body = await parseBody(c, z.object({ file: z.string().max(500).optional(), tool: z.string().max(100).optional() }));
  const repo = sampleRepoPath();
  if (!sampleRepoExists(repo)) return c.json({ ignored: true, reason: 'sample repository not initialised' });
  const head = loadHistory().at(-1)?.scan;
  const preview = scanRepository(repo, getRepoSpec(), { previous: head });
  const diff = diffScans(head ?? preview, preview);
  const payload = {
    file: body.file ?? null,
    component: body.file ? componentOf(body.file.replace(/\\/g, '/').replace(/^.*?(src\/)/, 'src/')) : null,
    tool: body.tool ?? null,
    changedFiles: changedFiles(repo),
    boundaryIntegrityIfApproved: preview.boundaryIntegrityScore,
    couplingIfApproved: preview.couplingScore,
    withinEnvelope: trajectoryEngine.isWithinEnvelope(preview.couplingScore, preview.boundaryIntegrityScore),
    invariantTransitions: diff.invariantTransitions,
    addedViolations: diff.addedViolations
  };
  eventBus.emit('repo.file_changed', payload);
  return c.json(payload);
});

/** Bob hook: a session starts. Returns a short trajectory summary for Bob's context. */
systemRoutes.get('/hooks/session-context', c => {
  const s = trajectoryEngine.snapshot();
  const notHolding = s.invariants.filter(i => i.status !== 'HOLDING');
  return c.json({
    summary: `EPOCH: ${s.totalMutations} mutations, latest ${s.latestPoint?.mutation_id ?? 'none'}. Boundary integrity ${s.boundaryIntegrityScore.toFixed(2)}, coupling ${s.couplingScore.toFixed(2)} (${s.withinEnvelope ? 'inside' : 'outside'} the envelope). ` +
      `${s.openDriftFindings} open drift finding(s).` + (notHolding.length > 0 ? ` Not holding: ${notHolding.map(i => `${i.invariant_id} ${i.status}`).join(', ')}.` : ' All invariants hold.'),
    snapshot: s
  });
});

/** Bob hook: a task finished. Recorded on the event stream so the console can show Bob's activity. */
systemRoutes.post('/hooks/bob-activity', async c => {
  const body = await parseBody(c, z.object({ event: z.string().max(60), detail: z.string().max(2000).optional() }));
  eventBus.emit('bob.activity', { event: body.event, detail: body.detail ?? null });
  return c.json({ recorded: true });
});

systemRoutes.get('/metrics', c => c.json({ metrics: computeMetrics() }));

export function registerSystemRoutes(app: Hono): void {
  app.route('/api', systemRoutes);
}
