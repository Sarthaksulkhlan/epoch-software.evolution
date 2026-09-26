import { incidents } from '../../store/index.js';
import { observed, hypothesised, inferred, riskFromClaims, type Agent, type AgentClaim, type AgentContext, type AgentResult } from '../contracts.js';
import { runProbes } from '../../sandbox/runner.js';
import { causalArchaeologist } from '../../graph/causal/archaeologist.js';

/**
 * Incident agent: reproduces runtime failures with the probes and reports
 * candidate causes. It never asserts a root cause (ADR-018).
 */
export class IncidentAgent implements Agent {
  readonly type = 'incident' as const;
  readonly role = 'Reproduces runtime failures and lists candidate causes';

  async run(ctx: AgentContext): Promise<AgentResult> {
    const claims: AgentClaim[] = [];
    const probes = ctx.verification?.probes ?? await runProbes(ctx.repoPath);
    for (const probe of probes) {
      claims.push(observed(`Probe ${probe.id} ${probe.ok ? 'passes' : 'reproduces a failure'}: ${probe.detail}`, `probe:${probe.id}`, probe.ok ? undefined : 'critical'));
    }

    for (const incident of incidents.listIncidents().filter(i => i.status !== 'resolved' && i.status !== 'wont_fix')) {
      const chain = causalArchaeologist.traceIncident(incident.incident_id);
      claims.push(observed(`${incident.incident_id} (${incident.severity}) is ${incident.status}: ${incident.signal}`, `incident:${incident.incident_id}`, 'high'));
      if (chain.mostProximate) {
        claims.push(inferred(`${chain.mostProximate.mutationId} is the most proximate candidate: ${chain.mostProximate.reasons.join('; ')}.`, `causal:${incident.incident_id}`));
      }
      if (chain.earliestPlausible && chain.earliestPlausible !== chain.mostProximate) {
        claims.push(hypothesised(`${chain.earliestPlausible.mutationId} is the earliest plausible mutation in the candidate chain ${chain.chain.join(' → ')}: ${chain.earliestPlausible.reasons.join('; ')}.`, `causal:${incident.incident_id}`));
      }
    }

    return {
      agent: this.type,
      claims,
      summary: `${probes.filter(p => !p.ok).length} failing probe(s).`,
      riskLevel: riskFromClaims(claims)
    };
  }
}

export const incidentAgent = new IncidentAgent();
