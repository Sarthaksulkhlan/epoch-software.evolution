import { nanoid } from 'nanoid';
import { eventBus } from '../events/bus.js';
import { getTrajectoryTimeSeries, getMutation } from '../../store/index.js';
import type { Epoch } from '../../shared/schema/epoch.schema.js';
import type { TrajectoryPoint } from '../../shared/schema/trajectory-point.schema.js';
import type { Mutation } from '../../shared/schema/mutation.schema.js';
import { invariantManager } from './invariant-store.js';

export interface EpochConditionResult {
  name: string;
  met: boolean;
  evidence: string;
}

export interface EpochBoundary {
  mutationId: string;
  epochId: string;
  definingProperties: string[];
  boundaryEvidence: string[];
  timestamp: number;
}

export class EpochDetector {
  private readonly BOUNDARY_DROP_THRESHOLD = 0.3;
  private readonly NEW_EDGES_THRESHOLD = 3;
  private readonly MUTATION_WINDOW = 5;
  private readonly CONDITIONS_REQUIRED = 2;

  private epochs: Epoch[] = [];
  private nextEpochSequence = 1;

  constructor() {
    // Seed the initial epoch
    this.epochs.push({
      epoch_id: 'E-001',
      name: 'Initial Epoch',
      start_mutation_id: 'M-0000',
      defining_properties: ['system origin'],
      boundary_evidence: [],
      status: 'current',
      created_at: Date.now()
    });
  }

  /**
   * Detect epoch boundaries from a history of mutations.
   */
  detect(history: Mutation[]): EpochBoundary[] {
    const boundaries: EpochBoundary[] = [];
    if (history.length < 2) return boundaries;

    // Build trajectory points from mutation sequence
    const points: TrajectoryPoint[] = history.map((m, index) => ({
      id: index,
      mutation_id: m.mutation_id,
      timestamp: m.created_at,
      coupling_score: Math.min(1, 0.05 * index),
      boundary_integrity_score: Math.max(0, 1 - 0.05 * index),
      drift_delta: m.trajectory_delta.couplingDelta - m.trajectory_delta.boundaryIntegrityDelta,
      epoch_id: m.epoch_id,
      state_hash: `detect-${m.mutation_id}-${m.created_at}`
    }));

    for (let i = 1; i < points.length; i++) {
      const window = points.slice(Math.max(0, i - this.MUTATION_WINDOW + 1), i + 1);
      const mutation = history[i]!;
      const conditions = [
        this.checkBoundaryDrop(window),
        this.checkNewEdges(window),
        this.checkBehavioralChange(window, mutation),
        this.checkInvariantViolation(window)
      ];
      const metCount = conditions.filter(c => c.met).length;

      if (metCount >= this.CONDITIONS_REQUIRED) {
        const boundary: EpochBoundary = {
          mutationId: mutation.mutation_id,
          epochId: this.generateEpochId(),
          definingProperties: conditions.filter(c => c.met).map(c => c.name),
          boundaryEvidence: conditions.filter(c => c.met).map(c => c.evidence),
          timestamp: mutation.created_at
        };
        boundaries.push(boundary);
      }
    }

    return boundaries;
  }

  /**
   * Check if an epoch boundary should be proposed after a mutation.
   * Returns the detection result.
   */
  checkForEpochBoundary(mutationId: string): {
    shouldPropose: boolean;
    conditionsResults: EpochConditionResult[];
    conditionsMet: number;
  } {
    const window = getTrajectoryTimeSeries(this.MUTATION_WINDOW);
    if (window.length < 2) {
      return {
        shouldPropose: false,
        conditionsResults: [],
        conditionsMet: 0
      };
    }

    const mutation = getMutation(mutationId);
    const typedWindow = window as TrajectoryPoint[];
    const conditionsResults = [
      this.checkBoundaryDrop(typedWindow),
      this.checkNewEdges(typedWindow),
      this.checkBehavioralChange(typedWindow, mutation ?? undefined),
      this.checkInvariantViolation(typedWindow)
    ];

    const conditionsMet = conditionsResults.filter(c => c.met).length;
    const shouldPropose = conditionsMet >= this.CONDITIONS_REQUIRED;

    if (shouldPropose) {
      const definingProperties = conditionsResults.filter(c => c.met).map(c => c.name);
      const boundaryEvidence = conditionsResults.filter(c => c.met).map(c => c.evidence);
      this.proposeEpochBoundary(mutationId, definingProperties, boundaryEvidence);
    }

    return {
      shouldPropose,
      conditionsResults,
      conditionsMet
    };
  }

