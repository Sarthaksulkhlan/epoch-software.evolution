#!/usr/bin/env tsx
import fs from 'node:fs';
import path from 'node:path';
import { apiIsUp, API_URL, fail } from './cli.js';

/**
 * Fetch the evolution report from the running API and write it to
 * EVOLUTION_REPORT.md at the repository root.
 *
 *   pnpm report
 */
async function main(): Promise<void> {
  if (!(await apiIsUp())) {
    throw new Error('EPOCH API is not running. Start it with "pnpm api:dev" or "pnpm dev".');
  }
  const response = await fetch(`${API_URL}/api/v1/report`, {
    headers: { Accept: 'text/markdown' }
  });
  if (!response.ok) throw new Error(`/api/v1/report failed with ${response.status}`);
  const md = await response.text();
  const out = path.join(process.cwd(), 'EVOLUTION_REPORT.md');
  fs.writeFileSync(out, md, 'utf8');
  console.log(`✔ Written to ${out} (${md.length} chars)`);
}

main().catch(fail);
