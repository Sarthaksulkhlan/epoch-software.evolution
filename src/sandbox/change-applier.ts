import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { Mutation } from '../../shared/schema/mutation.schema.js';

const SANDBOX_REPO_PATH = path.join(process.cwd(), 'packages', 'sample-app');
const MUTATION_MARKER_FILE = '.epoch-mutations.md';

export interface Result<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface MutationWithDiff extends Mutation {
  diff?: string;
}

/**
 * Applies a mutation's code changes to an isolated sandbox branch.
 *
 * The Mutation schema does not yet include a formal diff field, so the applier
 * accepts an optional `diff` property (e.g. a unified patch) and falls back to
 * writing an auditable marker file when no diff is provided.
 */
export class ChangeApplier {
  apply(mutation: Mutation, branch: string): Result<void> {
    try {
      this.git(`checkout ${branch}`);

      const payload = mutation as MutationWithDiff;
      if (payload.diff && payload.diff.length > 0) {
        const applied = this.applyPatch(payload.diff, mutation.mutation_id);
        if (!applied.success) {
          return applied;
        }
      } else {
        this.writeMutationMarker(mutation);
      }

      this.git('add -A');
      this.git(
        `commit -m "Apply mutation ${mutation.mutation_id}: ${mutation.intent}" --allow-empty`,
        {
          GIT_AUTHOR_NAME: 'EPOCH Sandbox',
          GIT_AUTHOR_EMAIL: 'sandbox@epoch.local',
          GIT_COMMITTER_NAME: 'EPOCH Sandbox',
          GIT_COMMITTER_EMAIL: 'sandbox@epoch.local'
        }
      );

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }

  private applyPatch(diff: string, mutationId: string): Result<void> {
    const patchPath = path.join(SANDBOX_REPO_PATH, `.epoch-${mutationId}.patch`);
    fs.writeFileSync(patchPath, diff, 'utf-8');

    try {
      this.git(`apply --check ${patchPath}`);
      this.git(`apply ${patchPath}`);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: `Patch application failed: ${err instanceof Error ? err.message : String(err)}`
      };
    } finally {
      try {
        fs.unlinkSync(patchPath);
      } catch {
        // Ignore cleanup failure; the patch file is in the sandbox directory.
      }
    }
  }

  private writeMutationMarker(mutation: Mutation): void {
    const markerPath = path.join(SANDBOX_REPO_PATH, MUTATION_MARKER_FILE);
    const entry = [
      `## ${mutation.mutation_id}`,
      `- Intent: ${mutation.intent}`,
      `- Components: ${mutation.affected_components.join(', ')}`,
      `- Summary: ${mutation.delta_summary ?? 'N/A'}`,
      `- Epoch: ${mutation.epoch_id}`,
      ''
    ].join('\n');

    fs.appendFileSync(markerPath, entry, 'utf-8');
  }

  private git(command: string, extraEnv?: Record<string, string>): string {
    return execSync(`git ${command}`, {
      cwd: SANDBOX_REPO_PATH,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        ...extraEnv
      }
    });
  }
}

export const changeApplier = new ChangeApplier();
