import type { Agent, AgentContext, AgentResult } from '../contracts.js';
import { createEvidence } from '../contracts.js';

export class PerformanceAgent implements Agent {
  readonly name = 'performance';

  async run(ctx: AgentContext): Promise<AgentResult> {
    const evidence = [];
    const ref = `agent-analysis:performance:${ctx.taskId}`;
    const diff = ctx.diff ?? '';
    const telemetry = ctx.contextBundle.telemetry;

    if (telemetry) {
      evidence.push(createEvidence(ctx,
        `Current p99 latency: ${telemetry.p99_latency_ms}ms; error rate: ${telemetry.error_rate}.`,
        'observed',
        ref
      ));

      if (telemetry.p99_latency_ms > 500) {
        evidence.push(createEvidence(ctx,
          'p99 latency exceeds 500ms threshold; performance regression risk.',
          'inferred',
          ref,
          'high'
        ));
      }
    } else {
      evidence.push(createEvidence(ctx,
        'No telemetry snapshot available in context bundle.',
        'observed',
        ref
      ));
    }

    const perfPatterns = ['loop', 'query', 'sleep', 'timeout', 'cache'];
    const touchedPerf = perfPatterns.some(p => diff.toLowerCase().includes(p));
    if (touchedPerf) {
      evidence.push(createEvidence(ctx,
        'Diff touches performance-sensitive patterns (loops, queries, caching, timeouts).',
        'observed',
        ref,
        'medium'
      ));
    }

    evidence.push(createEvidence(ctx,
      'Performance review completed.',
      'observed',
      ref
    ));

    return {
      agentName: this.name,
      evidence,
      summary: 'Performance agent reviewed telemetry and diff patterns.',
      riskLevel: 'low'
    };
  }
}

export const performanceAgent = new PerformanceAgent();
