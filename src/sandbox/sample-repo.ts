import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { commitMessageArgs, git, type GitIdentity } from './git.js';

/**
 * The sample payments service lives in packages/sample-app (source of truth,
 * versioned with the platform). At demo-reset it is copied to a separate git
 * repository so Bob, the replay script and the futures can change it without
 * ever touching the EPOCH repository's own working tree.
 */

export const SAMPLE_APP_SOURCE = path.join(process.cwd(), 'packages', 'sample-app');
/** Working state for the demo (sample repo copy, futures, context bundles). EPOCH_WORK_DIR overrides it. */
export function epochWorkDir(): string {
  return process.env.EPOCH_WORK_DIR ?? path.join(process.cwd(), '.epoch');
}

const COPIED_ENTRIES = ['src', 'test', 'scenarios', 'invariants.json', 'package.json', 'tsconfig.json'] as const;

export function sampleRepoPath(): string {
  return process.env.EPOCH_SAMPLE_REPO ?? path.join(epochWorkDir(), 'sample-repo');
}

export function sampleRepoExists(repoPath = sampleRepoPath()): boolean {
  return fs.existsSync(path.join(repoPath, '.git'));
}

/** Recreate the sample repository from packages/sample-app with a single baseline commit. */
export function initSampleRepo(baselineMessage: string, repoPath = sampleRepoPath()): string {
  removeWorktrees(repoPath);
  fs.rmSync(repoPath, { recursive: true, force: true });
  fs.mkdirSync(repoPath, { recursive: true });
  for (const entry of COPIED_ENTRIES) {
    fs.cpSync(path.join(SAMPLE_APP_SOURCE, entry), path.join(repoPath, entry), { recursive: true });
  }
  git(repoPath, ['init', '-q', '-b', 'main']);
  git(repoPath, ['config', 'core.autocrlf', 'false']);
  git(repoPath, ['add', '-A']);
  git(repoPath, ['commit', '-q', ...commitMessageArgs(baselineMessage)]);
  return headSha(repoPath);
}

export function headSha(repoPath = sampleRepoPath()): string {
  return git(repoPath, ['rev-parse', 'HEAD']).trim();
}

export function currentBranch(repoPath = sampleRepoPath()): string {
  return git(repoPath, ['rev-parse', '--abbrev-ref', 'HEAD']).trim();
}

/** Files with uncommitted changes (including new files), relative to the repo root. */
export function changedFiles(repoPath = sampleRepoPath()): string[] {
  const output = git(repoPath, ['status', '--porcelain', '--untracked-files=all']);
  return output
    .split('\n')
    .map(line => line.slice(3).trim())
    .filter(line => line.length > 0)
    .map(file => (file.includes(' -> ') ? file.split(' -> ')[1] ?? file : file))
    .sort();
}

export function hasUncommittedChanges(repoPath = sampleRepoPath()): boolean {
  return changedFiles(repoPath).length > 0;
}

/**
 * Unified diff of the working tree against HEAD, including untracked files.
 * Read-only: it never touches the index, so it is safe to call concurrently.
 */
export function workingTreeDiff(repoPath = sampleRepoPath()): string {
  const tracked = git(repoPath, ['diff', '--no-color', 'HEAD']);
  const untracked = git(repoPath, ['ls-files', '--others', '--exclude-standard'])
    .split('\n')
    .map(f => f.trim())
    .filter(f => f.length > 0);
  const added = untracked.map(file => {
    const lines = fs.readFileSync(path.join(repoPath, file), 'utf8').split('\n');
    if (lines.at(-1) === '') lines.pop();
    return [
      `diff --git a/${file} b/${file}`,
      'new file mode 100644',
      '--- /dev/null',
      `+++ b/${file}`,
      `@@ -0,0 +1,${lines.length} @@`,
      ...lines.map(line => `+${line}`)
    ].join('\n');
  });
  return `${[tracked.trimEnd(), ...added].filter(part => part.length > 0).join('\n')}\n`;
}

/** Diff between two commits of the sample repository. */
export function commitDiff(fromSha: string, toSha: string, repoPath = sampleRepoPath()): string {
  return git(repoPath, ['diff', '--no-color', fromSha, toSha]);
}

export function diffStat(diff: string): { files: string[]; additions: number; deletions: number } {
  const files = new Set<string>();
  let additions = 0;
  let deletions = 0;
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ b/')) files.add(line.slice(6));
    else if (line.startsWith('+') && !line.startsWith('+++')) additions++;
    else if (line.startsWith('-') && !line.startsWith('---')) deletions++;
  }
  return { files: [...files].sort(), additions, deletions };
}

/** Commit everything in the working tree. Returns the new HEAD sha, or the old one when nothing changed. */
export function commitAll(subject: string, identity: GitIdentity, body?: string, repoPath = sampleRepoPath()): string {
  git(repoPath, ['add', '-A']);
  const staged = git(repoPath, ['diff', '--cached', '--name-only']).trim();
  if (staged.length === 0) return headSha(repoPath);
  git(repoPath, ['commit', '-q', ...commitMessageArgs(subject, body)], identity);
  return headSha(repoPath);
}

/** Apply a unified diff to the working tree. Throws with git's message when it does not apply. */
export function applyPatch(patch: string, repoPath = sampleRepoPath()): void {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'epoch-patch-'));
  const file = path.join(dir, 'change.patch');
  try {
    fs.writeFileSync(file, patch, 'utf8');
    git(repoPath, ['apply', '--whitespace=nowarn', file]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** Revert a commit as a new commit. Returns the new HEAD sha. */
export function revertCommit(sha: string, subject: string, identity: GitIdentity, repoPath = sampleRepoPath()): string {
  if (!/^[0-9a-f]{7,40}$/.test(sha)) throw new Error(`Invalid commit sha "${sha}"`);
  git(repoPath, ['revert', '--no-commit', sha]);
  git(repoPath, ['commit', '-q', ...commitMessageArgs(subject)], identity);
  return headSha(repoPath);
}

/** Discard uncommitted changes, including new files. */
export function discardChanges(repoPath = sampleRepoPath()): void {
  git(repoPath, ['reset', '-q', '--hard', 'HEAD']);
  git(repoPath, ['clean', '-q', '-fd']);
}

function removeWorktrees(repoPath: string): void {
  if (!sampleRepoExists(repoPath)) return;
  try {
    git(repoPath, ['worktree', 'prune']);
  } catch {
    // The repository is about to be deleted; a failed prune changes nothing.
  }
}
