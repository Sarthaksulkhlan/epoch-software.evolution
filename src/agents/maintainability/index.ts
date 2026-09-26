import type { Agent, AgentContext, AgentResult } from '../contracts.js';
import { createEvidence } from '../contracts.js';

export class MaintainabilityAgent implements Agent {
  readonly name = 'maintainability';

  async run(ctx: AgentContext): Promise<AgentResult> {
    const evidence = [];
    const ref = `agent-analysis:maintainability:${ctx.taskId}`;
    const diff = ctx.diff ?? '';

    const lines = diff.split('\n');
    const added = lines.filter(l => l.startsWith('+')).length;
    const removed = lines.filter(l => l.startsWith('-')).length;

    evidence.push(createEvidence(ctx,
      `Diff adds ${added} line(s) and removes ${removed} line(s).`,
      'observed',
      ref
    ));

    const complexitySignals = ['if', 'for', 'while', 'switch', 'catch'];
    const complexity = complexitySignals.reduce((sum, signal) =>
      sum + (diff.split(signal).length - 1), 0);

    if (complexity > 5) {
      evidence.push(createEvidence(ctx,
        `Diff introduces ${complexity} control-flow statements; consider refactoring for readability.`,
        'inferred',
        ref,
        'medium'
      ));
    }

    if (added > 200) {
      evidence.push(createEvidence(ctx,
        'Large diff (>200 added lines) increases review risk and maintainability burden.',
        'inferred',
        ref,
        'medium'
      ));
    }

    evidence.push(createEvidence(ctx,
      'Maintainability review completed.',
      'observed',
      ref
    ));

    return {
      agentName: this.name,
      evidence,
      summary: `Maintainability agent reviewed ${added + removed} changed line(s).`,
      riskLevel: complexity > 5 || added > 200 ? 'medium' : 'low'
    };
  }
}

export const maintainabilityAgent = new MaintainabilityAgent();
