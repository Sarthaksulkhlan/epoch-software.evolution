import { Hono } from 'hono';
import { z } from 'zod';
import { driftFindings, incidents, invariants, mutations, simulations, tasks, workflows } from '../../store/index.js';
import { eventBus } from '../../core/events/bus.js';
import { approvalGate, loadContext, runToApproval, workflowEngine } from '../../core/weave/index.js';
import { futuresSimulator } from '../../core/futures/simulator.js';
import { HttpError, notFound, parseBody, queryInt } from '../http.js';
import { streamEvents, type SseMessage } from '../routes/sse.js';
import {
  activeWorkflow,
  activityEvent,
  consoleDriftFinding,
  consoleGraph,
  consoleIncident,
  consoleInvariant,
  consoleMutation,
  consoleScenario,
  consoleWorkflow,
  epochIndex,
  specialistTask,
  trajectorySnapshots,
  trendData
} from './views.js';
import { buildEvolutionReport } from './report.js';

/**
 * /api/v1: the console adapter. Every response uses the view models the
 * console already renders (src/console/types on epoch-frontend), so switching
 * from mock data to live data changes no component.
 */
export const consoleRoutes = new Hono();

consoleRoutes.get('/workflows/active', c => {
  const workflow = activeWorkflow();
  if (!workflow) throw new HttpError(404, 'No workflow has run yet; start one from Bob or the console');
  return c.json(consoleWorkflow(workflow));
});

consoleRoutes.get('/workflows', c => c.json(
  workflows.listWorkflows({ limit: queryInt(c, 'limit', 20) }).filter(w => w.kind !== 'seed').map(consoleWorkflow)
));

consoleRoutes.get('/workflows/:id', c => {
  const workflow = workflows.getWorkflow(c.req.param('id'));
  if (!workflow) throw notFound(`Workflow ${c.req.param('id')}`);
  return c.json(consoleWorkflow(workflow));
});

consoleRoutes.post('/workflows', async c => {
  const body = await parseBody(c, z.object({ requirement: z.string().trim().min(3), author: z.string().trim().min(1).default('console user'), auto: z.boolean().default(true) }));
  const { workflow } = workflowEngine.start({ requirement: body.requirement, author: body.author, source: 'console' });
  loadContext(workflow.workflow_id, body.author);
  if (body.auto) runToApproval(workflow.workflow_id, body.author).catch(error => console.error(`Workflow ${workflow.workflow_id} stopped:`, error));
  return c.json(consoleWorkflow(workflowEngine.require(workflow.workflow_id)), 201);
});

consoleRoutes.post('/workflows/:id/decision', async c => {
  const body = await parseBody(c, z.object({
    decision: z.enum(['APPROVED', 'REJECTED']),
    rationale: z.string().max(2000).optional(),
    actor: z.string().trim().min(1).default('console reviewer')
  }));
  const result = await approvalGate.recordDecision(c.req.param('id'), body.actor, body.decision, body.rationale);
  return c.json({ workflow: consoleWorkflow(workflowEngine.require(c.req.param('id'))), mutation: result.mutation ? consoleMutation(result.mutation) : null });
});

consoleRoutes.get('/trajectory/snapshots', c => c.json(trajectorySnapshots()));

consoleRoutes.get('/trajectory/drift-findings', c => {
  const activeOnly = c.req.query('activeOnly') === 'true';
  return c.json(driftFindings.listDriftFindings(activeOnly ? { status: 'open' } : {}).map(consoleDriftFinding));
});

consoleRoutes.get('/trajectory/graph', c => c.json(consoleGraph(queryInt(c, 'recent', 6))));

consoleRoutes.get('/trajectory/trend', c => c.json(trendData(queryInt(c, 'limit', 12))));

consoleRoutes.get('/mutations', c => {
  const start = queryInt(c, 'epochStart');
  const end = queryInt(c, 'epochEnd');
  const component = c.req.query('component');
  const list = mutations.listMutations({ component: component && component !== 'ALL' ? component : undefined })
    .filter(m => (start === undefined || epochIndex(m.epoch_id) >= start) && (end === undefined || epochIndex(m.epoch_id) <= end));
  return c.json(list.map(consoleMutation));
});

