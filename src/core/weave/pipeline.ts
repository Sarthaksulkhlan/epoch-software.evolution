import type { ContextBundle } from '../../shared/schema/context-bundle.schema.js';
import { agentRunner, type TaskOutcome } from './agent-runner.js';
import { approvalGate, type DecisionPackage } from './approval-gate.js';
import { contextBuilder } from './context-builder.js';
import { createPlan, type TaskPlan } from './task-graph.js';
import { workflowEngine } from './workflow-engine.js';

/**
 * The micro loop (ADR-021): event → context → plan → agent work →
 * evidence → decision. When Bob drives a workflow these steps are called one
 * by one through EPOCH-MCP; `runToApproval` runs them all for replays and for
 * workflows started from the console without Bob.
 */

/** PENDING → CONTEXT_LOADING → PLANNING, with the context bundle assembled. */
export function loadContext(workflowId: string, actor: string): ContextBundle {
  const workflow = workflowEngine.require(workflowId);
  if (workflow.status === 'PENDING') workflowEngine.transition(workflowId, 'CONTEXT_LOADING', { actor, stage: 'Assembling the context bundle' });
  const bundle = contextBuilder.build(workflowId);
  if (workflowEngine.require(workflowId).status === 'CONTEXT_LOADING') {
    workflowEngine.transition(workflowId, 'PLANNING', { actor, stage: 'Waiting for a plan' });
  }
  return bundle;
}

/** PLANNING → DELEGATING → EXECUTING, with the specialist task graph persisted. */
export function recordPlan(workflowId: string, actor: string, planText?: string): TaskPlan {
  const workflow = workflowEngine.require(workflowId);
  if (workflow.status !== 'PLANNING') throw new Error(`Workflow ${workflowId} is ${workflow.status}; a plan can be recorded while PLANNING`);
  const plan = createPlan(workflowId, workflow.kind, planText);
  workflowEngine.transition(workflowId, 'DELEGATING', { actor, stage: `${plan.tasks.length} specialist tasks in ${plan.layers.length} layers` });
  workflowEngine.transition(workflowId, 'EXECUTING', { actor, stage: 'Specialists and implementation' });
  return plan;
}

/** Run the planned analysis specialists (parallel within each layer). */
export async function runAnalysis(workflowId: string): Promise<TaskOutcome[]> {
  const workflow = workflowEngine.require(workflowId);
  if (workflow.status !== 'EXECUTING') throw new Error(`Workflow ${workflowId} is ${workflow.status}; specialists run while EXECUTING`);
  return agentRunner.runPlan(workflowId, 'analysis');
}

/** Everything up to the approval gate, for workflows EPOCH runs on its own. */
export async function runToApproval(workflowId: string, actor: string): Promise<DecisionPackage> {
  const status = workflowEngine.require(workflowId).status;
  if (status === 'PENDING' || status === 'CONTEXT_LOADING') loadContext(workflowId, actor);
  if (workflowEngine.require(workflowId).status === 'PLANNING') recordPlan(workflowId, actor);
  if (workflowEngine.require(workflowId).status === 'EXECUTING') await runAnalysis(workflowId);
  return approvalGate.requestApproval(workflowId, actor);
}
