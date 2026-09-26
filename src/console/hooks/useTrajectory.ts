import { useState, useMemo, useCallback } from 'react';
import {
  mockDriftFindings,
  mockTrajectorySnapshots,
  mockGraphNodes,
  mockGraphEdges,
  mockIntegrityTrendData,
  GraphNodeData
} from '../data/mock/trajectory';
import { mockInvariants, mockMutations, mockIncidents } from '../data/mock/mutations';
import { DriftFinding, TrajectorySnapshot, Invariant } from '../types';

/**
 * Hook for Trajectory state management, epoch scrubbing, drift findings, and graph node inspection.
 *
 * TODO(IBM Bob): Wire real TanStack Query hook and React Flow model:
 * Expected Contract:
 * - Query: GET /api/v1/trajectory/snapshots
 * - Query: GET /api/v1/trajectory/drift-findings?activeOnly=true
 * - Returns: { snapshots: TrajectorySnapshot[], driftFindings: DriftFinding[], graph: { nodes, edges } }
 */
export function useTrajectory() {
  const [selectedEpoch, setSelectedEpoch] = useState<number>(4);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('M-1042');
  const [selectedDriftFindingId, setSelectedDriftFindingId] = useState<string | null>('DRIFT-409');
  const [activeComponentFilter, setActiveComponentFilter] = useState<string>('ALL');
  const [activeInvariantFilter, setActiveInvariantFilter] = useState<string>('ALL');
  const [highlightCausalChain, setHighlightCausalChain] = useState<boolean>(true);

  const currentSnapshot = useMemo(() => {
    return mockTrajectorySnapshots.find(s => s.epoch === selectedEpoch) || mockTrajectorySnapshots[4];
  }, [selectedEpoch]);

  const activeDriftFinding = useMemo(() => {
    if (!selectedDriftFindingId) return null;
    return mockDriftFindings.find(d => d.id === selectedDriftFindingId) || null;
  }, [selectedDriftFindingId]);

  const selectedNodeDetails = useMemo(() => {
    // Look up in mutations, incidents, or invariants
    const mutation = mockMutations.find(m => m.id === selectedNodeId);
    if (mutation) {
      return { type: 'MUTATION' as const, data: mutation };
    }
    const incident = mockIncidents.find(i => i.id === selectedNodeId);
    if (incident) {
      return { type: 'INCIDENT' as const, data: incident };
    }
    const invariant = mockInvariants.find(inv => inv.id === selectedNodeId);
    if (invariant) {
      return { type: 'INVARIANT' as const, data: invariant };
    }
    const boundaryNode = mockGraphNodes.find(n => n.id === selectedNodeId);
    if (boundaryNode) {
      return { type: 'EPOCH_BOUNDARY' as const, data: boundaryNode };
    }
    return null;
  }, [selectedNodeId]);

  const handleSelectDrift = useCallback((driftId: string) => {
    setSelectedDriftFindingId(driftId);
    const drift = mockDriftFindings.find(d => d.id === driftId);
    if (drift) {
      setSelectedNodeId(drift.earliestPlausibleMutationId);
      setHighlightCausalChain(true);
    }
  }, []);

  return {
    selectedEpoch,
    setSelectedEpoch,
    selectedNodeId,
    setSelectedNodeId,
    selectedDriftFindingId,
    setSelectedDriftFindingId,
    handleSelectDrift,
    activeDriftFinding,
    selectedNodeDetails,
    activeComponentFilter,
    setActiveComponentFilter,
    activeInvariantFilter,
    setActiveInvariantFilter,
    highlightCausalChain,
    setHighlightCausalChain,
    currentSnapshot,
    snapshots: mockTrajectorySnapshots,
    driftFindings: mockDriftFindings,
    trendData: mockIntegrityTrendData,
    graphNodes: mockGraphNodes,
    graphEdges: mockGraphEdges,
    invariants: mockInvariants
  };
}
