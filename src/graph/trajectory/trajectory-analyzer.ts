import * as store from '../../store/index.js';
import type { TrajectoryPoint as SchemaTrajectoryPoint } from '../../shared/schema/trajectory-point.schema.js';

export interface TrendProjection {
  couplingTrend: 'improving' | 'stable' | 'worsening';
  boundaryTrend: 'improving' | 'stable' | 'worsening';
  driftTrend: 'improving' | 'stable' | 'worsening';
  projectedCoupling: number;
  projectedBoundaryIntegrity: number;
  projectedDriftDelta: number;
  confidence: number;
}

export interface VelocityReading {
  mutationVelocity: number; // mutations per day
  couplingVelocity: number;
  boundaryIntegrityVelocity: number;
  driftVelocity: number;
  windowStart: number;
  windowEnd: number;
}

export interface InflectionPoint {
  mutationId: string;
  timestamp: number;
  type: 'coupling_spike' | 'boundary_drop' | 'drift_surge' | 'epoch_shift';
  magnitude: number;
  description: string;
}

export class TrajectoryAnalyzer {
  /**
   * Project the next trajectory point from a linear regression over the
   * most recent window of recorded points.
   */
  projectTrend(windowSize = 10): TrendProjection {
    const series = this.getNormalizedSeries(windowSize);

    if (series.length < 2) {
      return {
        couplingTrend: 'stable',
        boundaryTrend: 'stable',
        driftTrend: 'stable',
        projectedCoupling: series[0]?.coupling_score ?? 0.5,
        projectedBoundaryIntegrity: series[0]?.boundary_integrity_score ?? 0.5,
        projectedDriftDelta: series[0]?.drift_delta ?? 0,
        confidence: series.length === 1 ? 0.3 : 0
      };
    }

    const coupling = this.linearRegression(series.map((p, i) => ({ x: i, y: p.coupling_score })));
    const boundary = this.linearRegression(series.map((p, i) => ({ x: i, y: p.boundary_integrity_score })));
    const drift = this.linearRegression(series.map((p, i) => ({ x: i, y: p.drift_delta })));

    const nextIndex = series.length;

    return {
      couplingTrend: this.classifyTrend(coupling.slope, 0.005),
      boundaryTrend: this.classifyTrend(-boundary.slope, 0.005), // higher boundary is better
      driftTrend: this.classifyTrend(drift.slope, 0.005),
      projectedCoupling: Math.max(0, Math.min(1, coupling.intercept + coupling.slope * nextIndex)),
      projectedBoundaryIntegrity: Math.max(0, Math.min(1, boundary.intercept + boundary.slope * nextIndex)),
      projectedDriftDelta: drift.intercept + drift.slope * nextIndex,
      confidence: this.projectionConfidence(series.length)
    };
  }

  /**
   * Compute per-day velocity of mutations and trajectory deltas over the
   * requested window.
   */
  computeVelocity(windowSize = 10): VelocityReading {
    const series = this.getNormalizedSeries(windowSize);
    const mutations = store.getAllMutations().slice(-windowSize);

    if (series.length < 2 || mutations.length < 2) {
      return {
        mutationVelocity: 0,
        couplingVelocity: 0,
        boundaryIntegrityVelocity: 0,
        driftVelocity: 0,
        windowStart: series[0]?.timestamp ?? Date.now(),
        windowEnd: series[series.length - 1]?.timestamp ?? Date.now()
      };
    }

    const windowStart = series[0].timestamp;
    const windowEnd = series[series.length - 1].timestamp;
    const days = Math.max(1, (windowEnd - windowStart) / (1000 * 60 * 60 * 24));

    const first = series[0];
    const last = series[series.length - 1];

    return {
      mutationVelocity: mutations.length / days,
      couplingVelocity: (last.coupling_score - first.coupling_score) / days,
      boundaryIntegrityVelocity: (last.boundary_integrity_score - first.boundary_integrity_score) / days,
      driftVelocity: (last.drift_delta - first.drift_delta) / days,
      windowStart,
      windowEnd
    };
  }

  /**
   * Detect inflection points where a trajectory metric crosses a threshold
   * relative to the rolling mean.
   */
  detectInflection(windowSize = 10): InflectionPoint[] {
    const series = this.getNormalizedSeries(windowSize);
    const inflections: InflectionPoint[] = [];

    if (series.length < 3) return inflections;

    for (let i = 1; i < series.length; i++) {
      const prev = series[i - 1];
      const curr = series[i];
      const couplingDelta = curr.coupling_score - prev.coupling_score;
      const boundaryDelta = curr.boundary_integrity_score - prev.boundary_integrity_score;
      const driftDelta = curr.drift_delta - prev.drift_delta;

      if (couplingDelta > 0.15) {
        inflections.push({
          mutationId: curr.mutation_id,
          timestamp: curr.timestamp,
          type: 'coupling_spike',
          magnitude: couplingDelta,
          description: `Coupling score jumped by ${(couplingDelta * 100).toFixed(1)}%`
        });
      }

      if (boundaryDelta < -0.15) {
        inflections.push({
          mutationId: curr.mutation_id,
          timestamp: curr.timestamp,
          type: 'boundary_drop',
          magnitude: Math.abs(boundaryDelta),
          description: `Boundary integrity dropped by ${(Math.abs(boundaryDelta) * 100).toFixed(1)}%`
        });
      }

      if (driftDelta > 0.15) {
        inflections.push({
          mutationId: curr.mutation_id,
          timestamp: curr.timestamp,
          type: 'drift_surge',
          magnitude: driftDelta,
          description: `Drift delta surged by ${(driftDelta * 100).toFixed(1)}%`
        });
      }

      if (curr.epoch_id !== prev.epoch_id) {
        inflections.push({
          mutationId: curr.mutation_id,
          timestamp: curr.timestamp,
          type: 'epoch_shift',
          magnitude: 1,
          description: `Epoch boundary crossed from ${prev.epoch_id} to ${curr.epoch_id}`
        });
      }
    }

    return inflections;
  }

  private getNormalizedSeries(windowSize: number): SchemaTrajectoryPoint[] {
    const points = store.getTrajectoryTimeSeries(windowSize);
    return points
      .filter((p): p is SchemaTrajectoryPoint => p !== null && p !== undefined)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  private linearRegression(points: Array<{ x: number; y: number | null }>): { slope: number; intercept: number } {
    const valid = points.filter(p => p.y !== null) as Array<{ x: number; y: number }>;
    const n = valid.length;
    if (n === 0) return { slope: 0, intercept: 0 };
    if (n === 1) return { slope: 0, intercept: valid[0].y };

    const sumX = valid.reduce((acc, p) => acc + p.x, 0);
    const sumY = valid.reduce((acc, p) => acc + p.y, 0);
    const sumXY = valid.reduce((acc, p) => acc + p.x * p.y, 0);
    const sumXX = valid.reduce((acc, p) => acc + p.x * p.x, 0);

    const denominator = n * sumXX - sumX * sumX;
    if (denominator === 0) return { slope: 0, intercept: sumY / n };

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  private classifyTrend(slope: number, threshold: number): TrendProjection['couplingTrend'] {
    if (slope > threshold) return 'worsening';
    if (slope < -threshold) return 'improving';
    return 'stable';
  }

  private projectionConfidence(sampleSize: number): number {
    return Math.min(0.95, 0.3 + sampleSize * 0.06);
  }
}

export const trajectoryAnalyzer = new TrajectoryAnalyzer();
