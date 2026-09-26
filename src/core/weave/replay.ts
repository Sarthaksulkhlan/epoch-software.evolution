import { decisions, events, evidence, mutations, tasks, workflows } from '../../store/index.js';
import type { Decision } from '../../shared/schema/decision.schema.js';
import type { Event } from '../../shared/schema/event.schema.js';
import type { Evidence } from '../../shared/schema/evidence.schema.js';
import type { Mutation } from '../../shared/schema/mutation.schema.js';
import type { Task } from '../../shared/schema/task.schema.js';
import type { Workflow, WorkflowEvent } from '../../shared/schema/workflow.schema.js';
import { readPlan } from './task-graph.js';

export interface TimelineEntry {
  at: number;
  kind: 'event' | 'transition' | 'task' | 'evidence' | 'decision' | 'mutation';
  label: string;
  refId: string;
}

export interface WorkflowReplay {
  workflow: Workflow;
  event: Event | undefined;
  transitions: WorkflowEvent[];
  tasks: Array<Task & { evidence: Evidence[] }>;
  decisions: Decision[];
  mutation: Mutation | undefined;
  plan: string | undefined;
  timeline: TimelineEntry[];
}

/**
 * Rebuild a workflow's full history from the persisted transition log,
 * tasks, evidence and decisions (ADR-012 replay). Nothing is kept in memory.
 */
export function replayWorkflow(workflowId: string): WorkflowReplay | undefined {
  const workflow = workflows.getWorkflow(workflowId);
  if (!workflow) return undefined;
  const event = events.getEvent(workflow.trigger_event_id);
  const transitions = workflows.listWorkflowEvents(workflowId);
  const allEvidence = evidence.listEvidenceByWorkflow(workflowId);
  const taskList = tasks.listTasksByWorkflow(workflowId).map(t => ({ ...t, evidence: allEvidence.filter(e => e.task_id === t.task_id) }));
  const decisionList = decisions.listDecisionsByWorkflow(workflowId);
  const mutation = workflow.mutation_id ? mutations.getMutation(workflow.mutation_id) : undefined;

  const timeline: TimelineEntry[] = [];
  if (event) timeline.push({ at: event.timestamp, kind: 'event', label: `${event.type} from ${event.source}`, refId: event.event_id });
  for (const t of transitions) timeline.push({ at: t.timestamp, kind: 'transition', label: `${t.from_status} → ${t.to_status}${t.stage ? ` (${t.stage})` : ''} by ${t.actor}`, refId: String(t.id ?? '') });
  for (const t of taskList) {
    if (t.started_at) timeline.push({ at: t.started_at, kind: 'task', label: `${t.agent_type} started`, refId: t.task_id });
    if (t.completed_at) timeline.push({ at: t.completed_at, kind: 'task', label: `${t.agent_type} ${t.status.toLowerCase()} with ${t.evidence.length} claim(s)`, refId: t.task_id });
  }
  for (const d of decisionList) timeline.push({ at: d.timestamp, kind: 'decision', label: `${d.action} by ${d.actor}${d.rationale ? `: ${d.rationale}` : ''}`, refId: d.decision_id });
  if (mutation) timeline.push({ at: mutation.created_at, kind: 'mutation', label: `${mutation.mutation_id} recorded`, refId: mutation.mutation_id });
  timeline.sort((a, b) => a.at - b.at);

  return { workflow, event, transitions, tasks: taskList, decisions: decisionList, mutation, plan: readPlan(workflowId), timeline };
}
