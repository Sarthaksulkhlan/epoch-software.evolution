import { driftFindings, incidents, invariants } from '../../store/index.js';
import { observed, inferred, riskFromClaims, type Agent, type AgentClaim, type AgentContext, type AgentResult } from '../contracts.js';
import { componentOfFile } from '../code-search.js';

/**
 * Historian: what the evolution graph already knows about the parts of the
 * system this workflow touches. Read-only; every claim cites a record id.
 */
export class HistorianAgent implements Agent {
  readonly type = 'historian' as const;
  readonly role = 'Surfaces prior mutations, invariants and incidents for the touched components';

  async run(ctx: AgentContext): Promise<AgentResult> {
    const claims: AgentClaim[] = [];
    const components = new Set(ctx.bundle.repository.relevant_files.map(componentOfFile));
    const prior = ctx.bundle.prior_mutations;

    if (prior.length === 0) {
      claims.push(observed(`No prior mutations recorded for ${[...components].join(', ') || 'the touched components'}.`, 'graph:mutations'));
    } else {
      for (const m of prior.slice(0, 6)) {
        claims.push(observed(`${m.mutation_id} touched ${m.affected_components.join(', ')}: ${m.intent}`, `mutation:${m.mutation_id}`));
      }
      if (prior.length > 6) claims.push(observed(`${prior.length - 6} older mutation(s) touched the same components.`, 'graph:mutations'));
    }

    for (const inv of ctx.bundle.invariants) {
      const record = invariants.getInvariant(inv.invariant_id);
      const history = record?.violation_mutations ?? [];
      claims.push(observed(
        `${inv.invariant_id} is ${record?.status ?? inv.status}` + (history.length > 0 ? `; degraded before by ${history.join(', ')}` : '; never degraded') + '.',
        `invariant:${inv.invariant_id}`,
        record?.status === 'VIOLATED' ? 'high' : record?.status === 'WEAKENED' ? 'medium' : undefined
      ));
    }

    for (const f of driftFindings.listDriftFindings({ status: 'open' }).filter(f => f.components.some(c => components.has(c)))) {
      claims.push(observed(`Open drift finding ${f.finding_id} (${f.severity}): ${f.title}`, `drift:${f.finding_id}`, f.severity === 'critical' ? 'high' : 'medium'));
    }

    for (const i of incidents.listIncidents().filter(i => components.has(i.affected_component))) {
      claims.push(observed(`${i.incident_id} (${i.status}) in ${i.affected_component}: ${i.signal}`, `incident:${i.incident_id}`, i.status === 'resolved' ? undefined : 'high'));
      if (i.candidate_mutations && i.candidate_mutations.length > 0) {
        claims.push(inferred(`Candidate causal chain recorded for ${i.incident_id}: ${i.candidate_mutations.join(' → ')}`, `incident:${i.incident_id}`));
      }
    }

    return {
      agent: this.type,
      claims,
      summary: `${prior.length} prior mutation(s), ${ctx.bundle.invariants.length} invariant(s) in scope.`,
      riskLevel: riskFromClaims(claims)
    };
  }
}

export const historianAgent = new HistorianAgent();
