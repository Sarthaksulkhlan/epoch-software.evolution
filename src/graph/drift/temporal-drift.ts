import type { MutationGraph } from '../mutations/mutation-graph.js';
import type { DriftDetector, DriftReport } from './types.js';
import * as store from '../../store/index.js';

export class TemporalDriftDetector implements DriftDetector {
  readonly name = 'temporal_drift';

  private readonly WINDOW_SIZE = 10;
  private readonly RATE_WARNING_THRESHOLD = 2.0; // 2x acceleration
  private readonly RATE_CRITICAL_THRESHOLD = 3.0;
  private readonly DELTA_ACCEL_WARNING = 1.5;

  detect(graph: MutationGraph): DriftReport {
    const nodes = graph.getNodes().slice(-this.WINDOW_SIZE);
    const detectedAt = Date.now();

    if (nodes.length < 4) {
      return this.emptyReport(detectedAt);
    }

    const midPoint = Math.floor(nodes.length / 2);
    const firstHalf = nodes.slice(0, midPoint);
    const secondHalf = nodes.slice(midPoint);

    const firstRate = this.mutationRate(firstHalf);
    const secondRate = this.mutationRate(secondHalf);
    const rateRatio = firstRate > 0 ? secondRate / firstRate : 0;

    const firstDeltaMag = this.avgDeltaMagnitude(firstHalf);
    const secondDeltaMag = this.avgDeltaMagnitude(secondHalf);
    const deltaRatio = firstDeltaMag > 0 ? secondDeltaMag / firstDeltaMag : 0;

    const score = Math.min(1, Math.max(rateRatio - 1, deltaRatio - 1, 0));
    const driftDetected = rateRatio > this.RATE_WARNING_THRESHOLD || deltaRatio > this.DELTA_ACCEL_WARNING;

    const severity: DriftReport['severity'] =
      rateRatio > this.RATE_CRITICAL_THRESHOLD || deltaRatio > this.RATE_CRITICAL_THRESHOLD
        ? 'critical'
        : driftDetected
          ? 'warning'
          : 'info';

    const affectedComponents = Array.from(
      new Set(nodes.flatMap(m => m.affected_components))
    );

    return {
      detector: this.name,
      driftDetected,
      severity,
      score,
      threshold: this.RATE_WARNING_THRESHOLD - 1,
      description: driftDetected
        ? `Temporal drift detected: mutation rate ratio ${rateRatio.toFixed(2)}x, delta magnitude ratio ${deltaRatio.toFixed(2)}x.`
        : 'Mutation cadence and delta magnitude remain stable.',
      affectedComponents,
      evidenceMutationIds: nodes.map(m => m.mutation_id),
      recommendedAction: driftDetected
        ? 'Investigate whether recent acceleration is intentional or indicates uncontrolled churn.'
        : 'No action required.',
      detectedAt
    };
  }

  private emptyReport(detectedAt: number): DriftReport {
    return {
      detector: this.name,
      driftDetected: false,
      severity: 'info',
      score: 0,
      threshold: this.RATE_WARNING_THRESHOLD - 1,
      description: 'Insufficient mutation history to assess temporal drift.',
      affectedComponents: [],
      evidenceMutationIds: [],
      recommendedAction: 'Collect more mutations before running temporal drift analysis.',
      detectedAt
    };
  }

  private mutationRate(mutations: Array<{ created_at: number }>): number {
    if (mutations.length < 2) return 0;
    const spanMs = mutations[mutations.length - 1].created_at - mutations[0].created_at;
    const spanDays = Math.max(1, spanMs / (1000 * 60 * 60 * 24));
    return mutations.length / spanDays;
  }

  private avgDeltaMagnitude(mutations: Array<{ trajectory_delta: { couplingDelta: number; boundaryIntegrityDelta: number; behaviorDelta: number } }>): number {
    if (mutations.length === 0) return 0;
    const sum = mutations.reduce((acc, m) => {
      const d = m.trajectory_delta;
      return acc + Math.abs(d.couplingDelta) + Math.abs(d.boundaryIntegrityDelta) + Math.abs(d.behaviorDelta);
    }, 0);
    return sum / mutations.length;
  }
}

export const temporalDriftDetector = new TemporalDriftDetector();
