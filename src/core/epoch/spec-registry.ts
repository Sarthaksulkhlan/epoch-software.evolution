import fs from 'node:fs';
import path from 'node:path';
import { loadSpec, type InvariantSpec, type RepoSpec } from '../../graph/scanner/spec.js';
import { SAMPLE_APP_SOURCE, sampleRepoPath } from '../../sandbox/sample-repo.js';

let cached: RepoSpec | undefined;

/**
 * The invariant spec of the watched repository. Read from the sample repo when
 * it exists (it can evolve with the code) and from packages/sample-app otherwise.
 */
export function getRepoSpec(): RepoSpec {
  if (!cached) {
    const repo = sampleRepoPath();
    cached = loadSpec(fs.existsSync(path.join(repo, 'invariants.json')) ? repo : SAMPLE_APP_SOURCE);
  }
  return cached;
}

export function clearRepoSpecCache(): void {
  cached = undefined;
}

export function getInvariantSpec(invariantId: string): InvariantSpec | undefined {
  return getRepoSpec().invariants.find(i => i.id === invariantId);
}
