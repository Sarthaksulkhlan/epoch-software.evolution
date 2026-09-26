import type { MutationGraph } from '../mutations/mutation-graph.js';

export interface DriftReport {
  detector: string;
  driftDetected: boolean;
  severity: 'info' | 'warning' | 'critical';
  score: number; // 0.0 - 1.0
  threshold: number;
  description: string;
  affectedComponents: string[];
  evidenceMutationIds: string[];
  recommendedAction: string;
  detectedAt: number;
}

export interface DriftDetector {
  detect(graph: MutationGraph): DriftReport;
}
