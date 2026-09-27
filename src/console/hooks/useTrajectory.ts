import { useState, useMemo, useCallback } from 'react';
import { useApi } from './useApi';
import type {
  DriftFinding,
  TrajectorySnapshot,
  Invariant,
  Mutation,
  Incident,
  GraphNodeData,
  GraphEdgeData,
  IntegrityTrendPoint
} from '../types';

const TOPICS = ['mutation', 'drift', 'invariant', 'workflow'] as const;

/** GET /api/trajectory/snapshot (fractions 0..1): whether the latest state sits inside the envelope. */
interface EnvelopeSnapshot {
  snapshot: { withinEnvelope: boolean; boundaryIntegrityScore: number; couplingScore: number; openDriftFindings: number };
}

/**
 * Trajectory lens: epoch snapshots, drift findings, the evolution graph and the
 * integrity trend from /api/v1, kept fresh by the live stream.
 */
export function useTrajectory() {
  const snapshotsRes = useApi<TrajectorySnapshot[]>('/api/v1/trajectory/snapshots', TOPICS);
  const driftRes = useApi<DriftFinding[]>('/api/v1/trajectory/drift-findings', TOPICS);
  const graphRes = useApi<{ nodes: GraphNodeData[]; edges: GraphEdgeData[] }>('/api/v1/trajectory/graph', TOPICS);
  const trendRes = useApi<IntegrityTrendPoint[]>('/api/v1/trajectory/trend?limit=24', TOPICS);
  const invariantsRes = useApi<Invariant[]>('/api/v1/invariants', TOPICS);
  const mutationsRes = useApi<Mutation[]>('/api/v1/mutations', TOPICS);
  const incidentsRes = useApi<Incident[]>('/api/v1/incidents', TOPICS);
  const envelopeRes = useApi<EnvelopeSnapshot>('/api/trajectory/snapshot', TOPICS);

  const snapshots = snapshotsRes.data ?? [];
  const driftFindings = driftRes.data ?? [];
  const graphNodes = graphRes.data?.nodes ?? [];
  const graphEdges = graphRes.data?.edges ?? [];
  const trendData = trendRes.data ?? [];
  const invariants = invariantsRes.data ?? [];
  const mutations = mutationsRes.data ?? [];
  const incidents = incidentsRes.data ?? [];

  const [selectedEpochState, setSelectedEpoch] = useState<number | null>(null);
  const [selectedNodeState, setSelectedNodeId] = useState<string | null>(null);
  const [selectedDriftFindingId, setSelectedDriftFindingId] = useState<string | null>(null);
  const [activeComponentFilter, setActiveComponentFilter] = useState<string>('ALL');
  const [activeInvariantFilter, setActiveInvariantFilter] = useState<string>('ALL');
  const [highlightCausalChain, setHighlightCausalChain] = useState<boolean>(true);

  const openDriftFindings = useMemo(() => driftFindings.filter(d => (d.status ?? 'open') === 'open'), [driftFindings]);
  const openIncident = useMemo(() => incidents.find(i => i.status === 'ACTIVE') ?? null, [incidents]);

  /** The earliest plausible contributing mutation of the open incident (or open drift). */
  const originMutationId = useMemo(() => {
    return openIncident?.earliestPlausibleContributingMutationId
      || openDriftFindings.find(d => d.earliestPlausibleMutationId)?.earliestPlausibleMutationId
      || '';
  }, [openIncident, openDriftFindings]);

  const epochs = useMemo(() => snapshots.map(s => s.epoch), [snapshots]);
  const latestEpoch = epochs.length > 0 ? Math.max(...epochs) : 0;
  const selectedEpoch = selectedEpochState ?? latestEpoch;

  const selectedNodeId = selectedNodeState ?? (originMutationId || mutations.at(-1)?.id || '');

  const currentSnapshot = useMemo(
    () => snapshots.find(s => s.epoch === selectedEpoch) ?? snapshots.at(-1) ?? null,
    [snapshots, selectedEpoch]
  );

  const activeDriftFinding = useMemo(() => {
    if (selectedDriftFindingId) {
      const chosen = openDriftFindings.find(d => d.id === selectedDriftFindingId);
      if (chosen) return chosen;
    }
    return openDriftFindings.find(d => d.severity === 'CRITICAL') ?? openDriftFindings[0] ?? null;
  }, [openDriftFindings, selectedDriftFindingId]);

  const selectedNodeDetails = useMemo(() => {
    const mutation = mutations.find(m => m.id === selectedNodeId);
    if (mutation) return { type: 'MUTATION' as const, data: mutation };
    const incident = incidents.find(i => i.id === selectedNodeId);
    if (incident) return { type: 'INCIDENT' as const, data: incident };
    const invariant = invariants.find(inv => inv.id === selectedNodeId);
    if (invariant) return { type: 'INVARIANT' as const, data: invariant };
    const boundaryNode = graphNodes.find(n => n.id === selectedNodeId && n.type === 'EpochBoundaryNode');
    if (boundaryNode) return { type: 'EPOCH_BOUNDARY' as const, data: boundaryNode };
    return null;
  }, [selectedNodeId, mutations, incidents, invariants, graphNodes]);

  /** Components touched by any recorded mutation, for the filter rail. */
  const components = useMemo(
    () => [...new Set(mutations.flatMap(m => m.touchedComponents))].sort(),
    [mutations]
  );

  /** Mutation ids touching the active component filter (null = no filter). */
  const componentMatchIds = useMemo(() => {
    if (activeComponentFilter === 'ALL') return null;
    return new Set(mutations.filter(m => m.touchedComponents.includes(activeComponentFilter)).map(m => m.id));
  }, [mutations, activeComponentFilter]);

  const handleSelectDrift = useCallback((driftId: string) => {
    setSelectedDriftFindingId(driftId);
    const drift = driftFindings.find(d => d.id === driftId);
    if (drift?.earliestPlausibleMutationId) {
      setSelectedNodeId(drift.earliestPlausibleMutationId);
      setHighlightCausalChain(true);
    }
  }, [driftFindings]);

  const envelope = envelopeRes.data?.snapshot ?? null;

  const core = [snapshotsRes, driftRes, graphRes, trendRes, invariantsRes, mutationsRes, incidentsRes];
  const isLoading = core.some(r => r.isLoading && r.data === undefined);
  const error = core.find(r => r.error && r.data === undefined)?.error ?? null;
  const reload = useCallback(() => {
    for (const r of [snapshotsRes, driftRes, graphRes, trendRes, invariantsRes, mutationsRes, incidentsRes, envelopeRes]) void r.reload();
  }, [snapshotsRes, driftRes, graphRes, trendRes, invariantsRes, mutationsRes, incidentsRes, envelopeRes]);

  return {
    isLoading,
    error,
    reload,
    epochs,
    selectedEpoch,
    setSelectedEpoch,
    selectedNodeId,
    setSelectedNodeId,
    selectedDriftFindingId,
    setSelectedDriftFindingId,
    handleSelectDrift,
    activeDriftFinding,
    openDriftFindings,
    openIncident,
    originMutationId,
    selectedNodeDetails,
    activeComponentFilter,
    setActiveComponentFilter,
    activeInvariantFilter,
    setActiveInvariantFilter,
    highlightCausalChain,
    setHighlightCausalChain,
    currentSnapshot,
    snapshots,
    driftFindings,
    trendData,
    graphNodes,
    graphEdges,
    invariants,
    mutations,
    incidents,
    components,
    componentMatchIds,
    envelope
  };
}
