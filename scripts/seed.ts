#!/usr/bin/env tsx
import fs from 'node:fs';
import { fail } from './cli.js';

/** Seed only when there is no demo state yet; use `pnpm demo-reset` to start over. */
async function main(): Promise<void> {
  const { getDb, getDbPath, initializeSchema, mutations, closeDb } = await import('../src/store/index.js');
  if (fs.existsSync(getDbPath())) {
    initializeSchema(getDb());
    const count = mutations.countMutations();
    closeDb();
    if (count > 0) {
      console.log(`Already seeded (${count} mutations in ${getDbPath()}). Run "pnpm demo-reset" to start over.`);
      return;
    }
  }
  await import('./demo-reset.js');
}

main().catch(fail);
