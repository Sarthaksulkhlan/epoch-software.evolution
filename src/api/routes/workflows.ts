import { Hono } from 'hono';
import { z } from 'zod';
import { evidence, tasks, workflows } from '../../store/index.js';
import { AgentType } from '../../shared/schema/task.schema.js';
import { EvidenceStatus, FindingSeverity } from '../../shared/schema/evidence.schema.js';
import { WorkflowKind, WorkflowStatus } from '../../shared/schema/workflow.schema.js';
import { generateEvidenceId, generateTaskId } from '../../shared/utils/id.js';
import { eventBus } from '../../core/events/bus.js';
import {
  agentRunner,
  approvalGate,
  contextBuilder,
  loadContext,
  loadVerification,
  recordPlan,
  replayWorkflow,
  runAnalysis,
  runToApproval,
  workflowEngine
} from '../../core/weave/index.js';
import { mutationEngine } from '../../core/epoch/mutation-engine.js';
import { sampleRepoPath, workingTreeDiff } from '../../sandbox/sample-repo.js';
import { ActorSchema, HttpError, notFound, parseBody, queryInt } from '../http.js';

export const workflowRoutes = new Hono();

const StartSchema = z.object({
  requirement: z.string().trim().min(3),
  title: z.string().trim().min(1).optional(),
  kind: WorkflowKind.exclude(['seed']).default('feature'),
  author: z.string().trim().min(1).default('console user'),
  source: z.string().trim().min(1).default('epoch-api'),
  mutation_id: z.string().regex(/^M-\d+$/).optional(),
  /** Run the specialists and verification up to the approval gate in the background. */
  auto: z.boolean().default(false)
});

workflowRoutes.get('/', c => {
  const list = workflows.listWorkflows({ status: c.req.query('status'), limit: queryInt(c, 'limit', 50), offset: queryInt(c, 'offset', 0) })
    .filter(w => c.req.query('include_seed') === 'true' || w.kind !== 'seed');
  return c.json({ workflows: list });
});

workflowRoutes.get('/active', c => c.json({ workflows: workflows.getActiveWorkflows() }));

workflowRoutes.post('/', async c => {
  const body = await parseBody(c, StartSchema);
  const { workflow, event } = workflowEngine.start({
    requirement: body.requirement,
    title: body.title,
    kind: body.kind,
    author: body.author,
    source: body.source,
    mutationId: body.mutation_id
  });
  const context = loadContext(workflow.workflow_id, body.author);
  if (body.auto) {
    runToApproval(workflow.workflow_id, body.author).catch(error => {
      console.error(`Workflow ${workflow.workflow_id} stopped before approval:`, error);
    });
  }
  return c.json({ workflow: workflowEngine.require(workflow.workflow_id), event, context }, 201);
});

workflowRoutes.get('/:id', c => {
  const replay = replayWorkflow(c.req.param('id'));
  if (!replay) throw notFound(`Workflow ${c.req.param('id')}`);
  return c.json({ ...replay, validTransitions: workflowEngine.getValidTransitions(replay.workflow.status) });
});

workflowRoutes.get('/:id/context', c => {
  workflowEngine.require(c.req.param('id'));
  return c.json({ context: contextBuilder.load(c.req.param('id')) });
});

workflowRoutes.post('/:id/plan', async c => {
  const body = await parseBody(c, z.object({ actor: ActorSchema.default('bob'), plan: z.string().max(20_000).optional() }));
  const plan = recordPlan(c.req.param('id'), body.actor, body.plan);
  return c.json({ workflow: workflowEngine.require(c.req.param('id')), plan: { ref: plan.planRef, layers: plan.layers.map(l => l.map(t => ({ task_id: t.task_id, agent: t.agent_type }))) } });
});

workflowRoutes.post('/:id/run', async c => {
  const outcomes = await runAnalysis(c.req.param('id'));
  return c.json({ tasks: outcomes.map(o => ({ task_id: o.task.task_id, agent: o.task.agent_type, status: o.task.status, summary: o.result?.summary ?? o.error ?? null, riskLevel: o.result?.riskLevel ?? null, evidence: o.evidence })) });
});

workflowRoutes.post('/:id/run-to-approval', async c => {
  const body = await parseBody(c, z.object({ actor: ActorSchema.default('epoch') }));
  return c.json({ package: await runToApproval(c.req.param('id'), body.actor) });
});

