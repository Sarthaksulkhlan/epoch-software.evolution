import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** Identifiers that end up in branch names, paths or commit metadata. */
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;

export function assertSafeId(value: string, label: string): string {
  if (!SAFE_ID.test(value)) {
    throw new Error(`Invalid ${label} "${value}": use 1-64 letters, digits, "_" or "-"`);
  }
  return value;
}

export interface GitIdentity {
  name: string;
  email: string;
}

const DEFAULT_IDENTITY: GitIdentity = { name: 'EPOCH', email: 'epoch@localhost' };

/**
 * Run git without a shell. Arguments are passed as an array, so values such
 * as commit messages can never be interpreted as shell syntax.
 */
export function git(cwd: string, args: readonly string[], identity: GitIdentity = DEFAULT_IDENTITY): string {
  return execFileSync('git', gitArgs(args, identity), {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 16 * 1024 * 1024
  });
}

export async function gitAsync(cwd: string, args: readonly string[], identity: GitIdentity = DEFAULT_IDENTITY): Promise<string> {
  const { stdout } = await execFileAsync('git', gitArgs(args, identity), { cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  return stdout;
}

function gitArgs(args: readonly string[], identity: GitIdentity): string[] {
  return [
    // Read-only commands must not take the index lock while agents run in parallel.
    '--no-optional-locks',
    '-c', 'core.autocrlf=false',
    '-c', `user.name=${identity.name}`,
    '-c', `user.email=${identity.email}`,
    '-c', 'commit.gpgsign=false',
    ...args
  ];
}

/** Commit messages go through a temp-free path: `-m` receives the raw string as one argv entry. */
export function commitMessageArgs(subject: string, body?: string): string[] {
  return body ? ['-m', subject, '-m', body] : ['-m', subject];
}
