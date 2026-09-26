import { Hono } from 'hono';
import { nanoid } from 'nanoid';
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
import type { Agent, AgentContext, AgentResult } from '../../agents/contracts.js';

export const agentRoutes = new Hono();

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

agentRoutes.get('/', (c) => {
  return c.json({
    agents: Object.keys(agentRegistry).map(name => ({
      name,
      description: `EPOCH specialist agent: ${name}`
    }))
  });
});

agentRoutes.post('/run/:name', async (c) => {
  const name = c.req.param('name');
  const agent = agentRegistry[name];

  if (!agent) {
    return c.json({ error: `Unknown agent: ${name}` }, 400);
  }

  const body = await c.req.json<{
    workflow_id?: string;
    trigger_event_id?: string;
    diff?: string;
    dependencyManifest?: string;
    acceptanceCriteria?: string[];
    affectedComponents?: string[];
  }>();

  const workflowId = body.workflow_id ?? nanoid();
  const triggerEventId = body.trigger_event_id ?? nanoid();

  const contextBundle = await contextBuilder.build(workflowId, triggerEventId);

  const ctx: AgentContext = {
    workflowId,
    taskId: nanoid(),
    contextBundle,
    diff: body.diff,
    dependencyManifest: body.dependencyManifest,
    acceptanceCriteria: body.acceptanceCriteria,
    affectedComponents: body.affectedComponents
  };

  const result = await agent.run(ctx);
  return c.json({ agent: name, result });
});

agentRoutes.post('/run-batch', async (c) => {
  const body = await c.req.json<{
    agents: string[];
    workflow_id?: string;
    trigger_event_id?: string;
    diff?: string;
    dependencyManifest?: string;
    acceptanceCriteria?: string[];
    affectedComponents?: string[];
  }>();

  const selectedAgents = body.agents
    .map(name => agentRegistry[name])
    .filter((agent): agent is Agent => agent !== undefined);

  if (selectedAgents.length === 0) {
    return c.json({ error: 'No valid agents selected' }, 400);
  }

  const workflowId = body.workflow_id ?? nanoid();
  const triggerEventId = body.trigger_event_id ?? nanoid();

  const contextBundle = await contextBuilder.build(workflowId, triggerEventId);

  const ctx: AgentContext = {
    workflowId,
    taskId: nanoid(),
    contextBundle,
    diff: body.diff,
    dependencyManifest: body.dependencyManifest,
    acceptanceCriteria: body.acceptanceCriteria,
    affectedComponents: body.affectedComponents
  };

  const results: AgentResult[] = await agentCoordinator.runParallel(selectedAgents, ctx);

  return c.json({
    agents_run: selectedAgents.map(a => a.name),
    results
  });
});

export function registerAgentRoutes(app: Hono): void {
  app.route('/api/agents', agentRoutes);
}
