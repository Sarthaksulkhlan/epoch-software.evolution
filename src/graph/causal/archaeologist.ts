import type { Mutation } from '../../shared/schema/mutation.schema.js';
import * as store from '../../store/index.js';

export interface CausalCandidate {
  mutationId: string;
  depth: number;
  score: number;
  reasoning: string;
  evidenceStatus: 'hypothesised' | 'inferred';
}

export interface CausalChain {
  symptom: string;
  affectedComponent: string;
  candidates: CausalCandidate[];
  earliestPlausible: CausalCandidate | null;
  traversalDepth: number;
  totalNodesExamined: number;
}

export class CausalArchaeologist {
  private readonly MAX_DEPTH = 10;
  private readonly TEMPORAL_WEIGHT = 0.3;
  private readonly STRUCTURAL_WEIGHT = 0.3;
  private readonly INTENT_MISMATCH_WEIGHT = 0.2;
  private readonly INCIDENT_CORRELATION_WEIGHT = 0.2;

  /**
   * Walk backward from a mutation to find the most plausible root cause
   * in the FOLLOWS chain.
   */
  findRootCause(mutationId: string): CausalChain {
    const startMutation = store.getMutation(mutationId);
    if (!startMutation) {
      return {
        symptom: mutationId,
        affectedComponent: '',
        candidates: [],
        earliestPlausible: null,
        traversalDepth: 0,
        totalNodesExamined: 0
      };
    }

    const affectedComponent = startMutation.affected_components[0] ?? '';
    const candidates: CausalCandidate[] = [];
    const queue: Array<{ id: string; depth: number }> = [{ id: mutationId, depth: 0 }];
    const visited = new Set<string>();
    let totalNodesExamined = 0;

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.depth > this.MAX_DEPTH || visited.has(current.id)) continue;
      visited.add(current.id);
      totalNodesExamined++;

      const mutation = store.getMutation(current.id);
      if (mutation) {
        const score = this.scoreMutation(mutation, affectedComponent, current.depth, this.MAX_DEPTH);
        candidates.push({
          mutationId: current.id,
          depth: current.depth,
          score,
          reasoning: `Found at depth ${current.depth} affecting component ${affectedComponent || 'unknown'}`,
          evidenceStatus: 'hypothesised'
        });
      }

      const edges = store.graphEdges.getEdgesTo(current.id, 'FOLLOWS');
      for (const edge of edges) {
        queue.push({ id: edge.from_id, depth: current.depth + 1 });
      }
    }

    candidates.sort((a, b) => b.score - a.score);

    return {
      symptom: `Root cause analysis for ${mutationId}`,
      affectedComponent,
      candidates,
      earliestPlausible: candidates.length > 0 ? candidates[candidates.length - 1] : null,
      traversalDepth: Math.max(...candidates.map(c => c.depth), 0),
      totalNodesExamined
    };
  }

  /**
   * Trace a causal chain from a symptom and affected component.
   */
  traceCausalChain(symptom: string, affectedComponent: string): CausalChain {
    const startEdges = store.graphEdges.getEdgesTo(affectedComponent, 'TOUCHES');
    if (startEdges.length === 0) {
      return {
        symptom,
        affectedComponent,
        candidates: [],
        earliestPlausible: null,
        traversalDepth: 0,
        totalNodesExamined: 0
      };
    }

    const startMutationId = startEdges[0].from_id;
    const chain = this.findRootCause(startMutationId);
    chain.symptom = symptom;
    chain.affectedComponent = affectedComponent;
    return chain;
  }

  private scoreMutation(
    mutation: Mutation,
    affectedComponent: string,
    depth: number,
    maxDepth: number
  ): number {
    const temporal = this.temporalScore(depth, maxDepth);
    const structural = this.structuralScore(mutation, affectedComponent);
    const intentMismatch = this.intentMismatchScore(mutation);
    const incidentCorrelation = this.incidentCorrelationScore(mutation);

    return (
      temporal * this.TEMPORAL_WEIGHT +
      structural * this.STRUCTURAL_WEIGHT +
      intentMismatch * this.INTENT_MISMATCH_WEIGHT +
      incidentCorrelation * this.INCIDENT_CORRELATION_WEIGHT
    );
  }

  private temporalScore(depth: number, maxDepth: number): number {
    return 1 - depth / maxDepth;
  }

  private structuralScore(mutation: Mutation, affectedComponent: string): number {
    const edges = store.graphEdges.getEdgesFrom(mutation.mutation_id);
    const touches = edges.some(e => e.relationship === 'TOUCHES' && e.to_id === affectedComponent);
    return touches ? 1.0 : 0.5;
  }

  private intentMismatchScore(mutation: Mutation): number {
    const intent = mutation.intent.toLowerCase();
    const riskyTerms = ['bypass', 'workaround', 'temporary', 'quick fix', 'hotfix'];
    return riskyTerms.some(term => intent.includes(term)) ? 0.9 : 0.5;
  }

  private incidentCorrelationScore(mutation: Mutation): number {
    const edges = store.graphEdges.getEdgesFrom(mutation.mutation_id);
    return edges.some(e => e.relationship === 'CAUSED_BY') ? 1.0 : 0.5;
  }
}

export const causalArchaeologist = new CausalArchaeologist();
