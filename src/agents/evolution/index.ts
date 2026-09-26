import type { Agent, AgentContext, AgentResult } from '../contracts.js';
import { createEvidence } from '../contracts.js';
import { getTrajectoryTimeSeries, queryInvariants } from '../../store/index.js';

export class EvolutionAnalystAgent implements Agent {
  readonly name = 'evolution-analyst';

  async run(ctx: AgentContext): Promise<AgentResult> {
    const evidence = [];
    const ref = `agent-analysis:evolution-analyst:${ctx.taskId}`;
    const prior = ctx.contextBundle.prior_mutations;
    const trajectory = getTrajectoryTimeSeries(10);

    if (trajectory.length >= 2) {
      const first = trajectory[0];
      const last = trajectory[trajectory.length - 1];
      evidence.push(createEvidence(ctx,
        `Boundary integrity moved from ${first.boundary_integrity_score} to ${last.boundary_integrity_score} over ${trajectory.length} trajectory points.`,
        'observed',
        ref
      ));
      evidence.push(createEvidence(ctx,
        `Coupling score moved from ${first.coupling_score} to ${last.coupling_score} over ${trajectory.length} trajectory points.`,
        'observed',
        ref
      ));
    } else {
      evidence.push(createEvidence(ctx,
        'Insufficient trajectory history to compute trends.',
        'observed',
        ref
      ));
    }

    const weakened = queryInvariants({ status: 'WEAKENED' });
    if (weakened.length > 0) {
      for (const inv of weakened.slice(0, 3)) {
        evidence.push(createEvidence(ctx,
          `Invariant ${inv.invariant_id} is currently weakened: ${inv.statement}`,
          'observed',
          ref,
          'medium'
        ));
      }
    }

    if (prior.length > 0) {
      const lastMutation = prior[prior.length - 1];
      evidence.push(createEvidence(ctx,
        `Latest prior mutation ${lastMutation.mutation_id} touched: ${lastMutation.affected_components.join(', ')}.`,
        'observed',
        ref
      ));
    }

    const highCoupling = trajectory.length > 0 && trajectory[trajectory.length - 1].coupling_score > 0.8;
    if (highCoupling) {
      evidence.push(createEvidence(ctx,
        'System may be approaching an epoch boundary due to high coupling.',
        'inferred',
        ref,
        'high'
      ));
    }

    return {
      agentName: this.name,
      evidence,
      summary: `Evolution analyst evaluated ${prior.length} prior mutation(s) and ${trajectory.length} trajectory point(s).`,
      riskLevel: highCoupling ? 'high' : weakened.length > 0 ? 'medium' : 'low'
    };
  }
}

export const evolutionAnalystAgent = new EvolutionAnalystAgent();
