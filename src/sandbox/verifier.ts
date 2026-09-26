import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const SANDBOX_REPO_PATH = path.join(process.cwd(), 'packages', 'sample-app');

export interface VerificationCheck {
  name: string;
  passed: boolean;
  output: string;
  durationMs: number;
}

export interface VerificationReport {
  branch: string;
  passed: boolean;
  checks: VerificationCheck[];
  summary: string;
  durationMs: number;
}

/**
 * Runs verification checks in an isolated sandbox branch.
 *
 * The verifier switches to the target branch, executes the sample app's
 * available quality scripts (typecheck, lint when present), and returns a
 * structured report. All commands run inside the sample-app package directory.
 */
export class SandboxVerifier {
  run(branch: string): VerificationReport {
    const start = Date.now();

    this.git(`checkout ${branch}`);

    const checks: VerificationCheck[] = [];
    checks.push(this.runCheck('typecheck', 'pnpm typecheck'));

    if (this.hasScript('lint')) {
      checks.push(this.runCheck('lint', 'pnpm lint'));
    }

    const failed = checks.filter(c => !c.passed);
    const passed = failed.length === 0;
    const durationMs = Date.now() - start;

    return {
      branch,
      passed,
      checks,
      summary: passed
        ? `All ${checks.length} verification check(s) passed.`
        : `${failed.length} of ${checks.length} check(s) failed: ${failed.map(f => f.name).join(', ')}.`,
      durationMs
    };
  }

  private runCheck(name: string, command: string): VerificationCheck {
    const start = Date.now();
    try {
      const output = execSync(command, {
        cwd: SANDBOX_REPO_PATH,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      return {
        name,
        passed: true,
        output: output.trim(),
        durationMs: Date.now() - start
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const stdout = err instanceof Error && 'stdout' in err ? String(err.stdout) : '';
      const stderr = err instanceof Error && 'stderr' in err ? String(err.stderr) : '';
      return {
        name,
        passed: false,
        output: [stdout, stderr, message].filter(Boolean).join('\n').trim(),
        durationMs: Date.now() - start
      };
    }
  }

  private hasScript(name: string): boolean {
    try {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(SANDBOX_REPO_PATH, 'package.json'), 'utf-8')
      ) as { scripts?: Record<string, string> };
      return typeof pkg.scripts?.[name] === 'string';
    } catch {
      return false;
    }
  }

  private git(command: string): string {
    return execSync(`git ${command}`, {
      cwd: SANDBOX_REPO_PATH,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
  }
}

export const sandboxVerifier = new SandboxVerifier();
