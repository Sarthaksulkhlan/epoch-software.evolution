import { execSync } from 'node:child_process';
import path from 'node:path';

const SAMPLE_APP_PATH = path.join(process.cwd(), 'packages', 'sample-app');
const MAX_ACTIVE_BRANCHES = 3;

export class BranchManager {
  /**
   * Create a sandbox branch for a simulation or experiment.
   */
  createBranch(branchName: string, baseCommit?: string): string {
    const branches = this.listSandboxBranches();
    if (branches.length >= MAX_ACTIVE_BRANCHES) {
      throw new Error(`Maximum active branches (${MAX_ACTIVE_BRANCHES}) reached.`);
    }

    if (baseCommit) {
      this.git(`checkout -b ${branchName} ${baseCommit}`);
    } else {
      this.git(`checkout -b ${branchName}`);
    }
    return branchName;
  }

  /**
   * Switch to a branch.
   */
  switchTo(branchName: string): void {
    this.git(`checkout ${branchName}`);
  }

  /**
   * Delete a sandbox branch.
   */
  deleteBranch(branchName: string): void {
    this.git(`branch -D ${branchName}`);
  }

  /**
   * List active sandbox branches (epoch/* prefix).
   */
  listSandboxBranches(): string[] {
    try {
      const output = this.git('branch --list "epoch/*"');
      return output
        .split('\n')
        .map(b => b.replace('*', '').trim())
        .filter(b => b.length > 0);
    } catch {
      return [];
    }
  }

  /**
   * Get the current branch name.
   */
  getCurrentBranch(): string {
    return this.git('rev-parse --abbrev-ref HEAD').trim();
  }

  /**
   * Get the HEAD commit hash.
   */
  getHeadCommit(): string {
    return this.git('rev-parse HEAD').trim();
  }

  /**
   * Clean up all sandbox branches.
   */
  cleanupAll(): void {
    const currentBranch = this.getCurrentBranch();
    if (currentBranch.startsWith('epoch/')) {
      this.git('checkout main');
    }
    const branches = this.listSandboxBranches();
    for (const branch of branches) {
      this.deleteBranch(branch);
    }
  }

  /**
   * Execute a git command in the sample app directory.
   */
  private git(command: string): string {
    return execSync(`git ${command}`, {
      cwd: SAMPLE_APP_PATH,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
  }
}

export const branchManager = new BranchManager();
