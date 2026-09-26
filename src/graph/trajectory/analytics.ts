import { trajectory } from '../../store/index.js';
import type { TrajectoryPoint } from '../../shared/schema/trajectory-point.schema.js';

export interface Velocity {
  window: number;
  couplingPerMutation: number;
  boundaryIntegrityPerMutation: number;
  evidenceStatus: 'observed';
}

export interface Inflection {
  mutationId: string;
  driftDelta: number;
  couplingScore: number;
  boundaryIntegrityScore: number;
}

export interface Projection {
  horizon: number;
  projectedBoundaryIntegrity: number;
  projectedCoupling: number;
  statement: string;
  evidenceStatus: 'inferred';
}

/** Average change per mutation over the last `window` points (observed). */
export function velocity(window = 5): Velocity {
  const points = trajectory.listTrajectoryPoints({ limit: window });
  return {
    window: points.length,
    couplingPerMutation: slope(points, p => p.coupling_score),
    boundaryIntegrityPerMutation: slope(points, p => p.boundary_integrity_score),
    evidenceStatus: 'observed'
  };
}

/** Points where the drift delta moved by more than `threshold` (observed). */
export function inflections(threshold = 0.05): Inflection[] {
  return trajectory.listTrajectoryPoints()
    .filter(p => Math.abs(p.drift_delta) > threshold)
    .map(p => ({ mutationId: p.mutation_id, driftDelta: p.drift_delta, couplingScore: p.coupling_score, boundaryIntegrityScore: p.boundary_integrity_score }));
}

/** Linear extrapolation of the recent velocity. A projection, labelled inferred. */
export function project(horizon = 5, window = 5): Projection {
  const points = trajectory.listTrajectoryPoints({ limit: window });
  const last = points.at(-1);
  const v = velocity(window);
  const bi = clamp((last?.boundary_integrity_score ?? 1) + v.boundaryIntegrityPerMutation * horizon);
  const coupling = clamp((last?.coupling_score ?? 0) + v.couplingPerMutation * horizon);
  return {
    horizon,
    projectedBoundaryIntegrity: bi,
    projectedCoupling: coupling,
    statement: `If the last ${v.window} mutations are representative, boundary integrity would be ${bi.toFixed(2)} and coupling ${coupling.toFixed(2)} after ${horizon} more mutations.`,
    evidenceStatus: 'inferred'
  };
}

function slope(points: TrajectoryPoint[], value: (p: TrajectoryPoint) => number): number {
  if (points.length < 2) return 0;
  const first = points[0]!;
  const last = points.at(-1)!;
  return Math.round(((value(last) - value(first)) / (points.length - 1)) * 10_000) / 10_000;
}

function clamp(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;
}
