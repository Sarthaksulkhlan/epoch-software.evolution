import { useState, useCallback } from 'react';
import { mockActiveWorkflow } from '../data/mock/workflows';
import type { Workflow, DecisionGate } from '../types';

/**
 * Hook for fetching and managing active workflow lifecycle state.
 *
 * TODO(IBM Bob): Wire real TanStack Query hook with backend endpoint:
 * Expected Contract:
 * - Query: GET /api/v1/workflows/active?projectId=:projectId
 * - Returns: Workflow with real-time task statuses and evidence attachments
 * - Mutation: POST /api/v1/workflows/:workflowId/decision { decision: 'APPROVED' | 'REJECTED', rationale?: string }
 */
export function useWorkflow(workflowId?: string) {
  const [workflow, setWorkflow] = useState<Workflow>(mockActiveWorkflow);
  const [isDemoActionApplied, setIsDemoActionApplied] = useState(false);

  const submitDecision = useCallback((decision: 'APPROVED' | 'REJECTED', rationale?: string) => {
    // Local mock mutation for demo purposes
    setWorkflow(prev => {
      const updatedGate: DecisionGate = {
        ...prev.decisionGate,
        status: decision === 'APPROVED' ? 'APPROVED' : 'REJECTED',
        decidedAt: new Date().toISOString(),
        decidedBy: 'Principal Engineer (Demo Session)',
        rationale: rationale || (decision === 'APPROVED' ? 'Approved with mitigation plan.' : 'Rejected due to architectural drift risk.')
      };

      return {
        ...prev,
        state: decision === 'APPROVED' ? 'DEPLOYED' : 'HALTED',
        decisionGate: updatedGate
      };
    });
    setIsDemoActionApplied(true);
  }, []);

  const resetDecision = useCallback(() => {
    setWorkflow(mockActiveWorkflow);
    setIsDemoActionApplied(false);
  }, []);

  return {
    workflow,
    isLoading: false,
    error: null,
    isDemoActionApplied,
    submitDecision,
    resetDecision
  };
}
