import fs from 'node:fs';
import path from 'node:path';
import { observed, inferred, riskFromClaims, type Agent, type AgentClaim, type AgentContext, type AgentResult } from '../contracts.js';
import { runTests } from '../../sandbox/runner.js';
import { scanRepository } from '../../graph/scanner/scanner.js';
import { keywords, listSource, numericConstants } from '../code-search.js';

/**
 * QA agent: runs the sample service's tests and consistency checks and maps
 * acceptance criteria to the tests that exercise them. Test results are
 * observed; coverage mapping is inferred.
 */
export class QaAgent implements Agent {
  readonly type = 'qa' as const;
  readonly role = 'Runs the tests and checks acceptance-criteria coverage';

  async run(ctx: AgentContext): Promise<AgentResult> {
    const claims: AgentClaim[] = [];
    const tests = ctx.verification?.tests ?? await runTests(ctx.repoPath);
    const testRef = `tests:${ctx.workflowId}:${ctx.phase}`;

    claims.push(observed(
      `Tests (${ctx.phase === 'verification' ? 'working tree' : 'current code'}): ${tests.passed} passed, ${tests.failed} failed in ${tests.files.length} files (${tests.durationMs} ms).`,
      testRef,
      tests.failed > 0 ? 'high' : undefined
    ));
    for (const file of tests.files.filter(f => !f.ok)) {
      claims.push(observed(`${file.file} failed (${file.failed} failing test(s)).`, `${testRef}:${file.file}`, 'high'));
    }

    const scan = ctx.verification?.scan ?? scanRepository(ctx.repoPath, ctx.spec, { tests });
    for (const check of scan.consistency) {
      claims.push(observed(`${check.ok ? 'Consistent' : 'Inconsistent'}: ${check.detail}.`, `consistency:${check.id}`, check.ok ? undefined : 'medium'));
    }

    const criteria = ctx.bundle.requirements.flatMap(r => r.acceptance_criteria);
    const testSources = fs.existsSync(path.join(ctx.repoPath, 'test'))
      ? fs.readdirSync(path.join(ctx.repoPath, 'test')).map(name => ({ name, text: fs.readFileSync(path.join(ctx.repoPath, 'test', name), 'utf8') }))
      : [];
    const constantNames = numericConstants(ctx.repoPath).map(c => c.name);
    for (const criterion of criteria) {
      const words = keywords(criterion);
      const covering = testSources.filter(t =>
        constantNames.some(name => t.text.includes(name) && words.some(w => name.toLowerCase().includes(w.slice(0, 5)))) ||
        words.filter(w => w.length > 5).some(w => t.text.toLowerCase().includes(w))
      );
      claims.push(inferred(
        covering.length > 0
          ? `Criterion "${criterion}" is plausibly exercised by ${covering.map(t => t.name).join(', ')}.`
          : `Criterion "${criterion}" has no test that obviously exercises it.`,
        testRef,
        covering.length > 0 ? undefined : 'low'
      ));
    }

    if (ctx.phase === 'verification' && ctx.verification) {
      for (const probe of ctx.verification.probes) {
        claims.push(observed(`Runtime probe ${probe.id} ${probe.ok ? 'passes' : 'fails'} on the working tree: ${probe.detail}`, `probe:${probe.id}`, probe.ok ? undefined : 'critical'));
      }
    }

    return {
      agent: this.type,
      claims,
      summary: `${tests.passed}/${tests.passed + tests.failed} tests pass; ${listSource(ctx.repoPath).length} source files.`,
      riskLevel: riskFromClaims(claims)
    };
  }
}

export const qaAgent = new QaAgent();
