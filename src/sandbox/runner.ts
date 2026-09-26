import { execFile } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** tsx's ESM loader, resolved from the platform so repos outside the project (tests, worktrees) can run TypeScript. */
const TSX_LOADER = pathToFileURL(
  path.join(path.dirname(createRequire(import.meta.url).resolve('tsx/package.json')), 'dist', 'esm', 'index.mjs')
).href;

export interface TestFileResult {
  file: string;
  passed: number;
  failed: number;
  ok: boolean;
}

export interface TestRun {
  passed: number;
  failed: number;
  files: TestFileResult[];
  /** When the run started; identifies results carried forward from an earlier scan. */
  startedAt: number;
  durationMs: number;
}

export interface ProbeResult {
  id: string;
  ok: boolean;
  detail: string;
}

export function listTestFiles(repoPath: string): string[] {
  const dir = path.join(repoPath, 'test');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(name => name.endsWith('.test.ts'))
    .sort()
    .map(name => `test/${name}`);
}

/** Run each test file in its own node:test process, in parallel. */
export async function runTests(repoPath: string): Promise<TestRun> {
  const started = Date.now();
  const files = await Promise.all(listTestFiles(repoPath).map(file => runTestFile(repoPath, file)));
  return {
    passed: files.reduce((sum, f) => sum + f.passed, 0),
    failed: files.reduce((sum, f) => sum + f.failed, 0),
    files,
    startedAt: started,
    durationMs: Date.now() - started
  };
}

async function runTestFile(repoPath: string, file: string): Promise<TestFileResult> {
  let output: string;
  try {
    const result = await execFileAsync(process.execPath, ['--import', TSX_LOADER, '--test', '--test-reporter=tap', file], {
      cwd: repoPath,
      encoding: 'utf8',
      timeout: 60_000
    });
    output = result.stdout;
  } catch (error) {
    // node --test exits non-zero when a test fails; the TAP output is still on stdout.
    output = (error as { stdout?: string }).stdout ?? '';
  }
  const passed = readTapCount(output, 'pass');
  const failed = readTapCount(output, 'fail');
  const ranSomething = passed + failed > 0;
  return { file, passed, failed: ranSomething ? failed : Math.max(failed, 1), ok: ranSomething && failed === 0 };
}

function readTapCount(output: string, key: 'pass' | 'fail'): number {
  const match = new RegExp(`^# ${key} (\\d+)`, 'm').exec(output);
  return match?.[1] ? Number.parseInt(match[1], 10) : 0;
}

/** Run the runtime probes (scenarios/run.ts), which print a JSON array of results. */
export async function runProbes(repoPath: string): Promise<ProbeResult[]> {
  const entry = path.join(repoPath, 'scenarios', 'run.ts');
  if (!fs.existsSync(entry)) return [];
  try {
    const { stdout } = await execFileAsync(process.execPath, ['--import', TSX_LOADER, 'scenarios/run.ts'], {
      cwd: repoPath,
      encoding: 'utf8',
      timeout: 60_000
    });
    const parsed = JSON.parse(stdout.trim().split('\n').pop() ?? '[]') as unknown;
    return Array.isArray(parsed) ? parsed.filter(isProbeResult) : [];
  } catch (error) {
    const message = error instanceof Error ? error.message.split('\n')[0] ?? 'probe runner failed' : 'probe runner failed';
    return [{ id: 'probe-runner', ok: false, detail: `Probe runner crashed: ${message}` }];
  }
}

function isProbeResult(value: unknown): value is ProbeResult {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === 'string' && typeof record.ok === 'boolean' && typeof record.detail === 'string';
}
