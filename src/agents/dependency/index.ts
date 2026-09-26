import type { Agent, AgentContext, AgentResult } from '../contracts.js';
import { createEvidence } from '../contracts.js';

export class DependencyAgent implements Agent {
  readonly name = 'dependency';

  async run(ctx: AgentContext): Promise<AgentResult> {
    const evidence = [];
    const ref = `agent-analysis:dependency:${ctx.taskId}`;
    const manifest = ctx.dependencyManifest ?? '';
    const diff = ctx.diff ?? '';

    const addedDeps = [...manifest.matchAll(/^\+\s*"([^"]+)":/gm)].map(m => m[1]);
    const removedDeps = [...manifest.matchAll(/^-\s*"([^"]+)":/gm)].map(m => m[1]);

    if (addedDeps.length > 0) {
      evidence.push(createEvidence(ctx,
        `Dependencies added: ${addedDeps.join(', ')}.`,
        'observed',
        ref
      ));
    }

    if (removedDeps.length > 0) {
      evidence.push(createEvidence(ctx,
        `Dependencies removed: ${removedDeps.join(', ')}.`,
        'observed',
        ref
      ));
    }

    if (diff.includes('import') && ctx.contextBundle.prior_mutations.length > 0) {
      const components = ctx.affectedComponents ?? ctx.contextBundle.repository.relevant_files;
      const newCrossImports = components.some(c => diff.includes(c));
      if (newCrossImports) {
        evidence.push(createEvidence(ctx,
          'Diff introduces new cross-component imports; verify boundary integrity.',
          'inferred',
          ref,
          'medium'
        ));
      }
    }

    if (addedDeps.length === 0 && removedDeps.length === 0) {
      evidence.push(createEvidence(ctx,
        'No dependency manifest changes detected.',
        'observed',
        ref
      ));
    }

    evidence.push(createEvidence(ctx,
      'Dependency review completed.',
      'observed',
      ref
    ));

    return {
      agentName: this.name,
      evidence,
      summary: `Dependency agent reviewed ${addedDeps.length} added and ${removedDeps.length} removed package(s).`,
      riskLevel: addedDeps.length > 2 ? 'medium' : 'low'
    };
  }
}

export const dependencyAgent = new DependencyAgent();
