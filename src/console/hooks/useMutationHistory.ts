import { useState, useMemo } from 'react';
import { mockMutations, mockIncidents, mockInvariants } from '../data/mock/mutations';
import type { Mutation, Incident } from '../types';

export type HistoryFilterType = 'ALL' | 'MUTATION' | 'INCIDENT' | 'DRIFT_RISK';

/**
 * Hook for browsing historical mutations, incidents, and causal chains.
 *
 * TODO(IBM Bob): Wire real TanStack Query hook with backend endpoint:
 * Expected Contract:
 * - Query: GET /api/v1/mutations?epochStart=:start&epochEnd=:end&component=:comp
 * - Query: GET /api/v1/incidents
 * - Returns: { mutations: Mutation[], incidents: Incident[], invariants: Invariant[] }
 */
export function useMutationHistory() {
  const [selectedMutationId, setSelectedMutationId] = useState<string>('M-1042');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<HistoryFilterType>('ALL');
  const [activeReplayEpoch, setActiveReplayEpoch] = useState<number | null>(null);

  const selectedMutation = useMemo(() => {
    return mockMutations.find(m => m.id === selectedMutationId) || mockMutations[0];
  }, [selectedMutationId]);

  const selectedIncident = useMemo(() => {
    if (!selectedIncidentId) return null;
    return mockIncidents.find(i => i.id === selectedIncidentId) || null;
  }, [selectedIncidentId]);

  const filteredItems = useMemo(() => {
    // Combine mutations and incidents in chronological order
    const list: Array<{ type: 'MUTATION' | 'INCIDENT'; data: Mutation | Incident; epoch: number; timestamp: string }> = [
      ...mockMutations.map(m => ({ type: 'MUTATION' as const, data: m, epoch: m.epoch, timestamp: m.timestamp })),
      ...mockIncidents.map(i => ({ type: 'INCIDENT' as const, data: i, epoch: i.epoch, timestamp: i.timestamp }))
    ];

    list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return list.filter(item => {
      if (activeReplayEpoch !== null && item.epoch > activeReplayEpoch) {
        return false;
      }
      if (filterType === 'MUTATION') return item.type === 'MUTATION';
      if (filterType === 'INCIDENT') return item.type === 'INCIDENT';
      if (filterType === 'DRIFT_RISK') {
        if (item.type === 'INCIDENT') return true;
        const m = item.data as Mutation;
        return m.structuralConsequences.driftContribution !== 'NONE';
      }
      return true;
    });
  }, [filterType, activeReplayEpoch]);

  return {
    mutations: mockMutations,
    incidents: mockIncidents,
    invariants: mockInvariants,
    filteredItems,
    selectedMutation,
    selectedIncident,
    filterType,
    activeReplayEpoch,
    setSelectedMutationId,
    setSelectedIncidentId,
    setFilterType,
    setActiveReplayEpoch
  };
}
