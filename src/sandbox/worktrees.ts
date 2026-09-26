import fs from 'node:fs';
import path from 'node:path';
import { assertSafeId, git } from './git.js';
import { epochWorkDir, sampleRepoPath } from './sample-repo.js';

/**
 * Counterfactual futures run in git worktrees of the sample repository
 * (ADR-010, revised): each future gets its own directory checked out at the
 * base commit, so nothing ever switches the sample repo's or EPOCH's branch.
 */

export const MAX_ACTIVE_FUTURES = 3;

export function futuresRoot(): string {
  return path.join(epochWorkDir(), 'futures');
}

export function worktreePath(simulationId: string, scenarioId: string): string {
  return path.join(futuresRoot(), assertSafeId(simulationId, 'simulation id'), assertSafeId(scenarioId, 'scenario id'));
}

export function addWorktree(simulationId: string, scenarioId: string, baseSha: string): string {
  if (!/^[0-9a-f]{7,40}$/.test(baseSha)) throw new Error(`Invalid base commit "${baseSha}"`);
  const target = worktreePath(simulationId, scenarioId);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  git(sampleRepoPath(), ['worktree', 'add', '--detach', target, baseSha]);
  return target;
}

export function removeWorktree(target: string): void {
  if (!fs.existsSync(target)) return;
  try {
    git(sampleRepoPath(), ['worktree', 'remove', '--force', target]);
  } catch {
    fs.rmSync(target, { recursive: true, force: true });
    git(sampleRepoPath(), ['worktree', 'prune']);
  }
}

/** Diff of a worktree against the commit it was created from, including new files. */
export function worktreeDiff(target: string): string {
  git(target, ['add', '-A']);
  return git(target, ['diff', '--no-color', '--cached', 'HEAD']);
}
