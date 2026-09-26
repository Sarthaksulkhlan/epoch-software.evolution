import type { Agent, AgentContext, AgentResult } from '../contracts.js';
import { createEvidence } from '../contracts.js';

export class SecurityAgent implements Agent {
  readonly name = 'security';

  async run(ctx: AgentContext): Promise<AgentResult> {
    const evidence = [];
    const ref = `agent-analysis:security:${ctx.taskId}`;
    let findings = 0;

    const affectedComponents = ctx.affectedComponents ?? ctx.contextBundle.repository.relevant_files;
    const authComponents = affectedComponents.filter(c =>
      c.toLowerCase().includes('auth') || c.toLowerCase().includes('login')
    );
    if (authComponents.length > 0) {
      findings++;
      evidence.push(createEvidence(ctx,
        `Modifications to authentication boundaries detected in: ${authComponents.join(', ')}.`,
        'observed',
        ref,
        'high'
      ));
    }

    const diff = ctx.diff ?? '';
    const dependencyManifest = ctx.dependencyManifest ?? '';
    const scanSurface = `${diff}\n${dependencyManifest}`;

    if (scanSurface.includes('API_KEY') || scanSurface.includes('SECRET') || scanSurface.includes('PASSWORD')) {
      findings++;
      evidence.push(createEvidence(ctx,
        'Possible hardcoded secrets (API_KEY, SECRET or PASSWORD) detected in static scan.',
        'observed',
        ref,
        'critical'
      ));
    } else {
      evidence.push(createEvidence(ctx,
        'No hardcoded secrets detected in static scan.',
        'observed',
        ref
      ));
    }

    if (dependencyManifest.includes('CVE') || dependencyManifest.includes('vulnerability')) {
      findings++;
      evidence.push(createEvidence(ctx,
        'Dependency manifest references known vulnerabilities; review required.',
        'observed',
        ref,
        'high'
      ));
    }

    evidence.push(createEvidence(ctx,
      findings === 0
        ? 'Security scan completed with no specific findings.'
        : `Security scan completed with ${findings} potential issue(s) flagged.`,
      'observed',
      ref
    ));

    return {
      agentName: this.name,
      evidence,
      summary: `Security scan produced ${findings} finding(s).`,
      riskLevel: findings > 0 ? 'high' : 'low'
    };
  }
}

export const securityAgent = new SecurityAgent();
