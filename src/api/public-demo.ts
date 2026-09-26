import fs from 'node:fs';
import path from 'node:path';
import type { MiddlewareHandler } from 'hono';
import { eventBus } from '../core/events/bus.js';
import { clearRepoSpecCache } from '../core/epoch/spec-registry.js';
import { resetDemo } from '../demo/seed.js';
import { prepareFutures, replayDrift } from '../demo/replay.js';
import { epochWorkDir } from '../sandbox/sample-repo.js';
import { closeDb, deleteDbFile, getDb, getDbPath, initializeSchema } from '../store/index.js';

/**
 * Public demo mode (EPOCH_PUBLIC_DEMO=1) for a hosted instance anyone can open.
 *
 * Reads stay open. Writes are limited to actions that only run EPOCH's own code
 * against the sample service: adopt a measured future, run its remediation
 * workflow to the approval gate, decide at the gate, and restore the showcase.
 * Everything else, including every route that accepts a patch, a file path or
 * free-form evidence, answers 403: a patch applied to a worktree becomes code
 * the moment its tests run.
 *
 * The showcase is the demo's most informative moment: the chargeback feature
 * and the three AI changes are recorded, INC-3312 is open and futures A and B
 * are measured, waiting for a reviewer. It is rebuilt at boot, on request, and
 * after a period without activity. With EPOCH_SHOWCASE_SNAPSHOT set, the first
 * build is saved there (database and working directory) and later restores copy
 * it back, which takes a moment instead of re-running every test; the container
 * image bakes the snapshot in at build time.
 */

const ALLOWED_WRITES: readonly RegExp[] = [
  /^\/api\/v1\/simulations\/remediate$/,
  /^\/api\/workflows\/[A-Za-z0-9_-]+\/run-to-approval$/,
  /^\/api\/v1\/workflows\/[A-Za-z0-9_-]+\/decision$/,
  /^\/api\/demo\/showcase$/
];

const SHOWCASE_PATH = '/api/demo/showcase';
const RESTORE_COOLDOWN_MS = 60_000;
const IDLE_CHECK_MS = 60_000;

export type ShowcaseState = 'idle' | 'building' | 'ready' | 'failed';

export interface DemoStatus {
  mode: 'public' | 'local';
  showcase: ShowcaseState;
  restoresAfterIdleMinutes: number | null;
}

export class ShowcaseBusyError extends Error {
  constructor() {
    super('The showcase is already being prepared');
  }
}

class PublicDemo {
  private busy = false;
  private dirty = false;
  private lastActionAt = 0;
  private lastBuiltAt = 0;
  private timer: NodeJS.Timeout | undefined;
  state: ShowcaseState = 'idle';

  get enabled(): boolean {
    return ['1', 'true'].includes((process.env.EPOCH_PUBLIC_DEMO ?? '').toLowerCase());
  }

  private get restoreAfterMs(): number {
    return (Number.parseInt(process.env.EPOCH_DEMO_RESTORE_MINUTES ?? '', 10) || 20) * 60_000;
  }

  status(): DemoStatus {
    return {
      mode: this.enabled ? 'public' : 'local',
      showcase: this.state,
      restoresAfterIdleMinutes: this.enabled ? this.restoreAfterMs / 60_000 : null
    };
  }

  /** Middleware for /api/*: reads pass, allowed writes run one at a time, the rest are refused. */
  guard(): MiddlewareHandler {
    return async (c, next) => {
      const method = c.req.method;
      if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return next();
      const path = c.req.path;
      if (!ALLOWED_WRITES.some(pattern => pattern.test(path))) {
        return c.json({
          error: 'This public demo is read-only apart from adopting a future and deciding at the approval gate. Clone the repository to drive EPOCH yourself.'
        }, 403);
      }
      if (this.busy) {
        return c.json({
          error: this.state === 'building' ? 'The demo is being prepared; try again in a minute' : 'Another action is running; try again in a few seconds'
        }, 429);
      }
      if (path === SHOWCASE_PATH && Date.now() - this.lastBuiltAt < RESTORE_COOLDOWN_MS) {
        return c.json({ error: 'The showcase was restored less than a minute ago' }, 429);
      }
      this.busy = true;
      try {
        await next();
      } finally {
        this.busy = false;
        if (path !== SHOWCASE_PATH && c.res.status < 400) {
          this.dirty = true;
          this.lastActionAt = Date.now();
        }
      }
    };
  }

  /** Reset the demo and replay it up to the moment a reviewer chooses a future. */
  async buildShowcase(): Promise<ShowcaseState> {
    if (this.state === 'building') throw new ShowcaseBusyError();
    const wasBusy = this.busy;
    this.busy = true;
    this.state = 'building';
    try {
      const snapshot = process.env.EPOCH_SHOWCASE_SNAPSHOT;
      if (snapshot && hasSnapshot(snapshot)) {
        restoreSnapshot(snapshot);
      } else {
        await resetDemo();
        await replayDrift({ withFeature: true });
        await prepareFutures();
        if (snapshot) saveSnapshot(snapshot);
      }
      this.state = 'ready';
      this.dirty = false;
      this.lastBuiltAt = Date.now();
      eventBus.emit('demo.reset', { showcase: 'ready' });
    } catch (error) {
      this.state = 'failed';
      console.error('Public demo: preparing the showcase failed', error);
    } finally {
      this.busy = wasBusy;
    }
    return this.state;
  }

  /** Build the showcase now and restore it whenever the demo has been changed and left idle. */
  start(): void {
    if (!this.enabled || this.timer) return;
    void this.buildShowcase().catch(() => undefined);
    this.timer = setInterval(() => {
      if (this.busy || !this.dirty || Date.now() - this.lastActionAt < this.restoreAfterMs) return;
      void this.buildShowcase().catch(() => undefined);
    }, IDLE_CHECK_MS);
    this.timer.unref();
  }
}

function hasSnapshot(dir: string): boolean {
  return fs.existsSync(path.join(dir, 'epoch.db')) && fs.existsSync(path.join(dir, 'work'));
}

/** Copy the closed database and the working directory (sample repo, futures worktrees) aside. */
function saveSnapshot(dir: string): void {
  closeDb();
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(getDbPath(), path.join(dir, 'epoch.db'));
  fs.cpSync(epochWorkDir(), path.join(dir, 'work'), { recursive: true });
}

/**
 * Put a saved showcase back in place. Worktrees record absolute paths, so the
 * snapshot is only valid for the same EPOCH_WORK_DIR it was taken from.
 */
function restoreSnapshot(dir: string): void {
  deleteDbFile();
  fs.mkdirSync(path.dirname(getDbPath()), { recursive: true });
  fs.copyFileSync(path.join(dir, 'epoch.db'), getDbPath());
  fs.rmSync(epochWorkDir(), { recursive: true, force: true });
  fs.cpSync(path.join(dir, 'work'), epochWorkDir(), { recursive: true });
  clearRepoSpecCache();
  initializeSchema(getDb());
}

export const publicDemo = new PublicDemo();
