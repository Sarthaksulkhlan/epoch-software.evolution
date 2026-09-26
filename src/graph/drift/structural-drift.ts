import type { MutationGraph } from '../mutations/mutation-graph.js';
import type { DriftDetector, DriftReport } from './types.js';
import * as store from '../../store/index.js';

export class StructuralDriftDetector implements DriftDetector {
  readonly name = 'structural_drift';

  private readonly COUPLING_WARNING_THRESHOLD = 0.15;
  private readonly COUPLING_CRITICAL_THRESHOLD = 0.30;
  private readonly BOUNDARY_WARNING_THRESHOLD = -0.15;
  private readonly BOUNDARY_CRITICAL_THRESHOLD = -0.30;

  detect(graph: MutationGraph): DriftReport {
    const nodes = graph.getNodes();
    const detectedAt = Date.now();

    if (nodes.length < 2) {
      return this.emptyReport(detectedAt);
    }

    const deltas = nodes.map(m => m.trajectory_delta);
    const avgCouplingDelta = this.average(deltas.map(d => d.couplingDelta));
    const avgBoundaryDelta = this.average(deltas.map(d => d.boundaryIntegrityDelta));

    const couplingScore = Math.max(0, avgCouplingDelta);
    const boundaryScore = Math.max(0, -avgBoundaryDelta);
    const structuralScore = Math.min(1, couplingScore + boundaryScore);

    const driftDetected =
      avgCouplingDelta > this.COUPLING_WARNING_THRESHOLD ||
      avgBoundaryDelta < this.BOUNDARY_WARNING_THRESHOLD;

    const severity: DriftReport['severity'] =
      avgCouplingDelta > this.COUPLING_CRITICAL_THRESHOLD ||
      avgBoundaryDelta < this.BOUNDARY_CRITICAL_THRESHOLD
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
      score: structuralScore,
      threshold: this.COUPLING_WARNING_THRESHOLD,
      description: driftDetected
        ? `Structural drift detected: avg coupling delta ${avgCouplingDelta.toFixed(3)}, avg boundary delta ${avgBoundaryDelta.toFixed(3)}.`
        : 'Structural metrics remain within acceptable bounds.',
      affectedComponents,
      evidenceMutationIds: nodes.map(m => m.mutation_id),
      recommendedAction: driftDetected
        ? 'Refactor high-coupling changes and restore boundary integrity.'
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
      threshold: this.COUPLING_WARNING_THRESHOLD,
      description: 'Insufficient mutation history to assess structural drift.',
      affectedComponents: [],
      evidenceMutationIds: [],
      recommendedAction: 'Collect more mutations before running structural drift analysis.',
      detectedAt
    };
  }

  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
}

export const structuralDriftDetector = new StructuralDriftDetector();
