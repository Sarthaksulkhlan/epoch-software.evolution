import { nanoid } from 'nanoid';
import { eventBus } from '../events/bus.js';
import { replayEngine } from './replay.js';
import { workflows } from '../../store/index.js';

import type { Workflow, WorkflowStatus } from '../../shared/schema/workflow.schema.js';

const VALID_TRANSITIONS: Record<string, string[]> = {
  'PENDING': ['CONTEXT_LOADING'],
  'CONTEXT_LOADING': ['PLANNING', 'REJECTED'],
  'PLANNING': ['DELEGATING', 'REJECTED'],
  'DELEGATING': ['EXECUTING'],
  'EXECUTING': ['VERIFYING'],
  'VERIFYING': ['AWAITING_APPROVAL', 'EXECUTING'], // EXECUTING for retry
  'AWAITING_APPROVAL': ['COMPLETED', 'REJECTED'],
};

const TERMINAL_STATES = new Set(['COMPLETED', 'REJECTED']);

export class WorkflowTransitionError extends Error {
  constructor(
    public readonly workflowId: string,
    public readonly currentState: string,
    public readonly attemptedState: string,
    public readonly validTransitions: string[]
  ) {
    super(`Invalid transition for workflow ${workflowId}: ${currentState} → ${attemptedState}. Valid: [${validTransitions.join(', ')}]`);
    this.name = 'WorkflowTransitionError';
  }
}

export class WorkflowEngine {
  createWorkflow(triggerEventId: string): Workflow {
    const now = Date.now();
    const workflow: Workflow = {
      workflow_id: nanoid(),
      trigger_event_id: triggerEventId,
      status: 'PENDING',
      created_at: now
    };
    
    workflows.insertWorkflow(workflow);
    
    eventBus.emit('workflow.created', { workflowId: workflow.workflow_id, triggerEventId });
    
    return workflow;
  }
  
  transition(workflowId: string, newStatus: WorkflowStatus, currentStage?: string): Workflow {
    const workflow = this.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found in store`);
    }

    const currentStatus = workflow.status;
    if (!this.canTransition(currentStatus, newStatus)) {
      throw new WorkflowTransitionError(
        workflowId,
        currentStatus,
        newStatus,
        this.getValidTransitions(currentStatus)
      );
    }

    const now = Date.now();
    workflow.status = newStatus;
    
    if (TERMINAL_STATES.has(newStatus)) {
      workflow.completed_at = now;
    }

    // Persist changes
    workflows.updateWorkflowStatus(workflowId, newStatus, currentStage, workflow.completed_at);

    // Track for replay
    replayEngine.logTransition(workflowId, currentStatus, newStatus, now);

    // Emit event
    eventBus.emit('workflow.updated', { workflowId, from: currentStatus, to: newStatus, currentStage });

    if (newStatus === 'COMPLETED') {
      eventBus.emit('workflow.completed', { workflowId });
    }

    return workflow;
  }
  
  getWorkflow(workflowId: string): Workflow | undefined {
    return workflows.getWorkflow(workflowId) as Workflow | undefined;
  }
  
  canTransition(currentStatus: string, newStatus: string): boolean {
    const valid = VALID_TRANSITIONS[currentStatus];
    return valid ? valid.includes(newStatus) : false;
  }
  
  getValidTransitions(currentStatus: string): string[] {
    return VALID_TRANSITIONS[currentStatus] || [];
  }
  
  isTerminal(workflowId: string): boolean {
    const wf = this.getWorkflow(workflowId);
    return wf ? TERMINAL_STATES.has(wf.status) : false;
  }
}

export const workflowEngine = new WorkflowEngine();
