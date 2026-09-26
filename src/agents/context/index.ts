import type { Agent, AgentContext, AgentResult } from '../contracts.js';
import { createEvidence } from '../contracts.js';

export class ContextAgent implements Agent {
  readonly name = 'context';

  async run(ctx: AgentContext): Promise<AgentResult> {
    const evidence = [];
    const ref = `agent-analysis:context:${ctx.taskId}`;
    const reqs = ctx.contextBundle.requirements;

    if (reqs.length === 0) {
      evidence.push(createEvidence(ctx,
        'No requirements structure found in context bundle.',
        'observed',
        ref
      ));
      return {
        agentName: this.name,
        evidence,
        summary: 'No requirements to parse.',
        riskLevel: 'low'
      };
    }

    for (const req of reqs) {
      evidence.push(createEvidence(ctx,
        `Requirement parsed: ${req.statement}`,
        'observed',
        ref
      ));

      if (req.acceptance_criteria.length > 0) {
        evidence.push(createEvidence(ctx,
          `Acceptance criteria identified: ${req.acceptance_criteria.join('; ')}`,
          'observed',
          ref
        ));
      } else {
        evidence.push(createEvidence(ctx,
          `Requirement ${req.id} has no acceptance criteria defined.`,
          'observed',
          ref
        ));
      }

      const statement = req.statement.toLowerCase();
      if (statement.includes('fast') || statement.includes('scalable') || statement.includes('soon')) {
        evidence.push(createEvidence(ctx,
          `Requirement ${req.id} contains ambiguous terms that need quantification.`,
          'observed',
          ref
        ));
      }
    }

    evidence.push(createEvidence(ctx,
      'Context bundle successfully parsed and structured for downstream agents.',
      'observed',
      ref
    ));

    return {
      agentName: this.name,
      evidence,
      summary: `Context agent parsed ${reqs.length} requirement(s).`,
      riskLevel: 'low'
    };
  }
}

export const contextAgent = new ContextAgent();
