import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { workflows, evidence, tasks, mutations } from '../../store/index.js';
import { workflowEngine } from '../../core/weave/workflow-engine.js';
import { approvalGate } from '../../core/weave/approval-gate.js';
import { contextBuilder } from '../../core/weave/context-builder.js';
import { agentCoordinator } from '../../agents/coordinator.js';
import {
  historianAgent,
  contextAgent,
  securityAgent,
  qaAgent,
  evolutionAnalystAgent,
  performanceAgent,
  maintainabilityAgent,
  dependencyAgent
} from '../../agents/index.js';
import type { WorkflowStatus } from '../../shared/schema/workflow.schema.js';
import type { Agent, AgentContext, AgentResult } from '../../agents/contracts.js';

export const workflowRoutes = new Hono();

const agentRegistry: Record<string, Agent> = {
  historian: historianAgent,
  context: contextAgent,
  security: securityAgent,
  qa: qaAgent,
  evolution: evolutionAnalystAgent,
  performance: performanceAgent,
  maintainability: maintainabilityAgent,
  dependency: dependencyAgent
};

workflowRoutes.get('/', (c) => {
  const status = c.req.query('status') ?? undefined;
  const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : undefined;
  const offset = c.req.query('offset') ? parseInt(c.req.query('offset')!, 10) : undefined;

  const result = workflows.listWorkflows({ status, limit, offset });
  return c.json({ workflows: result });
});

workflowRoutes.post('/', async (c) => {
  const body = await c.req.json<{ trigger_event_id?: string }>();
  const triggerEventId = body.trigger_event_id ?? nanoid();

  const workflow = workflowEngine.createWorkflow(triggerEventId);
  return c.json({ workflow }, 201);
});

workflowRoutes.get('/:id', (c) => {
  const id = c.req.param('id');
  const workflow = workflows.getWorkflow(id);

  if (!workflow) {
    return c.json({ error: 'Workflow not found' }, 404);
  }

  const taskList = tasks.listTasksByWorkflow(id);
  const evidenceList = evidence.listEvidenceByWorkflow(id);
  const mutation = workflow.mutation_id ? mutations.getMutation(workflow.mutation_id) : null;

  return c.json({ workflow, tasks: taskList, evidence: evidenceList, mutation });
});

workflowRoutes.post('/:id/transition', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ status: WorkflowStatus; current_stage?: string }>();

  try {
    const workflow = workflowEngine.transition(id, body.status, body.current_stage);
    return c.json({ workflow });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Transition failed';
    return c.json({ error: message }, 409);
  }
});

workflowRoutes.post('/:id/approve', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ actor: string; rationale?: string; scope?: string }>();

  if (!approvalGate.isAwaitingApproval(id)) {
    return c.json({ error: 'Workflow is not awaiting approval' }, 409);
  }

  const decision = approvalGate.recordDecision(id, body.actor, 'APPROVED', body.rationale, body.scope);
  return c.json({ status: 'approved', workflow_id: id, decision });
});

workflowRoutes.post('/:id/reject', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ actor: string; rationale?: string; scope?: string }>();

  if (!approvalGate.isAwaitingApproval(id)) {
    return c.json({ error: 'Workflow is not awaiting approval' }, 409);
  }

  const decision = approvalGate.recordDecision(id, body.actor, 'REJECTED', body.rationale, body.scope);
  return c.json({ status: 'rejected', workflow_id: id, decision });
});

workflowRoutes.post('/:id/request-approval', (c) => {
  const id = c.req.param('id');
  const summary = approvalGate.requestApproval(id);
  return c.json(summary);
});

workflowRoutes.get('/:id/plan', (c) => {
  const id = c.req.param('id');
  const workflow = workflows.getWorkflow(id);

  if (!workflow) {
    return c.json({ error: 'Workflow not found' }, 404);
  }

  return c.json({
    workflow_id: id,
    plan_ref: workflow.plan_ref,
    status: workflow.status,
    valid_transitions: workflowEngine.getValidTransitions(workflow.status)
  });
});

workflowRoutes.post('/:id/run-agents', async (c) => {
  const id = c.req.param('id');
  const workflow = workflows.getWorkflow(id);

  if (!workflow) {
    return c.json({ error: 'Workflow not found' }, 404);
  }

  const body = await c.req.json<{ agentNames?: string[]; diff?: string; dependencyManifest?: string; acceptanceCriteria?: string[]; affectedComponents?: string[] }>();
  const agentNames = body.agentNames ?? Object.keys(agentRegistry);

  const contextBundle = await contextBuilder.build(id, workflow.trigger_event_id ?? '');

  const ctx: AgentContext = {
    workflowId: id,
    taskId: nanoid(),
    contextBundle,
    diff: body.diff,
    dependencyManifest: body.dependencyManifest,
    acceptanceCriteria: body.acceptanceCriteria,
    affectedComponents: body.affectedComponents
  };

  const selectedAgents = agentNames
    .map(name => agentRegistry[name])
    .filter((agent): agent is Agent => agent !== undefined);

  if (selectedAgents.length === 0) {
    return c.json({ error: 'No valid agents selected' }, 400);
  }

  const results: AgentResult[] = await agentCoordinator.runParallel(selectedAgents, ctx);

  return c.json({ workflow_id: id, agents_run: selectedAgents.map(a => a.name), results });
});

export function registerWorkflowRoutes(app: Hono): void {
  app.route('/api/workflows', workflowRoutes);
}
