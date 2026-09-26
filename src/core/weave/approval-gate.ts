import { nanoid } from 'nanoid';
import { eventBus } from '../events/bus.js';
import { workflowEngine } from './workflow-engine.js';
import { getDecisionsByWorkflow, createDecision } from '../../store/index.js';

// @ts-ignore
import type { Decision as SchemaDecision } from '../../shared/schema/decision.schema.js';

export interface Decision {
  id: string;
  workflowId: string;
  actor: string;
  action: 'APPROVED' | 'REJECTED';
  rationale?: string;
  scope?: string;
  timestamp: number;
}

export class ApprovalGate {
  requestApproval(workflowId: string): { workflowId: string; evidenceSummary: any; riskLevel: string } {
    workflowEngine.transition(workflowId, 'AWAITING_APPROVAL');
    
    return {
      workflowId,
      evidenceSummary: { total: 5, critical: 0 },
      riskLevel: 'LOW'
    };
  }
  
  recordDecision(
    workflowId: string,
    actor: string,
    action: 'APPROVED' | 'REJECTED',
    rationale?: string,
    scope?: string
  ): Decision {
    const now = Date.now();
    const decision: Decision = {
      id: nanoid(),
      workflowId,
      actor,
      action,
      rationale,
      scope,
      timestamp: now
    };
    
    createDecision(decision);
    
    eventBus.emit('decision.recorded', { decision });
    
    const newStatus = action === 'APPROVED' ? 'COMPLETED' : 'REJECTED';
    workflowEngine.transition(workflowId, newStatus);
    
    return decision;
  }
  
  getDecision(workflowId: string): Decision | undefined {
    const decisions = getDecisionsByWorkflow(workflowId) as Decision[];
    return decisions.length > 0 ? decisions[0] : undefined;
  }
  
  isAwaitingApproval(workflowId: string): boolean {
    const wf = workflowEngine.getWorkflow(workflowId);
    return wf?.status === 'AWAITING_APPROVAL';
  }
}

export const approvalGate = new ApprovalGate();