consoleRoutes.get('/mutations/:id', c => {
  const mutation = mutations.getMutation(c.req.param('id'));
  if (!mutation) throw notFound(`Mutation ${c.req.param('id')}`);
  return c.json(consoleMutation(mutation));
});

consoleRoutes.get('/incidents', c => c.json(incidents.listIncidents().map(consoleIncident)));

consoleRoutes.get('/invariants', c => c.json(invariants.listInvariants().map(consoleInvariant)));

consoleRoutes.get('/simulations', c => {
  const divergence = c.req.query('divergenceMutationId');
  const list = simulations.listSimulations().filter(s => !divergence || s.base_mutation_id === divergence);
  return c.json(list.flatMap(s => s.scenarios.map(scenario => consoleScenario(s, scenario))));
});

consoleRoutes.post('/simulations/remediate', async c => {
  const body = await parseBody(c, z.object({
    scenarioId: z.string().regex(/^[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$/, 'Use "<simulationId>:<scenarioId>" from GET /api/v1/simulations'),
    author: z.string().trim().min(1).default('console reviewer'),
    dryRun: z.boolean().default(false)
  }));
  const [simulationId, scenarioId] = body.scenarioId.split(':') as [string, string];
  const simulation = simulations.getSimulation(simulationId);
  const scenario = simulation?.scenarios.find(s => s.scenario_id === scenarioId);
  if (!simulation || !scenario) throw notFound(`Scenario ${body.scenarioId}`);
  if (body.dryRun) return c.json({ dryRun: true, scenario: consoleScenario(simulation, scenario), diff: scenario.diff ?? null });
  if (scenario.status !== 'COMPLETED') throw new HttpError(409, `Scenario ${body.scenarioId} has not been measured yet`);
  const { workflowId } = futuresSimulator.select(simulationId, scenarioId, body.author);
  loadContext(workflowId, body.author);
  return c.json({ workflowId, workflow: consoleWorkflow(workflowEngine.require(workflowId)) }, 201);
});

consoleRoutes.get('/activity', c => {
  const limit = queryInt(c, 'limit', 30) ?? 30;
  return c.json(eventBus.recent().map(activityEvent).filter((e): e is NonNullable<typeof e> => e !== undefined).slice(-limit).reverse());
});

consoleRoutes.route('/stream', streamEvents(event => {
  const out: SseMessage[] = [];
  const activity = activityEvent(event);
  if (activity) out.push({ event: 'epoch.activity', data: activity });
  const p = event.payload;
  if (event.type === 'mutation.committed' && typeof p.mutationId === 'string') {
    const m = mutations.getMutation(p.mutationId);
    if (m) out.push({ event: 'epoch.mutation', data: consoleMutation(m) });
  }
  if ((event.type === 'drift.detected' || event.type === 'drift.resolved') && typeof p.findingId === 'string') {
    const f = driftFindings.getDriftFinding(p.findingId);
    if (f) out.push({ event: 'epoch.drift', data: consoleDriftFinding(f) });
  }
  if (event.type === 'invariant.changed' && typeof p.invariantId === 'string') {
    const inv = invariants.getInvariant(p.invariantId);
    if (inv) out.push({ event: 'epoch.invariant', data: consoleInvariant(inv) });
  }
  if ((event.type === 'task.started' || event.type === 'task.completed' || event.type === 'task.failed') && typeof p.taskId === 'string') {
    const task = tasks.getTask(p.taskId);
    if (task) out.push({ event: 'epoch.task', data: specialistTask(task, 0) });
  }
  if (event.type === 'workflow.updated' || event.type === 'approval.requested' || event.type === 'decision.recorded') {
    out.push({ event: 'epoch.workflow', data: { workflowId: p.workflowId, type: event.type } });
  }
  return out;
}));

consoleRoutes.get('/report', c =>
  c.text(buildEvolutionReport(), 200, { 'Content-Type': 'text/markdown; charset=utf-8' })
);

export function registerConsoleRoutes(app: Hono): void {
  app.route('/api/v1', consoleRoutes);
}
