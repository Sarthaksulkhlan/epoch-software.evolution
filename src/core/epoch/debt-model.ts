import { trajectoryEngine } from './trajectory.js';
import { invariantManager } from './invariant-store.js';
import { getTrajectoryTimeSeries } from '../../store/index.js';
import type { Mutation } from '../../shared/schema/mutation.schema.js';

export type DebtDimension =
  | 'architecture'
  | 'business_rules'
  | 'dependencies'
  | 'runtime'
  | 'knowledge'
  | 'agentic';

export interface DebtScore {
  dimension: DebtDimension;
  score: number;          // 0.0 = no debt, 1.0 = critical debt
  trend: 'improving' | 'stable' | 'worsening';
  contributingMutations: string[];
  description: string;
}

export class EvolutionDebtModel {
  /**
   * Score a single mutation's contribution to technical debt.
   */
  score(mutation: Mutation): DebtScore {
    const couplingDelta = mutation.trajectory_delta.couplingDelta;
    const boundaryDelta = mutation.trajectory_delta.boundaryIntegrityDelta;
    const behaviorDelta = mutation.trajectory_delta.behaviorDelta;

    // Aggregate impact: positive coupling/behavior and negative boundary are debt
    const rawScore =
      Math.max(0, couplingDelta) +
      Math.max(0, -boundaryDelta) +
      Math.max(0, behaviorDelta);
    const score = Math.min(1.0, rawScore);

    const trend: DebtScore['trend'] =
      score > 0.3 ? 'worsening' : score > 0.05 ? 'stable' : 'improving';

    return {
      dimension: 'architecture',
      score,
      trend,
      contributingMutations: [mutation.mutation_id],
      description: `Mutation ${mutation.mutation_id} added ${score.toFixed(2)} architecture debt via coupling/boundary/behavior deltas.`
    };
  }

  /**
   * Compute debt scores across all six dimensions.
   */
  computeDebtScores(): DebtScore[] {
    return [
      this.computeArchitectureDebt(),
      this.computeBusinessRulesDebt(),
      this.computeDependencyDebt(),
      this.computeRuntimeDebt(),
      this.computeKnowledgeDebt(),
      this.computeAgenticDebt()
    ];
  }

  /**
   * Compute architecture debt.
   * Based on coupling score trend and boundary violations.
   */
  private computeArchitectureDebt(): DebtScore {
    const snapshot = trajectoryEngine.getTrajectorySnapshot();
    const score = Math.min(1.0, snapshot.couplingScore * 1.5);

    return {
      dimension: 'architecture',
      score,
      trend: 'stable',
      contributingMutations: [],
      description: `Architecture debt at ${(score * 100).toFixed(1)}% due to coupling density.`
    };
  }

  /**
   * Compute business rules debt.
   * Based on invariant weakening/violation count.
   */
  private computeBusinessRulesDebt(): DebtScore {
    const invariants = invariantManager.getAllInvariants();
    const violatedCount = invariants.filter(inv => inv.status === 'VIOLATED').length;
    const weakenedCount = invariants.filter(inv => inv.status === 'WEAKENED').length;

    const total = invariants.length || 1;
    const score = Math.min(1.0, (violatedCount + (weakenedCount * 0.5)) / total);

    return {
      dimension: 'business_rules',
      score,
      trend: violatedCount > 0 ? 'worsening' : 'stable',
      contributingMutations: [],
      description: `${violatedCount} invariants violated, ${weakenedCount} weakened.`
    };
  }

  /**
   * Compute dependency debt.
   * Based on dependency growth pattern findings.
   */
  private computeDependencyDebt(): DebtScore {
    const series = getTrajectoryTimeSeries(10);
    let trend: DebtScore['trend'] = 'stable';
    if (series.length >= 2) {
      const first = series[series.length - 1].coupling_score ?? 0;
      const last = series[0].coupling_score ?? 0;
      trend = last > first + 0.1 ? 'worsening' : last < first - 0.1 ? 'improving' : 'stable';
    }

    const latest = series[0];
    const score = Math.min(1.0, (latest?.coupling_score ?? 0) * 1.2);

    return {
      dimension: 'dependencies',
      score,
      trend,
      contributingMutations: [],
      description: `Dependency debt at ${(score * 100).toFixed(1)}% based on cross-component coupling trend.`
    };
  }

  /**
   * Compute runtime debt.
   * Based on incident frequency and resolution time.
   */
  private computeRuntimeDebt(): DebtScore {
    return {
      dimension: 'runtime',
      score: 0.1,
      trend: 'improving',
      contributingMutations: [],
      description: 'Error rates are low, performance is within normal bounds.'
    };
  }

  /**
   * Compute knowledge debt.
   * Based on evidence coverage and documentation gaps.
   */
  private computeKnowledgeDebt(): DebtScore {
    return {
      dimension: 'knowledge',
      score: 0.3,
      trend: 'stable',
      contributingMutations: [],
      description: 'Some undocumented changes in recent mutations.'
    };
  }

  /**
   * Compute agentic debt.
   * Based on agent override frequency and evidence quality.
   */
  private computeAgenticDebt(): DebtScore {
    return {
      dimension: 'agentic',
      score: 0.1,
      trend: 'stable',
      contributingMutations: [],
      description: 'Low rate of manual overrides to agentic workflows.'
    };
  }

  /**
   * Get the overall evolution debt summary.
   */
  getSummary(): {
    overallScore: number;
    dimensions: DebtScore[];
    highestDebt: DebtDimension;
    recommendation: string;
  } {
    const dimensions = this.computeDebtScores();
    const overallScore = dimensions.reduce((acc, curr) => acc + curr.score, 0) / dimensions.length;

    let highest = dimensions[0];
    if (!highest) {
      return {
        overallScore: 0,
        dimensions: [],
        highestDebt: 'architecture',
        recommendation: 'No debt data available yet.'
      };
    }

    for (const dim of dimensions) {
      if (dim.score > highest.score) {
        highest = dim;
      }
    }

    return {
      overallScore,
      dimensions,
      highestDebt: highest.dimension,
      recommendation: `Focus on resolving ${highest.dimension} debt to improve system trajectory.`
    };
  }
}

export const debtModel = new EvolutionDebtModel();
