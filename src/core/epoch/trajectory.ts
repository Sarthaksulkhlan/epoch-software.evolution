import {
  getMutation,
  getGraphEdgesByType,
  getLatestTrajectoryPoint,
  createTrajectoryPoint,
  getMutationsCount,
  getTrajectoryTimeSeries as getStoreTrajectoryTimeSeries
} from '../../store/index.js';
import type { TrajectoryPoint } from '../../shared/schema/trajectory-point.schema.js';
import type { Epoch } from '../../shared/schema/epoch.schema.js';
import { invariantManager } from './invariant-store.js';
import { epochDetector } from './epoch-detector.js';

export interface SystemState {
  couplingScore: number;
  boundaryIntegrityScore: number;
  behaviorScore: number;
}

export interface Trajectory {
  current: SystemState;
  target: SystemState;
  deltas: {
    couplingDelta: number;
    boundaryIntegrityDelta: number;
    behaviorDelta: number;
  };
  envelopeViolations: string[];
}

export class TrajectoryEngine {
  private readonly COUPLING_ENVELOPE = 0.6;
  private readonly BOUNDARY_ENVELOPE = 0.7;
  private readonly BEHAVIOR_ENVELOPE = 0.5;

  /**
   * Compute a trajectory from current state to target state.
   */
  compute(current: SystemState, target: SystemState): Trajectory {
    const deltas = {
      couplingDelta: target.couplingScore - current.couplingScore,
      boundaryIntegrityDelta: target.boundaryIntegrityScore - current.boundaryIntegrityScore,
      behaviorDelta: target.behaviorScore - current.behaviorScore
    };

    const envelopeViolations: string[] = [];
    if (target.couplingScore > this.COUPLING_ENVELOPE) {
      envelopeViolations.push(
        `coupling ${target.couplingScore.toFixed(2)} exceeds envelope ${this.COUPLING_ENVELOPE}`
      );
    }
    if (target.boundaryIntegrityScore < this.BOUNDARY_ENVELOPE) {
      envelopeViolations.push(
        `boundary integrity ${target.boundaryIntegrityScore.toFixed(2)} below envelope ${this.BOUNDARY_ENVELOPE}`
      );
    }
    if (target.behaviorScore > this.BEHAVIOR_ENVELOPE) {
      envelopeViolations.push(
        `behavior drift ${target.behaviorScore.toFixed(2)} exceeds envelope ${this.BEHAVIOR_ENVELOPE}`
      );
    }

    return { current, target, deltas, envelopeViolations };
  }

  /**
   * Check whether a trajectory stays within the acceptable envelope.
   */
  checkEnvelope(trajectory: Trajectory): boolean {
    return trajectory.envelopeViolations.length === 0;
  }

  /**
   * Compute a new trajectory point after a mutation.
   */
  computeTrajectoryPoint(mutationId: string): TrajectoryPoint {
    const mutation = getMutation(mutationId);
    if (!mutation) {
      throw new Error(`Mutation not found: ${mutationId}`);
    }

    const couplingScore = this.computeCouplingScore();
    const boundaryIntegrityScore = this.computeBoundaryIntegrityScore();
    const driftDelta = this.computeDriftDelta(couplingScore, boundaryIntegrityScore);

    const stateHash = `hash-${Date.now()}-${couplingScore.toFixed(3)}-${boundaryIntegrityScore.toFixed(3)}`;
    const currentEpoch = epochDetector.getCurrentEpoch();

    const point: TrajectoryPoint = {
      mutation_id: mutationId,
      timestamp: Date.now(),
      coupling_score: couplingScore,
      boundary_integrity_score: boundaryIntegrityScore,
      drift_delta: driftDelta,
      epoch_id: currentEpoch ? currentEpoch.epoch_id : 'E-001',
      state_hash: stateHash
    };

    createTrajectoryPoint(point as import('../../store/queries/trajectory.js').TrajectoryPoint);
    return point;
  }

  /**
   * Compute coupling score: cross-component dependency density.
   * 0.0 = fully decoupled, 1.0 = every component depends on every other.
   *
   * Formula: actual_cross_edges / max_possible_cross_edges
   * where max = n * (n-1) for n components
   */
  computeCouplingScore(): number {
    const touchesEdges = getGraphEdgesByType('TOUCHES');
    const mutationToComponents = new Map<string, string[]>();

    for (const edge of touchesEdges) {
      if (!mutationToComponents.has(edge.from_id)) {
        mutationToComponents.set(edge.from_id, []);
      }
      mutationToComponents.get(edge.from_id)!.push(edge.to_id);
    }

    const uniquePairs = new Set<string>();
    for (const components of mutationToComponents.values()) {
      for (let i = 0; i < components.length; i++) {
        for (let j = i + 1; j < components.length; j++) {
          const pair = [components[i], components[j]].sort().join('-');
          uniquePairs.add(pair);
        }
      }
    }

    const n = this.getComponentsCount();
    if (n <= 1) return 0.0;

    const maxPossibleCrossEdges = n * (n - 1);
    return uniquePairs.size / maxPossibleCrossEdges;
  }

  /**
   * Compute boundary integrity score: fraction of invariants still HOLDING.
   * 1.0 = all holding, 0.0 = all violated.
   */
  computeBoundaryIntegrityScore(): number {
    const invariants = invariantManager.getAllInvariants();
    if (invariants.length === 0) return 1.0;

    let holdingCount = 0;
    for (const inv of invariants) {
      if (inv.status === 'HOLDING') {
        holdingCount++;
      }
    }

    return holdingCount / invariants.length;
  }

  /**
   * Compute drift delta: change in combined drift score since last point.
   * Negative = improving, positive = worsening.
   */
  computeDriftDelta(currentCoupling: number, currentBoundary: number): number {
    const prevPoint = getLatestTrajectoryPoint();
    if (!prevPoint) return 0;

    const couplingDelta = currentCoupling - (prevPoint.coupling_score ?? 0);
    const boundaryDelta = currentBoundary - (prevPoint.boundary_integrity_score ?? 1);

    // Drift = coupling increase + boundary decrease
    return couplingDelta - boundaryDelta;
  }

  /**
   * Get the current trajectory snapshot (for MCP and API).
   */
  getTrajectorySnapshot(): {
    latestPoint: TrajectoryPoint | null;
    couplingScore: number;
    boundaryIntegrityScore: number;
    activeDriftFindings: number;
    currentEpochId: string;
    totalMutations: number;
  } {
    const latestPoint = getLatestTrajectoryPoint() as TrajectoryPoint | null ?? null;
    const currentEpoch = epochDetector.getCurrentEpoch();

    return {
      latestPoint,
      couplingScore: latestPoint ? latestPoint.coupling_score ?? 0 : 0,
      boundaryIntegrityScore: latestPoint ? latestPoint.boundary_integrity_score ?? 1.0 : 1.0,
      activeDriftFindings: 0,
      currentEpochId: currentEpoch ? currentEpoch.epoch_id : 'E-001',
      totalMutations: getMutationsCount()
    };
  }

  /**
   * Get trajectory points for charting.
   */
  getTrajectoryTimeSeries(limit?: number): TrajectoryPoint[] {
    return getStoreTrajectoryTimeSeries(limit) as TrajectoryPoint[];
  }

  private getComponentsCount(): number {
    const touchesEdges = getGraphEdgesByType('TOUCHES');
    const components = new Set<string>();
    for (const edge of touchesEdges) {
      components.add(edge.to_id);
    }
    return components.size;
  }
}

export const trajectoryEngine = new TrajectoryEngine();
