import { execSync } from 'node:child_process';
import path from 'node:path';

const SANDBOX_REPO_PATH = path.join(process.cwd(), 'packages', 'sample-app');

/**
 * Low-level git isolation primitives for EPOCH sandboxes.
 *
 * All commands run inside the sample-app package directory so that mutations
 * are exercised against a real, isolated Git branch without touching the
 * platform's own source history.
 */
export class GitIsolation {
  /**
   * Create a new branch from the current HEAD.
   */
  createBranch(name: string): void {
    this.git(`checkout -b ${name}`);
  }

  /**
   * Switch to an existing branch.
   */
  switchBranch(name: string): void {
    this.git(`checkout ${name}`);
  }

  /**
   * Delete a sandbox branch and return to the main branch.
   */
  cleanup(name: string): void {
    const current = this.git('rev-parse --abbrev-ref HEAD').trim();
    if (current === name) {
      this.git('checkout main');
    }
    this.git(`branch -D ${name}`);
  }

  private git(command: string): string {
    return execSync(`git ${command}`, {
      cwd: SANDBOX_REPO_PATH,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
  }
}

export const gitIsolation = new GitIsolation();
