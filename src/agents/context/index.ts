import { observed, inferred, riskFromClaims, type Agent, type AgentClaim, type AgentContext, type AgentResult } from '../contracts.js';
import { CUSTOMER_FACING, componentOfFile, keywords, numericConstants, numbersIn } from '../code-search.js';

/** Words too common to tie a constant to a requirement on their own. */
const GENERIC_WORDS = new Set(['days', 'from', 'must', 'with', 'that', 'this', 'into', 'will', 'should', 'each', 'every', 'when']);

/**
 * Context / Requirements agent: turns the requirement into acceptance criteria
 * and surfaces what the requirement does not say. It never invents scope.
 */
export class ContextAgent implements Agent {
  readonly type = 'context' as const;
  readonly role = 'Parses the requirement and surfaces missing context';

  async run(ctx: AgentContext): Promise<AgentResult> {
    const claims: AgentClaim[] = [];
    const source = `requirement:${ctx.workflowId}`;
    const requirement = ctx.bundle.requirements[0];

    if (!requirement) {
      claims.push(observed('No requirement text was provided with this workflow.', source, 'medium'));
      return { agent: this.type, claims, summary: 'No requirement to parse.', riskLevel: 'medium' };
    }

    claims.push(observed(`Requirement: ${requirement.statement}`, source));
    for (const criterion of requirement.acceptance_criteria) {
      claims.push(observed(`Acceptance criterion: ${criterion}`, source));
    }

    const words = keywords(ctx.requirement).filter(w => !GENERIC_WORDS.has(w));
    const numbers = numbersIn(ctx.requirement);
    const constants = numericConstants(ctx.repoPath);
    const touchpoints = constants.filter(c => {
      const nameWords = c.name.toLowerCase().split('_').filter(w => !GENERIC_WORDS.has(w));
      return numbers.includes(c.value) && nameWords.some(w => w.length >= 4 && words.some(k => k.startsWith(w) || w.startsWith(k.slice(0, 5))));
    });
    const sameValue = constants.filter(c => numbers.includes(c.value) && !touchpoints.includes(c) && /DAYS|WINDOW|RETENTION/.test(c.name));

    for (const t of touchpoints) {
      const facing = CUSTOMER_FACING.has(componentOfFile(t.file));
      claims.push(observed(`Candidate touchpoint (${facing ? 'customer-facing' : 'internal'}): ${t.file}:${t.line} ${t.name} = ${t.value}`, `code:${t.file}#L${t.line}`));
    }

    if (/\ball\b/i.test(ctx.requirement) && /touchpoint|surface|screen|endpoint/i.test(ctx.requirement)) {
      claims.push(observed(
        `The requirement asks for "all" touchpoints without listing them; ${touchpoints.length} candidate constant(s) found by name and value.`,
        source,
        'low'
      ));
    }

    for (const c of sameValue) {
      const related = ctx.spec.invariants.find(inv =>
        inv.rule.type === 'constant-order' && (inv.rule.lesser.name === c.name || inv.rule.greater.name === c.name)
      );
      claims.push(observed(
        `Open question: ${c.file}:${c.line} ${c.name} = ${c.value} has the same value but is ${CUSTOMER_FACING.has(componentOfFile(c.file)) ? 'customer-facing' : 'internal'}; the requirement does not say whether it should change.` +
          (related ? ` ${related.id} (${related.name}) ties it to the values being changed.` : ''),
        `code:${c.file}#L${c.line}`,
        related ? 'medium' : 'low'
      ));
    }

    if (touchpoints.length === 0) {
      claims.push(inferred('No constant matched the requirement by name and value; the change may live in logic rather than configuration.', source, 'low'));
    }

    return {
      agent: this.type,
      claims,
      summary: `${requirement.acceptance_criteria.length} acceptance criteria, ${touchpoints.length} touchpoint(s), ${sameValue.length} open question(s).`,
      riskLevel: riskFromClaims(claims)
    };
  }
}

export const contextAgent = new ContextAgent();
