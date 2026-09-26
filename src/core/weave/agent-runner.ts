import { eventBus } from '../events/bus.js';
import { evidence, tasks, workflows } from '../../store/index.js';
import type { AgentType, Task } from '../../shared/schema/task.schema.js';
import type { Evidence } from '../../shared/schema/evidence.schema.js';
import { generateEvidenceId, generateTaskId } from '../../shared/utils/id.js';
import { getAgent, type AgentContext, type AgentPhase, type AgentResult, type Verification } from '../../agents/index.js';
import { getRepoSpec } from '../epoch/spec-registry.js';
import { loadHistory } from '../epoch/history.js';
import { sampleRepoPath, workingTreeDiff } from '../../sandbox/sample-repo.js';
import { contextBuilder } from './context-builder.js';
import { toLayers } from './task-graph.js';

const MAX_RETRIES = 3;

interface SharedInputs {
  diff: string;
  headScan: AgentContext['headScan'];
}

export interface TaskOutcome {
  task: Task;
  result?: AgentResult;
  evidence: Evidence[];
  error?: string;
}

/**
 * Runs specialist agents for a workflow. Independent tasks in the same layer
 * run concurrently; every claim is persisted as evidence under its task, and a
 * failure is recorded as evidence instead of disappearing (ADR-014).
 */
export class AgentRunner {
  async runPlan(workflowId: string, phase: AgentPhase, verification?: Verification): Promise<TaskOutcome[]> {
    const pending = tasks.listTasksByWorkflow(workflowId).filter(t => t.status === 'PENDING' && getAgent(t.agent_type));
    const shared = this.sharedInputs();
    const outcomes: TaskOutcome[] = [];
    for (const layer of toLayers(pending)) {
      const results = await Promise.all(layer.map(task => this.runTask(task, phase, shared, verification)));
      outcomes.push(...results);
    }
    return outcomes;
  }

  /** Run one agent outside the plan (Bob's subagents call this through EPOCH-MCP). */
  async runSingle(workflowId: string, agentType: AgentType, phase: AgentPhase, verification?: Verification): Promise<TaskOutcome> {
    if (!getAgent(agentType)) throw new Error(`EPOCH has no deterministic ${agentType} agent`);
    // A specialist Bob calls by name consumes its planned task, so the task graph stays complete.
    const planned = phase === 'analysis'
      ? tasks.listTasksByWorkflow(workflowId).find(t => t.agent_type === agentType && t.status === 'PENDING')
      : undefined;
    const task: Task = planned ?? {
      task_id: generateTaskId(),
      workflow_id: workflowId,
      agent_type: agentType,
      status: 'PENDING',
      dependencies: [],
      input_ref: phase,
      retry_count: 0
    };
    if (!planned) tasks.insertTask(task);
    return this.runTask(task, phase, this.sharedInputs(), verification);
  }

  /** Inputs computed once per run so parallel agents never race on git. */
  private sharedInputs(): SharedInputs {
    return { diff: workingTreeDiff(sampleRepoPath()), headScan: loadHistory().at(-1)?.scan };
  }

  private async runTask(task: Task, phase: AgentPhase, shared: SharedInputs, verification?: Verification): Promise<TaskOutcome> {
    const agent = getAgent(task.agent_type);
    if (!agent) throw new Error(`No agent registered for ${task.agent_type}`);
    const workflow = workflows.getWorkflow(task.workflow_id);
    if (!workflow) throw new Error(`Workflow ${task.workflow_id} not found`);

    const started = Date.now();
    tasks.markTaskRunning(task.task_id, started);
    eventBus.emit('task.started', { taskId: task.task_id, workflowId: task.workflow_id, agent: task.agent_type, role: agent.role, phase });

    let lastError = '';
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const ctx = this.buildContext(task, phase, workflow.kind, shared, verification);
        const result = await agent.run(ctx);
        const at = Date.now();
        const saved = result.claims.map(claim => {
          const record: Evidence = {
            evidence_id: generateEvidenceId(),
            workflow_id: task.workflow_id,
            task_id: task.task_id,
            claim: claim.claim,
            status: claim.status,
            source_artifact_ref: claim.sourceRef,
            created_at: at
          };
          if (claim.severity) record.finding_severity = claim.severity;
          evidence.insertEvidence(record);
          eventBus.emit('evidence.created', { evidenceId: record.evidence_id, workflowId: task.workflow_id, taskId: task.task_id, agent: task.agent_type, status: record.status, severity: record.finding_severity ?? null, claim: record.claim });
          return record;
        });
        tasks.markTaskFinished(task.task_id, 'COMPLETED', at);
        eventBus.emit('task.completed', {
          taskId: task.task_id,
          workflowId: task.workflow_id,
          agent: task.agent_type,
          phase,
          summary: result.summary,
          riskLevel: result.riskLevel,
          evidenceCount: saved.length,
          durationMs: at - started
        });
        return { task: { ...task, status: 'COMPLETED' }, result, evidence: saved };
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        if (attempt < MAX_RETRIES) tasks.incrementRetry(task.task_id);
      }
    }

    const at = Date.now();
    const failure: Evidence = {
      evidence_id: generateEvidenceId(),
      workflow_id: task.workflow_id,
      task_id: task.task_id,
      claim: `${task.agent_type} agent failed after ${MAX_RETRIES + 1} attempts: ${lastError}`,
      status: 'observed',
      source_artifact_ref: `task:${task.task_id}`,
      finding_severity: 'high',
      created_at: at
    };
    evidence.insertEvidence(failure);
    tasks.markTaskFinished(task.task_id, 'FAILED', at);
    eventBus.emit('task.failed', { taskId: task.task_id, workflowId: task.workflow_id, agent: task.agent_type, error: lastError });
    return { task: { ...task, status: 'FAILED' }, evidence: [failure], error: lastError };
  }

  private buildContext(task: Task, phase: AgentPhase, kind: AgentContext['kind'], shared: SharedInputs, verification?: Verification): AgentContext {
    const bundle = contextBuilder.load(task.workflow_id);
    const repo = sampleRepoPath();
    return {
      workflowId: task.workflow_id,
      taskId: task.task_id,
      kind,
      phase,
      requirement: bundle.requirements[0]
        ? [bundle.requirements[0].statement, ...bundle.requirements[0].acceptance_criteria].join(' ')
        : '',
      bundle,
      repoPath: repo,
      spec: getRepoSpec(),
      headScan: shared.headScan,
      diff: shared.diff,
      verification
    };
  }
}

export const agentRunner = new AgentRunner();
