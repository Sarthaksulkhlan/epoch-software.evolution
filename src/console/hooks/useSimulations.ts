import { useState, useMemo, useCallback } from 'react';
import { mockScenarios } from '../data/mock/simulations';
import { mockMutations } from '../data/mock/mutations';
import { CounterfactualScenario } from '../types';

/**
 * Hook for Counterfactual reasoning and scenario exploration.
 *
 * TODO(IBM Bob): Wire real TanStack Query hook and simulation engine:
 * Expected Contract:
 * - Query: GET /api/v1/simulations?divergenceMutationId=:mutationId
 * - Mutation: POST /api/v1/simulations/remediate { scenarioId: string, author: string, dryRun: boolean }
 * - Returns: { scenarios: CounterfactualScenario[], recommendedScenarioId: string }
 */
export function useSimulations(initialMutationId: string = 'M-1042') {
  const [divergenceMutationId, setDivergenceMutationId] = useState<string>(initialMutationId);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('SCENARIO-B');
  const [appliedRemediationScenarioId, setAppliedRemediationScenarioId] = useState<string | null>(null);
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState<boolean>(false);

  const divergenceMutation = useMemo(() => {
    return mockMutations.find(m => m.id === divergenceMutationId) || mockMutations[0];
  }, [divergenceMutationId]);

  const activeScenario = useMemo(() => {
    return mockScenarios.find(s => s.id === selectedScenarioId) || mockScenarios[1];
  }, [selectedScenarioId]);

  const handleApplyRemediation = useCallback((scenarioId: string) => {
    setAppliedRemediationScenarioId(scenarioId);
    setIsDecisionModalOpen(false);
  }, []);

  const handleResetRemediation = useCallback(() => {
    setAppliedRemediationScenarioId(null);
  }, []);

  return {
    divergenceMutationId,
    setDivergenceMutationId,
    divergenceMutation,
    scenarios: mockScenarios,
    selectedScenarioId,
    setSelectedScenarioId,
    activeScenario,
    appliedRemediationScenarioId,
    handleApplyRemediation,
    handleResetRemediation,
    isDecisionModalOpen,
    setIsDecisionModalOpen
  };
}
