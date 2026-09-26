import type { Agent, AgentContext, AgentResult } from '../contracts.js';
import { createEvidence } from '../contracts.js';
import { queryMutations, queryInvariants, queryIncidents } from '../../store/index.js';

export class HistorianAgent implements Agent {
  readonly name = 'historian';

  async run(ctx: AgentContext): Promise<AgentResult> {
    const evidence = [];
    const ref = `agent-analysis:historian:${ctx.taskId}`;
    const components = ctx.affectedComponents ?? ctx.contextBundle.repository.relevant_files;

    if (components.length === 0) {
      evidence.push(createEvidence(ctx,
        'No affected components specified in context requirements.',
        'observed',
        ref
      ));
      return {
        agentName: this.name,
        evidence,
        summary: 'Historian could not identify affected components.',
        riskLevel: 'low'
      };
    }

    let foundHistory = false;

    for (const component of components) {
      const recentMutations = queryMutations({ component, limit: 5 });
      const lastMutation = recentMutations[0];
      if (lastMutation) {
        foundHistory = true;
        evidence.push(createEvidence(ctx,
          `Component ${component} was last modified in mutation ${lastMutation.mutation_id} with intent: ${lastMutation.intent}`,
          'observed',
          ref
        ));
      }

      const weakenedInvariants = queryInvariants({ component, status: 'WEAKENED' });
      if (weakenedInvariants.length > 0) {
        foundHistory = true;
        evidence.push(createEvidence(ctx,
          `Invariant for ${component} has been weakened ${weakenedInvariants.length} time(s) in recent history.`,
          'observed',
          ref
        ));
      }

      const priorIncidents = queryIncidents({ component });
      if (priorIncidents.length > 0) {
        foundHistory = true;
        for (const incident of priorIncidents.slice(0, 3)) {
          evidence.push(createEvidence(ctx,
            `Prior incident ${incident.incident_id} was traced to a change in this component.`,
            'inferred',
            ref,
            incident.severity as import('../../shared/schema/index.js').FindingSeverity
          ));
        }
      }
    }

    if (!foundHistory) {
      evidence.push(createEvidence(ctx,
        'No prior mutation history found for the specified components.',
        'observed',
        ref
      ));
    }

    return {
      agentName: this.name,
      evidence,
      summary: `Historian found ${evidence.length} history item(s).`,
      riskLevel: 'low'
    };
  }
}

export const historianAgent = new HistorianAgent();
