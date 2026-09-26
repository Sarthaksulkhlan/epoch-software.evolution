import fs from 'node:fs';
import path from 'node:path';
import { tasks, workflows } from '../../store/index.js';
import type { AgentType, Task } from '../../shared/schema/task.schema.js';
import type { WorkflowKind } from '../../shared/schema/workflow.schema.js';
import { generateTaskId } from '../../shared/utils/id.js';
import { EPOCH_WORK_DIR } from '../../sandbox/sample-repo.js';

export interface PlanStep {
  agent: AgentType;
  dependsOn: AgentType[];
}

/** Which specialists run for each kind of workflow, and in what order (docs/AGENTS.md parallelism map). */
export const PLANS: Record<Exclude<WorkflowKind, 'seed'>, PlanStep[]> = {
  feature: [
    { agent: 'context', dependsOn: [] },
    { agent: 'historian', dependsOn: [] },
    { agent: 'security', dependsOn: [] },
    { agent: 'qa', dependsOn: [] },
    { agent: 'evolution', dependsOn: ['context', 'historian'] },
    { agent: 'synthesis', dependsOn: ['context', 'historian', 'security', 'qa', 'evolution'] }
  ],
  incident: [
    { agent: 'historian', dependsOn: [] },
    { agent: 'incident', dependsOn: [] },
    { agent: 'evolution', dependsOn: [] },
    { agent: 'security', dependsOn: ['evolution'] },
    { agent: 'qa', dependsOn: ['evolution'] },
    { agent: 'synthesis', dependsOn: ['historian', 'incident', 'evolution', 'security', 'qa'] }
  ],
  remediation: [
    { agent: 'historian', dependsOn: [] },
    { agent: 'security', dependsOn: [] },
    { agent: 'qa', dependsOn: [] },
    { agent: 'evolution', dependsOn: [] },
    { agent: 'synthesis', dependsOn: ['historian', 'security', 'qa', 'evolution'] }
  ],
  replay: [
    { agent: 'security', dependsOn: [] },
    { agent: 'qa', dependsOn: [] },
    { agent: 'evolution', dependsOn: ['security', 'qa'] },
    { agent: 'synthesis', dependsOn: ['security', 'qa', 'evolution'] }
  ]
};

export interface TaskPlan {
  workflowId: string;
  tasks: Task[];
  /** Tasks grouped into layers that can run in parallel, in execution order. */
  layers: Task[][];
  planRef: string;
}

/** Persist the task DAG for a workflow and write the plan document. */
export function createPlan(workflowId: string, kind: WorkflowKind, planText?: string): TaskPlan {
  if (kind === 'seed') throw new Error('Seed workflows have no plan');
  const steps = PLANS[kind];
  const idByAgent = new Map<AgentType, string>(steps.map(s => [s.agent, generateTaskId()]));
  const created: Task[] = steps.map(step => ({
    task_id: idByAgent.get(step.agent)!,
    workflow_id: workflowId,
    agent_type: step.agent,
    status: 'PENDING',
    dependencies: step.dependsOn.map(a => idByAgent.get(a)!),
    retry_count: 0
  }));
  for (const task of created) tasks.insertTask(task);

  const layers = toLayers(created);
  const document = [
    `# Plan for ${workflowId} (${kind})`,
    '',
    planText ? `## Plan from Bob\n\n${planText}\n` : '',
    '## Specialist task graph',
    ...layers.map((layer, i) => `${i + 1}. ${layer.map(t => t.agent_type).join(' ∥ ')}`),
    ''
  ].join('\n');
  const file = path.join(EPOCH_WORK_DIR, 'plans', `${workflowId}.md`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, document, 'utf8');
  const planRef = path.relative(process.cwd(), file).split(path.sep).join('/');
  workflows.setWorkflowRefs(workflowId, { plan_ref: planRef });
  return { workflowId, tasks: created, layers, planRef };
}

/** Group tasks into dependency layers (Kahn's algorithm). Throws on cycles. */
export function toLayers(all: Task[]): Task[][] {
  const remaining = new Map(all.map(t => [t.task_id, t]));
  const done = new Set<string>();
  const layers: Task[][] = [];
  while (remaining.size > 0) {
    const ready = [...remaining.values()].filter(t => t.dependencies.every(d => done.has(d)));
    if (ready.length === 0) throw new Error('Task graph has a cycle');
    layers.push(ready);
    for (const t of ready) {
      remaining.delete(t.task_id);
      done.add(t.task_id);
    }
  }
  return layers;
}

export function readPlan(workflowId: string): string | undefined {
  const ref = workflows.getWorkflow(workflowId)?.plan_ref;
  return ref && fs.existsSync(ref) ? fs.readFileSync(ref, 'utf8') : undefined;
}
