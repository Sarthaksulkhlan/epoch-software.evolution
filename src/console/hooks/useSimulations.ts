import { useState, useMemo, useCallback } from 'react';
import { useApi } from './useApi';
import { apiPost, describeError } from '../api/client';
import type { CounterfactualScenario, Mutation, Workflow } from '../types';

/**
 * Futures lens: the measured futures from GET /api/v1/simulations. Adopting one
 * (POST /api/v1/simulations/remediate) applies its diff and opens a remediation
 * workflow, which the Current lens then shows.
 */
export function useSimulations(requestedMutationId?: string | null) {
  const simsRes = useApi<CounterfactualScenario[]>('/api/v1/simulations', ['workflow', 'mutation']);
  const all = useMemo(() => simsRes.data ?? [], [simsRes.data]);

  const divergenceIds = useMemo(() => [...new Set(all.map(s => s.divergenceMutationId))], [all]);
  const [divergenceState, setDivergenceMutationId] = useState<string | null>(requestedMutationId ?? null);

  /** A requested branch point without futures falls back to the newest one that has some. */
  const requestedMissing = divergenceState !== null && all.length > 0 && !divergenceIds.includes(divergenceState);
  const divergenceMutationId = divergenceState && divergenceIds.includes(divergenceState)
    ? divergenceState
    : divergenceIds.at(-1) ?? null;

  const scenarios = useMemo(() => {
    const forPoint = all.filter(s => s.divergenceMutationId === divergenceMutationId);
    // Several forks from one mutation: show the newest simulation's futures.
    const simulationIds = [...new Set(forPoint.map(s => s.simulationId ?? s.id.split(':')[0]))];
    const newest = simulationIds.at(-1);
    return forPoint.filter(s => (s.simulationId ?? s.id.split(':')[0]) === newest);
  }, [all, divergenceMutationId]);

  const divergenceRes = useApi<Mutation>(divergenceMutationId ? `/api/v1/mutations/${divergenceMutationId}` : null);

  const [selectedScenarioState, setSelectedScenarioId] = useState<string | null>(null);
  const recommended = scenarios.find(s => s.recommended);
  const selectedScenarioId = selectedScenarioState && scenarios.some(s => s.id === selectedScenarioState)
    ? selectedScenarioState
    : (recommended ?? scenarios[0])?.id ?? '';
  const activeScenario = scenarios.find(s => s.id === selectedScenarioId) ?? null;
  const adoptedScenario = scenarios.find(s => s.selected) ?? null;

  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState<boolean>(false);
  const [isAdopting, setIsAdopting] = useState<boolean>(false);
  const [adoptError, setAdoptError] = useState<string | null>(null);

  /** Adopt a measured future. Resolves to the remediation workflow id, or null when the API refused. */
  const adopt = useCallback(async (scenarioId: string): Promise<string | null> => {
    setIsAdopting(true);
    setAdoptError(null);
    try {
      const result = await apiPost<{ workflowId: string; workflow: Workflow }>('/api/v1/simulations/remediate', { scenarioId });
      setIsDecisionModalOpen(false);
      void simsRes.reload();
      return result.workflowId;
    } catch (error) {
      setAdoptError(describeError(error, 'write'));
      return null;
    } finally {
      setIsAdopting(false);
    }
  }, [simsRes]);

  return {
    isLoading: simsRes.isLoading && simsRes.data === undefined,
    error: simsRes.data === undefined ? simsRes.error : null,
    reload: simsRes.reload,
    scenarios,
    divergenceIds,
    divergenceMutationId,
    setDivergenceMutationId,
    requestedMutationId: divergenceState,
    requestedMissing,
    divergenceMutation: divergenceRes.data ?? null,
    selectedScenarioId,
    setSelectedScenarioId,
    activeScenario,
    adoptedScenario,
    adopt,
    isAdopting,
    adoptError,
    setAdoptError,
    isDecisionModalOpen,
    setIsDecisionModalOpen
  };
}
