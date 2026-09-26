import { eventBus } from '../events/bus.js';
import { events, graphEdges, workflows } from '../../store/index.js';
import type { Event, EventType } from '../../shared/schema/event.schema.js';
import type { Workflow, WorkflowKind, WorkflowStatus } from '../../shared/schema/workflow.schema.js';
import { generateEdgeId, generateEventId, generateWorkflowId } from '../../shared/utils/id.js';

/** ADR-012 transition table. REJECTED is also allowed from any open state (abort). */
const VALID_TRANSITIONS: Record<WorkflowStatus, WorkflowStatus[]> = {
  PENDING: ['CONTEXT_LOADING'],
  CONTEXT_LOADING: ['PLANNING'],
  PLANNING: ['DELEGATING'],
  DELEGATING: ['EXECUTING'],
  EXECUTING: ['VERIFYING'],
  VERIFYING: ['AWAITING_APPROVAL', 'EXECUTING'],
  AWAITING_APPROVAL: ['COMPLETED', 'EXECUTING'],
  COMPLETED: [],
  REJECTED: []
};

const TERMINAL = new Set<WorkflowStatus>(['COMPLETED', 'REJECTED']);

const EVENT_TYPE_BY_KIND: Record<WorkflowKind, EventType> = {
  feature: 'requirement.created',
  incident: 'incident.detected',
  remediation: 'workflow.manual',
  replay: 'pr.merged',
  seed: 'pr.merged'
};

export class WorkflowTransitionError extends Error {
  constructor(
    readonly workflowId: string,
    readonly currentState: WorkflowStatus,
    readonly attemptedState: WorkflowStatus,
    readonly validTransitions: WorkflowStatus[]
  ) {
    super(`Invalid transition for workflow ${workflowId}: ${currentState} → ${attemptedState}. Valid: [${validTransitions.join(', ')}]`);
    this.name = 'WorkflowTransitionError';
  }
}

export class WorkflowNotFoundError extends Error {
  constructor(readonly workflowId: string) {
    super(`Workflow ${workflowId} not found`);
    this.name = 'WorkflowNotFoundError';
  }
}

export interface StartWorkflowInput {
  requirement: string;
  title?: string | undefined;
  kind?: WorkflowKind | undefined;
  source?: string | undefined;
  author?: string | undefined;
  /** Requested id for the mutation this workflow will produce (replayed history). */
  mutationId?: string | undefined;
  payload?: Record<string, unknown> | undefined;
  at?: number | undefined;
}

export class WorkflowEngine {
  /** Record the triggering event and create a PENDING workflow for it. */
  start(input: StartWorkflowInput): { workflow: Workflow; event: Event } {
    const at = input.at ?? Date.now();
    const kind = input.kind ?? 'feature';
    const payload: Record<string, unknown> = { ...input.payload, requirement: input.requirement };
    if (input.author) payload.author = input.author;
    if (input.mutationId) payload.mutation_id = input.mutationId;

    const event: Event = {
      event_id: generateEventId(),
      type: EVENT_TYPE_BY_KIND[kind],
      source: input.source ?? 'epoch-api',
      timestamp: at,
      repo: 'sample-app',
      branch: 'main',
      payload
    };
    events.insertEvent(event);
    eventBus.emit('event.ingested', { eventId: event.event_id, type: event.type, source: event.source });

    const workflow: Workflow = {
      workflow_id: generateWorkflowId(),
      trigger_event_id: event.event_id,
      kind,
      title: input.title ?? titleOf(input.requirement),
      status: 'PENDING',
      created_at: at
    };
    workflows.insertWorkflow(workflow);
    graphEdges.insertEdge({
      edge_id: generateEdgeId(),
      from_id: event.event_id,
      from_type: 'event',
      to_id: workflow.workflow_id,
      to_type: 'workflow',
      relationship: 'TRIGGERS',
      confidence: 1,
      created_at: at
    });
    eventBus.emit('workflow.created', { workflowId: workflow.workflow_id, kind, title: workflow.title ?? null, triggerEventId: event.event_id, author: input.author ?? null });
    return { workflow, event };
  }

  transition(workflowId: string, to: WorkflowStatus, options: { actor: string; stage?: string | undefined }): Workflow {
    const workflow = this.require(workflowId);
    const from = workflow.status;
    if (!this.canTransition(from, to)) {
      throw new WorkflowTransitionError(workflowId, from, to, this.getValidTransitions(from));
    }
    const at = Date.now();
    const completedAt = TERMINAL.has(to) ? at : undefined;
    workflows.updateWorkflowStatus(workflowId, to, options.stage, completedAt);
    const record = { workflow_id: workflowId, from_status: from, to_status: to, actor: options.actor, timestamp: at };
    workflows.insertWorkflowEvent(options.stage ? { ...record, stage: options.stage } : record);

    eventBus.emit('workflow.updated', { workflowId, from, to, stage: options.stage ?? null, actor: options.actor, kind: workflow.kind });
    if (to === 'COMPLETED') eventBus.emit('workflow.completed', { workflowId, kind: workflow.kind });
    return this.require(workflowId);
  }

  /** Walk forward through several states in order. */
  advanceThrough(workflowId: string, states: WorkflowStatus[], actor: string): Workflow {
    let current = this.require(workflowId);
    for (const state of states) {
      if (current.status === state) continue;
      current = this.transition(workflowId, state, { actor });
    }
    return current;
  }

  get(workflowId: string): Workflow | undefined {
    return workflows.getWorkflow(workflowId);
  }

  require(workflowId: string): Workflow {
    const workflow = workflows.getWorkflow(workflowId);
    if (!workflow) throw new WorkflowNotFoundError(workflowId);
    return workflow;
  }

  canTransition(from: WorkflowStatus, to: WorkflowStatus): boolean {
    if (TERMINAL.has(from)) return false;
    return to === 'REJECTED' || VALID_TRANSITIONS[from].includes(to);
  }

  getValidTransitions(from: WorkflowStatus): WorkflowStatus[] {
    return TERMINAL.has(from) ? [] : [...VALID_TRANSITIONS[from], 'REJECTED'];
  }

  isTerminal(status: WorkflowStatus): boolean {
    return TERMINAL.has(status);
  }
}

function titleOf(requirement: string): string {
  const first = requirement.split(/\r?\n/)[0] ?? requirement;
  const sentence = first.split(/(?<=[.!?])\s/)[0] ?? first;
  return sentence.length > 90 ? `${sentence.slice(0, 87)}…` : sentence.replace(/\.$/, '');
}

export const workflowEngine = new WorkflowEngine();
