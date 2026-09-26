import { evidence, tasks } from '../../store/index.js';
import type { Evidence } from '../../shared/schema/evidence.schema.js';
import { inferred, observed, type Agent, type AgentClaim, type AgentContext, type AgentResult, type RiskLevel } from '../contracts.js';

export interface ChangeAssessment {
  risk: RiskLevel;
  recommendation: string;
  /** Improvements the change would bring (invariants restored, probes passing). */
  improvements: string[];
  /** Claims that need a human decision. */
  openQuestions: Evidence[];
}

const isOpenQuestion = (e: Evidence): boolean => e.claim.startsWith('Open question');

/**
 * Risk is about what the change does, not about problems that already exist.
 * Pre-existing context (historian records, open findings) informs the reviewer
 * but does not raise the change's risk; verification of the working tree does.
 */
export function assessChange(workflowId: string): ChangeAssessment {
  const all = evidence.listEvidenceByWorkflow(workflowId);
  const taskList = tasks.listTasksByWorkflow(workflowId);
  const verificationTasks = new Set(taskList.filter(t => t.input_ref === 'verification').map(t => t.task_id));
  const securityTasks = new Set(taskList.filter(t => t.agent_type === 'security').map(t => t.task_id));
  const verified = verificationTasks.size > 0;

  // "Open drift finding …" and incident records describe the system before the change.
  const preExisting = (e: Evidence): boolean => /^Open (?!question)/.test(e.claim) || /^INC-\d+ \(/.test(e.claim);
  const changeClaims = all.filter(e =>
    !preExisting(e) && (
      verificationTasks.has(e.task_id) ||
      (securityTasks.has(e.task_id) && !verified) ||
      isOpenQuestion(e)
    )
  );
  const openQuestions = all.filter(isOpenQuestion);
  const critical = changeClaims.filter(e => e.finding_severity === 'critical');
  const high = changeClaims.filter(e => e.finding_severity === 'high');
  const leavesEnvelope = changeClaims.some(e => e.claim.includes('would leave the envelope'));
  const driftPreview = changeClaims.filter(e => e.claim.startsWith('Approving would raise'));
  const improvements = changeClaims
    .filter(e => /If approved: \S+ (VIOLATED|WEAKENED) → HOLDING/.test(e.claim) || (e.claim.startsWith('Runtime probe') && e.claim.includes(' passes ')))
    .map(e => e.claim);

  if (!verified) {
    return {
      risk: high.length > 0 || critical.length > 0 ? 'high' : openQuestions.length > 0 ? 'medium' : 'low',
      recommendation: 'Implement the change, then request approval so EPOCH can verify the working tree.',
      improvements,
      openQuestions
    };
  }
  if (critical.length > 0 || leavesEnvelope) {
    return {
      risk: critical.length > 0 ? 'critical' : 'high',
      recommendation: 'Launch a counterfactual simulation before approving: the change carries critical findings or moves the trajectory outside the envelope.',
      improvements,
      openQuestions
    };
  }
  if (driftPreview.length > 0 || high.length > 0) {
    return { risk: 'high', recommendation: 'Approve only with the listed risks accepted, or compare futures first.', improvements, openQuestions };
  }
  if (openQuestions.length > 0) {
    return { risk: 'medium', recommendation: 'Approve if the open questions are intentionally out of scope; otherwise request more context.', improvements, openQuestions };
  }
  return {
    risk: 'low',
    recommendation: improvements.length > 0
      ? `Approve: the change stays inside the envelope and ${improvements.length} measured improvement(s) follow from it.`
      : 'Approve: verification found nothing above low severity.',
    improvements,
    openQuestions
  };
}

/**
 * Deterministic synthesis: composes the decision package's recommendation.
 * It never upgrades a claim's status and lists open questions instead of
 * resolving them. When Bob drives a workflow, Bob's own synthesis is recorded
 * alongside this one.
 */
export class SynthesisAgent implements Agent {
  readonly type = 'synthesis' as const;
  readonly role = 'Composes the decision package and recommends the next action';

  async run(ctx: AgentContext): Promise<AgentResult> {
    const all = evidence.listEvidenceByWorkflow(ctx.workflowId);
    const assessment = assessChange(ctx.workflowId);
    const claims: AgentClaim[] = [
      observed(
        `${all.length} claim(s) on record: ${all.filter(e => e.status === 'observed').length} observed, ${all.filter(e => e.status === 'inferred').length} inferred, ${all.filter(e => e.status === 'hypothesised').length} hypothesised.`,
        `evidence:${ctx.workflowId}`
      ),
      inferred(`Recommendation: ${assessment.recommendation}`, `synthesis:${ctx.workflowId}`, assessment.risk === 'low' ? undefined : assessment.risk === 'medium' ? 'medium' : 'high')
    ];
    for (const improvement of assessment.improvements) claims.push(inferred(`Improvement: ${improvement}`, `synthesis:${ctx.workflowId}`));
    for (const q of assessment.openQuestions) claims.push(inferred(`Needs a human decision: ${q.claim}`, `evidence:${q.evidence_id}`));
    return { agent: this.type, claims, summary: assessment.recommendation, riskLevel: assessment.risk };
  }
}

export const synthesisAgent = new SynthesisAgent();
