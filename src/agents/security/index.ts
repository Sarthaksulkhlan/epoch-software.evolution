import { observed, riskFromClaims, type Agent, type AgentClaim, type AgentContext, type AgentResult } from '../contracts.js';
import { addedLines, changedFilesOf } from '../code-search.js';

const SECRET = /(api[_-]?key|secret|password|token)\s*[:=]\s*['"][^'"]{8,}['"]/i;
const CARD_NUMBER = /\b(?:\d[ -]?){13,19}\b/;

/**
 * Security agent: scans the diff. It always reports, including when it finds
 * nothing, so an empty result is never mistaken for an approval.
 */
export class SecurityAgent implements Agent {
  readonly type = 'security' as const;
  readonly role = 'Scans the diff for secrets, card data and boundary-crossing imports';

  async run(ctx: AgentContext): Promise<AgentResult> {
    const claims: AgentClaim[] = [];
    const lines = addedLines(ctx.diff);
    const files = changedFilesOf(ctx.diff);
    const source = `diff:${ctx.workflowId}`;

    if (lines.length === 0) {
      claims.push(observed('No code changes in the working tree yet; nothing to scan.', source));
      return { agent: this.type, claims, summary: 'Nothing to scan.', riskLevel: 'low' };
    }

    for (const line of lines) {
      if (SECRET.test(line.text)) {
        claims.push(observed(`Possible hard-coded secret added in ${line.file}: "${line.text.trim().slice(0, 80)}"`, `code:${line.file}`, 'critical'));
      }
      if (CARD_NUMBER.test(line.text) && !line.file.startsWith('test/') && !line.file.startsWith('scenarios/')) {
        claims.push(observed(`Card-number-like literal added in ${line.file} outside tests.`, `code:${line.file}`, 'high'));
      }
    }

    for (const invariant of ctx.spec.invariants) {
      if (invariant.rule.type !== 'import-boundary') continue;
      for (const guarded of invariant.rule.modules) {
        const stem = guarded.module.replace(/^src\//, '').replace(/\.ts$/, '');
        for (const line of lines) {
          const importsGuarded = /\bimport\b/.test(line.text) && line.text.includes(stem.split('/').pop() ?? stem) && line.text.includes(stem.split('/')[0] ?? stem);
          const allowed = guarded.allowedImporters.some(prefix => line.file === prefix || line.file.startsWith(prefix));
          if (importsGuarded && !allowed) {
            claims.push(observed(`${line.file} adds an import of ${guarded.module}, which ${invariant.id} (${invariant.name}) reserves for ${guarded.allowedImporters.join(', ')}.`, `code:${line.file}`, 'high'));
          }
        }
      }
    }

    if (claims.length === 0) {
      claims.push(observed(`No secrets, card numbers or boundary-crossing imports in ${lines.length} added line(s) across ${files.length} file(s).`, source));
    }

    return {
      agent: this.type,
      claims,
      summary: `Scanned ${lines.length} added line(s) in ${files.length} file(s).`,
      riskLevel: riskFromClaims(claims)
    };
  }
}

export const securityAgent = new SecurityAgent();
