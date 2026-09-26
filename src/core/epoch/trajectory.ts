import { driftFindings, epochs, invariants, mutations, trajectory } from '../../store/index.js';
import type { TrajectoryPoint } from '../../shared/schema/trajectory-point.schema.js';
import type { ScanResult } from '../../graph/scanner/scanner.js';

/**
 * The intended envelope for the watched system. Outside it, EPOCH recommends a
 * counterfactual simulation. Values are demo-scale engineering heuristics.
 */
export const ENVELOPE = {
  minBoundaryIntegrity: 0.8,
  maxCoupling: 0.3
} as const;

export interface TrajectorySnapshot {
  latestPoint: TrajectoryPoint | null;
  couplingScore: number;
  boundaryIntegrityScore: number;
  withinEnvelope: boolean;
  envelope: typeof ENVELOPE;
  openDriftFindings: number;
  currentEpochId: string | null;
  totalMutations: number;
  invariants: Array<{ invariant_id: string; status: string }>;
}

export class TrajectoryEngine {
  /** Persist the trajectory point for a mutation, derived from its structural scan. */
  recordPoint(mutationId: string, scan: ScanResult, epochId: string, timestamp: number): TrajectoryPoint {
    const previous = trajectory.getLatestTrajectoryPoint();
    const driftDelta = previous
      ? round4((scan.couplingScore - previous.coupling_score) - (scan.boundaryIntegrityScore - previous.boundary_integrity_score))
      : 0;
    const point: TrajectoryPoint = {
      mutation_id: mutationId,
      timestamp,
      coupling_score: scan.couplingScore,
      boundary_integrity_score: scan.boundaryIntegrityScore,
      drift_delta: driftDelta,
      epoch_id: epochId,
      state_hash: scan.stateHash
    };
    const id = trajectory.insertTrajectoryPoint(point, scan);
    return { ...point, id };
  }

  isWithinEnvelope(coupling: number, boundaryIntegrity: number): boolean {
    return boundaryIntegrity >= ENVELOPE.minBoundaryIntegrity && coupling <= ENVELOPE.maxCoupling;
  }

  snapshot(): TrajectorySnapshot {
    const latestPoint = trajectory.getLatestTrajectoryPoint() ?? null;
    const coupling = latestPoint?.coupling_score ?? 0;
    const boundary = latestPoint?.boundary_integrity_score ?? 1;
    return {
      latestPoint,
      couplingScore: coupling,
      boundaryIntegrityScore: boundary,
      withinEnvelope: this.isWithinEnvelope(coupling, boundary),
      envelope: ENVELOPE,
      openDriftFindings: driftFindings.listDriftFindings({ status: 'open' }).length,
      currentEpochId: epochs.getLatestEpoch()?.epoch_id ?? null,
      totalMutations: mutations.countMutations(),
      invariants: invariants.listInvariants().map(i => ({ invariant_id: i.invariant_id, status: i.status }))
    };
  }

  series(limit?: number): TrajectoryPoint[] {
    return trajectory.listTrajectoryPoints({ limit });
  }
}

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

export const trajectoryEngine = new TrajectoryEngine();
