import { evidence } from '../../store/index.js';
import { inferred, observed, type Agent, type AgentClaim, type AgentContext, type AgentResult, type RiskLevel } from '../contracts.js';

/**
 * Deterministic synthesis: reads every claim recorded for the workflow and
 * recommends the next lifecycle action. It never upgrades a claim's status and
 * lists open questions instead of resolving them. When Bob drives a workflow,
 * Bob's own synthesis is recorded next to this one.
 */
export class SynthesisAgent implements Agent {
  readonly type = 'synthesis' as const;
  readonly role = 'Composes the decision package and recommends the next action';

  async run(ctx: AgentContext): Promise<AgentResult> {
    const all = evidence.listEvidenceByWorkflow(ctx.workflowId);
    const claims: AgentClaim[] = [];
    const counts = {
      observed: all.filter(e => e.status === 'observed').length,
      inferred: all.filter(e => e.status === 'inferred').length,
      hypothesised: all.filter(e => e.status === 'hypothesised').length
    };
    claims.push(observed(`${all.length} claim(s) on record: ${counts.observed} observed, ${counts.inferred} inferred, ${counts.hypothesised} hypothesised.`, `evidence:${ctx.workflowId}`));

    const critical = all.filter(e => e.finding_severity === 'critical');
    const high = all.filter(e => e.finding_severity === 'high');
    const openQuestions = all.filter(e => e.claim.startsWith('Open question') || e.claim.includes('does not say'));
    const leavesEnvelope = all.some(e => e.claim.includes('would leave the envelope'));
    const driftPreview = all.filter(e => e.claim.startsWith('Approving would raise'));

    let recommendation: string;
    let risk: RiskLevel;
    if (critical.length > 0 || leavesEnvelope) {
      risk = critical.length > 0 ? 'critical' : 'high';
      recommendation = 'Launch a counterfactual simulation before approving: the change moves the trajectory outside the intended envelope or carries critical findings.';
    } else if (driftPreview.length > 0 || high.length > 0) {
      risk = 'high';
      recommendation = 'Approve only with the listed risks accepted, or compare futures first.';
    } else if (openQuestions.length > 0) {
      risk = 'medium';
      recommendation = 'Approve if the open questions are intentionally out of scope; otherwise request more context.';
    } else {
      risk = 'low';
      recommendation = 'Approve: no findings above low severity.';
    }

    claims.push(inferred(`Recommendation: ${recommendation}`, `synthesis:${ctx.workflowId}`, risk === 'low' ? undefined : risk === 'medium' ? 'medium' : 'high'));
    for (const q of openQuestions) claims.push(inferred(`Needs a human decision: ${q.claim}`, `evidence:${q.evidence_id}`));

    return { agent: this.type, claims, summary: recommendation, riskLevel: risk };
  }
}

export const synthesisAgent = new SynthesisAgent();
