import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { closeDb, setDbPath } from '../../src/store/index.js';
import { clearRepoSpecCache } from '../../src/core/epoch/spec-registry.js';

/**
 * Give a test file its own database and working directory so it never touches
 * the developer's demo state in data/ and .epoch/.
 */
export function isolate(label: string): { dir: string; cleanup: () => void } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `epoch-${label}-`));
  process.env.EPOCH_WORK_DIR = path.join(dir, 'work');
  delete process.env.EPOCH_SAMPLE_REPO;
  setDbPath(path.join(dir, 'epoch.db'));
  clearRepoSpecCache();
  return {
    dir,
    cleanup: () => {
      closeDb();
      try {
        fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      } catch {
        // Windows can hold git or SQLite handles briefly; a leftover temp dir is harmless.
      }
    }
  };
}

export function historyPatch(relative: string): string {
  return fs.readFileSync(path.join(process.cwd(), 'packages', 'sample-app', 'history', relative), 'utf8');
}
