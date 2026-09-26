import type { MutationGraph } from '../mutations/mutation-graph.js';
import type { DriftDetector, DriftReport } from './types.js';
import * as store from '../../store/index.js';

export class SemanticDriftDetector implements DriftDetector {
  readonly name = 'semantic_drift';

  private readonly WINDOW_SIZE = 10;
  private readonly WARNING_THRESHOLD = 0.55;
  private readonly CRITICAL_THRESHOLD = 0.75;

  detect(graph: MutationGraph): DriftReport {
    const nodes = graph.getNodes().slice(-this.WINDOW_SIZE);
    const detectedAt = Date.now();

    if (nodes.length < 3) {
      return this.emptyReport(detectedAt);
    }

    const recentIntents = nodes.map(m => m.intent.toLowerCase());
    const vocabulary = this.extractVocabulary(recentIntents);
    const baselineVectors = recentIntents.slice(0, Math.floor(recentIntents.length / 2)).map(i => this.vectorize(i, vocabulary));
    const currentVectors = recentIntents.slice(Math.floor(recentIntents.length / 2)).map(i => this.vectorize(i, vocabulary));

    const baselineCentroid = this.centroid(baselineVectors);
    const currentCentroid = this.centroid(currentVectors);
    const distance = this.cosineDistance(baselineCentroid, currentCentroid);

    const driftDetected = distance > this.WARNING_THRESHOLD;
    const severity: DriftReport['severity'] =
      distance > this.CRITICAL_THRESHOLD ? 'critical' : distance > this.WARNING_THRESHOLD ? 'warning' : 'info';

    const affectedComponents = Array.from(
      new Set(nodes.flatMap(m => m.affected_components))
    );

    return {
      detector: this.name,
      driftDetected,
      severity,
      score: distance,
      threshold: this.WARNING_THRESHOLD,
      description: driftDetected
        ? `Mutation intent vocabulary shifted by ${(distance * 100).toFixed(1)}% in the last ${nodes.length} mutations.`
        : `Mutation intent vocabulary remains coherent across the last ${nodes.length} mutations.`,
      affectedComponents,
      evidenceMutationIds: nodes.map(m => m.mutation_id),
      recommendedAction: driftDetected
        ? 'Review recent requirements for scope creep or conflicting intent.'
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
      threshold: this.WARNING_THRESHOLD,
      description: 'Insufficient mutation history to assess semantic drift.',
      affectedComponents: [],
      evidenceMutationIds: [],
      recommendedAction: 'Collect more mutations before running semantic drift analysis.',
      detectedAt
    };
  }

  private extractVocabulary(intents: string[]): string[] {
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'to', 'of', 'in', 'for', 'with', 'on', 'from']);
    const words = new Set<string>();
    for (const intent of intents) {
      for (const word of intent.split(/\W+/).filter(w => w.length > 2 && !stopWords.has(w))) {
        words.add(word);
      }
    }
    return Array.from(words);
  }

  private vectorize(intent: string, vocabulary: string[]): number[] {
    const tokens = intent.split(/\W+/);
    return vocabulary.map(word => tokens.filter(t => t === word).length);
  }

  private centroid(vectors: number[][]): number[] {
    if (vectors.length === 0) return [];
    const dim = vectors[0].length;
    const result = new Array(dim).fill(0);
    for (const v of vectors) {
      for (let i = 0; i < dim; i++) {
        result[i] += v[i];
      }
    }
    return result.map(sum => sum / vectors.length);
  }

  private cosineDistance(a: number[], b: number[]): number {
    if (a.length === 0 || b.length === 0) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    const similarity = dot / (Math.sqrt(normA) * Math.sqrt(normB));
    return 1 - similarity;
  }
}

export const semanticDriftDetector = new SemanticDriftDetector();
