import { useState, useMemo, useCallback } from 'react';
import { useApi } from './useApi';
import type { Mutation, Incident, Invariant } from '../types';

export type HistoryFilterType = 'ALL' | 'MUTATION' | 'INCIDENT' | 'DRIFT_RISK';

const TOPICS = ['mutation', 'drift', 'invariant'] as const;

/**
 * HISTORY lens: recorded mutations, incidents and invariants from /api/v1,
 * refetched when the live stream reports a new mutation, drift or invariant change.
 */
export function useMutationHistory() {
  const mutationsRes = useApi<Mutation[]>('/api/v1/mutations', TOPICS);
  const incidentsRes = useApi<Incident[]>('/api/v1/incidents', TOPICS);
  const invariantsRes = useApi<Invariant[]>('/api/v1/invariants', TOPICS);

  const mutations = useMemo(() => mutationsRes.data ?? [], [mutationsRes.data]);
  const incidents = useMemo(() => incidentsRes.data ?? [], [incidentsRes.data]);
  const invariants = invariantsRes.data ?? [];

  const [selectedMutationState, setSelectedMutationId] = useState<string | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<HistoryFilterType>('ALL');
  const [activeReplayEpoch, setActiveReplayEpoch] = useState<number | null>(null);

  /** The storyline incident: the open one, else the most recent. */
  const storyIncident = useMemo(
    () => incidents.find(i => i.status === 'ACTIVE') ?? incidents.at(-1) ?? null,
    [incidents]
  );
  const originMutationId = storyIncident?.earliestPlausibleContributingMutationId || '';

  const selectedMutation = useMemo(() => {
    const wanted = selectedMutationState ?? originMutationId;
    return mutations.find(m => m.id === wanted) ?? mutations.at(-1) ?? null;
  }, [mutations, selectedMutationState, originMutationId]);

  const selectedIncident = useMemo(() => {
    if (!selectedIncidentId) return null;
    return incidents.find(i => i.id === selectedIncidentId) ?? null;
  }, [incidents, selectedIncidentId]);

  const epochs = useMemo(
    () => [...new Set([...mutations.map(m => m.epoch), ...incidents.map(i => i.epoch)])].sort((a, b) => a - b),
    [mutations, incidents]
  );

  const filteredItems = useMemo(() => {
    const list: Array<{ type: 'MUTATION' | 'INCIDENT'; data: Mutation | Incident; epoch: number; timestamp: string }> = [
      ...mutations.map(m => ({ type: 'MUTATION' as const, data: m, epoch: m.epoch, timestamp: m.timestamp })),
      ...incidents.map(i => ({ type: 'INCIDENT' as const, data: i, epoch: i.epoch, timestamp: i.timestamp }))
    ];

    list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return list.filter(item => {
      if (activeReplayEpoch !== null && item.epoch > activeReplayEpoch) return false;
      if (filterType === 'MUTATION') return item.type === 'MUTATION';
      if (filterType === 'INCIDENT') return item.type === 'INCIDENT';
      if (filterType === 'DRIFT_RISK') {
        if (item.type === 'INCIDENT') return true;
        return (item.data as Mutation).structuralConsequences.driftContribution !== 'NONE';
      }
      return true;
    });
  }, [mutations, incidents, filterType, activeReplayEpoch]);

  const all = [mutationsRes, incidentsRes, invariantsRes];
  const isLoading = all.some(r => r.isLoading && r.data === undefined);
  const error = all.find(r => r.error && r.data === undefined)?.error ?? null;
  const reload = useCallback(() => {
    void mutationsRes.reload();
    void incidentsRes.reload();
    void invariantsRes.reload();
  }, [mutationsRes, incidentsRes, invariantsRes]);

  return {
    isLoading,
    error,
    reload,
    mutations,
    incidents,
    invariants,
    epochs,
    storyIncident,
    originMutationId,
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
