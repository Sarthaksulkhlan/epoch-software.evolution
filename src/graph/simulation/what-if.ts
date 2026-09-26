import { nanoid } from 'nanoid';
import * as store from '../../store/index.js';
import { branchManager } from '../../sandbox/branch-manager.js';
import type { Scenario } from '../../shared/schema/simulation.schema.js';
import type { TrajectoryDelta } from '../../shared/schema/mutation.schema.js';

export interface SimulationResult {
  simulationId: string;
  baseMutationId: string;
  branchName: string;
  hypothesis: string;
  projectedDelta: TrajectoryDelta;
  projectedCouplingScore: number;
  projectedBoundaryIntegrityScore: number;
  projectedTestPassRate: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendation: 'proceed' | 'revise' | 'reject';
  reasoning: string;
  createdAt: number;
}

export interface WhatIfScenario {
  baseMutationId: string;
  hypothesis: string;
  changes: string[];
  expectedCouplingDelta?: number;
  expectedBoundaryDelta?: number;
  expectedBehaviorDelta?: number;
}

export class WhatIfSimulator {
  /**
   * Run a lightweight counterfactual simulation for a proposed scenario.
   * Creates a sandbox branch and projects the trajectory delta without
   * mutating the main history.
   */
  simulate(scenario: WhatIfScenario): SimulationResult {
    const simulationId = nanoid();
    const branchName = `what-if/${simulationId}`;
    const createdAt = Date.now();

    const baseMutation = store.getMutation(scenario.baseMutationId);
    if (!baseMutation) {
      throw new Error(`Base mutation ${scenario.baseMutationId} not found`);
    }

    // Create an isolated sandbox branch for the counterfactual
    try {
      branchManager.createBranch(branchName);
    } catch {
      // Branch may already exist or sandbox is unavailable; continue with projection
    }

    const latestPoint = store.getLatestTrajectoryPoint();
    const baseCoupling = latestPoint?.coupling_score ?? 0.5;
    const baseBoundary = latestPoint?.boundary_integrity_score ?? 0.5;

    const projectedDelta: TrajectoryDelta = {
      couplingDelta: scenario.expectedCouplingDelta ?? this.estimateCouplingDelta(scenario.changes),
      boundaryIntegrityDelta: scenario.expectedBoundaryDelta ?? this.estimateBoundaryDelta(scenario.changes),
      behaviorDelta: scenario.expectedBehaviorDelta ?? this.estimateBehaviorDelta(scenario.changes),
      invariantChanges: []
    };

    const projectedCouplingScore = Math.max(0, Math.min(1, baseCoupling + projectedDelta.couplingDelta));
    const projectedBoundaryIntegrityScore = Math.max(0, Math.min(1, baseBoundary + projectedDelta.boundaryIntegrityDelta));

    // Heuristic test pass rate: boundary-positive and low-coupling changes score higher
    const structuralPenalty = Math.abs(projectedDelta.couplingDelta) + Math.abs(projectedDelta.boundaryIntegrityDelta);
    const projectedTestPassRate = Math.max(0, Math.min(1, 0.95 - structuralPenalty));

    const riskLevel = this.assessRisk(projectedDelta, projectedTestPassRate);
    const recommendation = this.recommend(riskLevel);

    return {
      simulationId,
      baseMutationId: scenario.baseMutationId,
      branchName,
      hypothesis: scenario.hypothesis,
      projectedDelta,
      projectedCouplingScore,
      projectedBoundaryIntegrityScore,
      projectedTestPassRate,
      riskLevel,
      recommendation,
      reasoning: this.buildReasoning(projectedDelta, projectedTestPassRate, riskLevel),
      createdAt
    };
  }

  private estimateCouplingDelta(changes: string[]): number {
    const couplingTerms = ['shared', 'coupling', 'dependency', 'import', 'interface', 'api'];
    const matches = changes.filter(c => couplingTerms.some(term => c.toLowerCase().includes(term))).length;
    return Math.min(0.4, matches * 0.08);
  }

  private estimateBoundaryDelta(changes: string[]): number {
    const boundaryTerms = ['boundary', 'encapsulation', 'module', 'service', 'layer', 'isolation'];
    const weakeningTerms = ['bypass', 'direct access', 'internal', 'leak', 'expose'];
    const strengthening = changes.filter(c => boundaryTerms.some(term => c.toLowerCase().includes(term))).length;
    const weakening = changes.filter(c => weakeningTerms.some(term => c.toLowerCase().includes(term))).length;
    return (strengthening - weakening) * 0.08;
  }

  private estimateBehaviorDelta(changes: string[]): number {
    const behaviorTerms = ['behavior', 'logic', 'rule', 'flow', 'state', 'condition'];
    const matches = changes.filter(c => behaviorTerms.some(term => c.toLowerCase().includes(term))).length;
    return Math.min(0.4, matches * 0.06);
  }

  private assessRisk(delta: TrajectoryDelta, testPassRate: number): SimulationResult['riskLevel'] {
    const structuralRisk = Math.abs(delta.couplingDelta) + Math.abs(delta.boundaryIntegrityDelta) + Math.abs(delta.behaviorDelta);
    if (structuralRisk > 0.4 || testPassRate < 0.7) return 'high';
    if (structuralRisk > 0.2 || testPassRate < 0.85) return 'medium';
    return 'low';
  }

  private recommend(riskLevel: SimulationResult['riskLevel']): SimulationResult['recommendation'] {
    switch (riskLevel) {
      case 'low':
        return 'proceed';
      case 'medium':
        return 'revise';
      case 'high':
        return 'reject';
    }
  }

  private buildReasoning(delta: TrajectoryDelta, testPassRate: number, riskLevel: SimulationResult['riskLevel']): string {
    return [
      `Projected coupling delta: ${delta.couplingDelta.toFixed(3)}.`,
      `Projected boundary delta: ${delta.boundaryIntegrityDelta.toFixed(3)}.`,
      `Projected behavior delta: ${delta.behaviorDelta.toFixed(3)}.`,
      `Estimated test pass rate: ${(testPassRate * 100).toFixed(1)}%.`,
      `Overall risk level: ${riskLevel}.`
    ].join(' ');
  }
}

export const whatIfSimulator = new WhatIfSimulator();