workflowRoutes.post('/:id/specialists/:agent', async c => {
  const id = c.req.param('id');
  const agent = AgentType.parse(c.req.param('agent'));
  const workflow = workflowEngine.require(id);
  const phase = workflow.status === 'VERIFYING' || workflow.status === 'AWAITING_APPROVAL' ? 'verification' : 'analysis';
  if (workflow.status !== 'EXECUTING' && phase === 'analysis') {
    throw new HttpError(409, `Specialists run while EXECUTING; workflow ${id} is ${workflow.status}`);
  }
  const outcome = await agentRunner.runSingle(id, agent, phase, phase === 'verification' ? loadVerification(id) : undefined);
  return c.json({ task_id: outcome.task.task_id, agent, status: outcome.task.status, summary: outcome.result?.summary ?? outcome.error ?? null, riskLevel: outcome.result?.riskLevel ?? null, evidence: outcome.evidence });
});

const EvidenceBody = z.object({
  claim: z.string().trim().min(3).max(4000),
  status: EvidenceStatus,
  source_ref: z.string().trim().min(1).max(500),
  severity: FindingSeverity.optional(),
  agent: z.string().trim().min(1).max(60).default('bob')
});

/** Bob and its subagents record their own claims here. They are stored under a "bob" task. */
workflowRoutes.post('/:id/evidence', async c => {
  const id = c.req.param('id');
  const body = await parseBody(c, EvidenceBody);
  const workflow = workflowEngine.require(id);
  if (workflowEngine.isTerminal(workflow.status)) throw new HttpError(409, `Workflow ${id} is ${workflow.status}`);

  const at = Date.now();
  let task = tasks.listTasksByWorkflow(id).find(t => t.agent_type === 'bob' && t.input_ref === body.agent);
  if (!task) {
    task = { task_id: generateTaskId(), workflow_id: id, agent_type: 'bob', status: 'RUNNING', dependencies: [], started_at: at, input_ref: body.agent, retry_count: 0 };
    tasks.insertTask(task);
    eventBus.emit('task.started', { taskId: task.task_id, workflowId: id, agent: 'bob', role: body.agent, phase: 'bob' });
  }
  const record = {
    evidence_id: generateEvidenceId(),
    workflow_id: id,
    task_id: task.task_id,
    claim: body.claim,
    status: body.status,
    source_artifact_ref: body.source_ref,
    created_at: at
  };
  const saved = body.severity ? { ...record, finding_severity: body.severity } : record;
  evidence.insertEvidence(saved);
  eventBus.emit('evidence.created', { evidenceId: saved.evidence_id, workflowId: id, taskId: task.task_id, agent: `bob:${body.agent}`, status: saved.status, severity: body.severity ?? null, claim: saved.claim });
  return c.json({ evidence: saved }, 201);
});

workflowRoutes.post('/:id/transition', async c => {
  const body = await parseBody(c, z.object({ status: WorkflowStatus, actor: ActorSchema, stage: z.string().max(200).optional() }));
  if (body.status === 'COMPLETED') throw new HttpError(409, 'Use /approve to complete a workflow; approval records the decision and the mutation');
  return c.json({ workflow: workflowEngine.transition(c.req.param('id'), body.status, { actor: body.actor, stage: body.stage }) });
});

workflowRoutes.post('/:id/request-approval', async c => {
  const body = await parseBody(c, z.object({ actor: ActorSchema.default('bob') }));
  return c.json({ package: await approvalGate.requestApproval(c.req.param('id'), body.actor) });
});

workflowRoutes.get('/:id/decision-package', c => c.json({ package: approvalGate.buildPackage(c.req.param('id')) }));

const DecisionBody = z.object({ actor: ActorSchema, rationale: z.string().max(2000).optional(), scope: z.string().max(500).optional() });

workflowRoutes.post('/:id/approve', async c => {
  const body = await parseBody(c, DecisionBody);
  return c.json(await approvalGate.recordDecision(c.req.param('id'), body.actor, 'APPROVED', body.rationale, body.scope));
});

workflowRoutes.post('/:id/reject', async c => {
  const body = await parseBody(c, DecisionBody);
  return c.json(await approvalGate.recordDecision(c.req.param('id'), body.actor, 'REJECTED', body.rationale, body.scope));
});

workflowRoutes.post('/:id/request-changes', async c => {
  const body = await parseBody(c, z.object({ actor: ActorSchema, rationale: z.string().trim().min(3).max(2000) }));
  approvalGate.requestChanges(c.req.param('id'), body.actor, body.rationale);
  return c.json({ workflow: workflowEngine.require(c.req.param('id')) });
});

workflowRoutes.get('/:id/diff', c => {
  const workflow = workflowEngine.require(c.req.param('id'));
  if (workflow.mutation_id) return c.text(mutationEngine.mutationDiff(workflow.mutation_id) ?? '');
  return c.text(workflowEngine.isTerminal(workflow.status) ? '' : workingTreeDiff(sampleRepoPath()));
});

export function registerWorkflowRoutes(app: Hono): void {
  app.route('/api/workflows', workflowRoutes);
}