  /**
   * Propose a new epoch boundary.
   * Creates an Epoch record with status 'proposed'.
   * Emits epoch.proposed event.
   */
  proposeEpochBoundary(
    mutationId: string,
    definingProperties: string[],
    boundaryEvidence: string[]
  ): Epoch {
    const epochId = this.generateEpochId();
    const epoch: Epoch = {
      epoch_id: epochId,
      name: `Epoch ${epochId}`,
      start_mutation_id: mutationId,
      defining_properties: definingProperties,
      boundary_evidence: boundaryEvidence,
      status: 'proposed',
      created_at: Date.now()
    };

    this.epochs.push(epoch);
    eventBus.emit('epoch.proposed', { epochId, mutationId });

    return epoch;
  }

  /**
   * Confirm a proposed epoch boundary (after human approval).
   */
  confirmEpoch(epochId: string): void {
    const epoch = this.epochs.find(e => e.epoch_id === epochId);
    if (!epoch) return;

    // Mark previous current epoch as confirmed
    const current = this.epochs.find(e => e.status === 'current');
    if (current) {
      current.status = 'confirmed';
      current.end_mutation_id = epoch.start_mutation_id;
    }

    epoch.status = 'current';
    eventBus.emit('epoch.confirmed', { epochId });
  }

  /**
   * Get the current (active) epoch.
   */
  getCurrentEpoch(): Epoch | undefined {
    return this.epochs.find(e => e.status === 'current') ?? this.epochs[this.epochs.length - 1];
  }

  private generateEpochId(): string {
    const id = `E-${1000 + this.nextEpochSequence}`;
    this.nextEpochSequence++;
    return id;
  }

  private checkBoundaryDrop(window: TrajectoryPoint[]): EpochConditionResult {
    const first = window[window.length - 1];
    const last = window[0];
    const drop = (first.boundary_integrity_score ?? 1) - (last.boundary_integrity_score ?? 1);
    const met = drop > this.BOUNDARY_DROP_THRESHOLD;

    return {
      name: 'Boundary Drop',
      met,
      evidence: met ? `Boundary integrity dropped by ${drop.toFixed(2)}` : 'Boundary integrity stable'
    };
  }

  private checkNewEdges(window: TrajectoryPoint[]): EpochConditionResult {
    const first = window[window.length - 1];
    const last = window[0];
    const newEdges = Math.floor(((last.coupling_score ?? 0) - (first.coupling_score ?? 0)) * 100);
    const met = newEdges >= this.NEW_EDGES_THRESHOLD;

    return {
      name: 'New Dependency Edges',
      met,
      evidence: met ? `${newEdges} new cross-component dependencies detected` : 'No significant new dependencies'
    };
  }

  private checkBehavioralChange(
    _window: TrajectoryPoint[],
    mutation?: Mutation
  ): EpochConditionResult {
    const met = mutation ? Math.abs(mutation.trajectory_delta.behaviorDelta) > 0.2 : false;
    return {
      name: 'Behavioral Change',
      met,
      evidence: met ? 'Behavioral shift observed in recent mutation' : 'No behavioral shift observed'
    };
  }

  private checkInvariantViolation(_window: TrajectoryPoint[]): EpochConditionResult {
    const invariants = invariantManager.getAllInvariants();
    const violated = invariants.some(inv => inv.status === 'VIOLATED');

    return {
      name: 'Invariant Violation',
      met: violated,
      evidence: violated ? 'One or more invariants transitioned to VIOLATED' : 'No invariant violations'
    };
  }
}

export const epochDetector = new EpochDetector();
