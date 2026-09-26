import { mutations, trajectory } from '../../store/index.js';
import type { Mutation } from '../../shared/schema/mutation.schema.js';
import type { TrajectoryPoint } from '../../shared/schema/trajectory-point.schema.js';
import { diffScans, type ScanDiff } from '../../graph/scanner/diff.js';
import type { ScanResult } from '../../graph/scanner/scanner.js';

export interface HistoryEntry {
  mutation: Mutation;
  point: TrajectoryPoint;
  scan: ScanResult;
  /** Difference from the previous entry's scan. The first entry is the baseline and shows no change. */
  diff: ScanDiff;
}

/** Recorded mutations with their scans in chronological order. */
export function loadHistory(): HistoryEntry[] {
  const points = trajectory.listTrajectoryPoints();
  const entries: HistoryEntry[] = [];
  let previous: ScanResult | undefined;
  for (const point of points) {
    const mutation = mutations.getMutation(point.mutation_id);
    const scan = trajectory.getScanForMutation(point.mutation_id) as ScanResult | undefined;
    if (!mutation || !scan) continue;
    entries.push({ mutation, point, scan, diff: diffScans(previous ?? scan, scan) });
    previous = scan;
  }
  return entries;
}

export function sequenceOf(mutationId: string): number {
  const match = /^M-(\d+)$/.exec(mutationId);
  return match?.[1] ? Number.parseInt(match[1], 10) : 0;
}
