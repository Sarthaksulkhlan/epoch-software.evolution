import { driftFindings, trajectory } from '../../store/index.js';
import { observed, inferred, riskFromClaims, type Agent, type AgentClaim, type AgentContext, type AgentResult } from '../contracts.js';
import { ENVELOPE } from '../../core/epoch/trajectory.js';

/**
 * Evolution Analyst: where the trajectory is and where approving this change
 * would move it. Measured trajectory values are observed; trends and
 * consequences are inferred (ADR-011).
 */
export class EvolutionAnalystAgent implements Agent {
  readonly type = 'evolution' as const;
  readonly role = 'Measures the trajectory and previews the impact of approving';

  async run(ctx: AgentContext): Promise<AgentResult> {
    const claims: AgentClaim[] = [];
    const recent = trajectory.listTrajectoryPoints({ limit: 5 });
    const latest = recent.at(-1);
    const first = recent[0];

    if (latest && first) {
      claims.push(observed(
        `Boundary integrity ${latest.boundary_integrity_score.toFixed(3)}, coupling ${latest.coupling_score.toFixed(3)} after ${latest.mutation_id} ` +
          `(from ${first.boundary_integrity_score.toFixed(3)} / ${first.coupling_score.toFixed(3)} at ${first.mutation_id}).`,
        `trajectory:${latest.mutation_id}`
      ));
    } else {
      claims.push(observed('No trajectory recorded yet.', 'trajectory'));
    }

    for (const f of driftFindings.listDriftFindings({ status: 'open' })) {
      claims.push(observed(`Open ${f.pattern.replace('_', ' ')} finding ${f.finding_id} (${f.severity}): ${f.summary}`, `drift:${f.finding_id}`, f.severity === 'critical' ? 'high' : 'medium'));
    }

    const v = ctx.verification;
    if (ctx.phase === 'verification' && v) {
      const head = ctx.headScan;
      claims.push(observed(
        `If approved: boundary integrity ${fmt(head?.boundaryIntegrityScore)} → ${v.scan.boundaryIntegrityScore.toFixed(3)}, coupling ${fmt(head?.couplingScore)} → ${v.scan.couplingScore.toFixed(3)}.`,
        `scan:working-tree:${ctx.workflowId}`,
        v.diff.boundaryIntegrityDelta < 0 ? 'medium' : undefined
      ));
      for (const t of v.diff.invariantTransitions) {
        const detail = v.scan.invariants.find(r => r.invariantId === t.invariantId)?.detail ?? '';
        claims.push(observed(`If approved: ${t.invariantId} ${t.from} → ${t.to}. ${detail}.`, `scan:working-tree:${ctx.workflowId}`, t.to === 'VIOLATED' ? 'critical' : t.to === 'WEAKENED' ? 'high' : undefined));
      }
      for (const e of v.diff.addedComponentEdges) {
        claims.push(observed(`If approved: new dependency ${e.from} → ${e.to}.`, `scan:working-tree:${ctx.workflowId}`, 'low'));
      }
      for (const outcome of v.driftPreview) {
        claims.push(inferred(`Approving would raise or escalate ${outcome.title} to ${outcome.severity}: ${outcome.summary}`, `drift-preview:${ctx.workflowId}`, outcome.severity === 'critical' ? 'high' : 'medium'));
      }
      claims.push(inferred(
        v.withinEnvelope
          ? `The trajectory would stay inside the envelope (boundary integrity ≥ ${ENVELOPE.minBoundaryIntegrity}, coupling ≤ ${ENVELOPE.maxCoupling}).`
          : `The trajectory would leave the envelope (boundary integrity ≥ ${ENVELOPE.minBoundaryIntegrity}, coupling ≤ ${ENVELOPE.maxCoupling}); consider comparing futures before approving.`,
        `envelope:${ctx.workflowId}`,
        v.withinEnvelope ? undefined : 'high'
      ));
    } else {
      const atRisk = ctx.bundle.invariants.filter(inv => inv.status !== 'HOLDING');
      for (const inv of atRisk) {
        claims.push(observed(`${inv.invariant_id} is already ${inv.status} in the components this workflow touches.`, `invariant:${inv.invariant_id}`, 'medium'));
      }
      for (const spec of ctx.spec.invariants) {
        if (spec.rule.type !== 'constant-order') continue;
        const touchesLesser = ctx.requirement.toLowerCase().includes(spec.rule.lesser.name.split('_')[0]?.toLowerCase() ?? '#');
        if (touchesLesser) {
          claims.push(inferred(`Raising ${spec.rule.lesser.name} without ${spec.rule.greater.name} would break ${spec.id} (${spec.name}).`, `invariant:${spec.id}`, 'medium'));
        }
      }
    }

    return {
      agent: this.type,
      claims,
      summary: v ? `Previewed ${v.diff.invariantTransitions.length} invariant change(s) and ${v.driftPreview.length} drift finding(s).` : 'Trajectory measured.',
      riskLevel: riskFromClaims(claims)
    };
  }
}

function fmt(value: number | undefined): string {
  return value === undefined ? 'n/a' : value.toFixed(3);
}

export const evolutionAnalystAgent = new EvolutionAnalystAgent();
