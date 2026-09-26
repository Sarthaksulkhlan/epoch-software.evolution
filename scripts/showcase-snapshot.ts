#!/usr/bin/env tsx
import fs from 'node:fs';
import { fail } from './cli.js';

/**
 * Build the public demo's showcase (drift recorded, INC-3312 open, futures A
 * and B measured) and save it to EPOCH_SHOWCASE_SNAPSHOT. The container image
 * runs this at build time so a hosted instance restores it in a moment instead
 * of re-running every test at boot.
 */
async function main(): Promise<void> {
  const target = process.env.EPOCH_SHOWCASE_SNAPSHOT;
  if (!target) throw new Error('Set EPOCH_SHOWCASE_SNAPSHOT to the directory the snapshot should be written to');
  fs.rmSync(target, { recursive: true, force: true });

  const { publicDemo } = await import('../src/api/public-demo.js');
  const { closeDb } = await import('../src/store/index.js');
  const started = Date.now();
  const state = await publicDemo.buildShowcase();
  closeDb();
  if (state !== 'ready') throw new Error('Preparing the showcase failed');
  console.log(`✔ Showcase saved to ${target} in ${Date.now() - started} ms`);
}

main().catch(fail);
