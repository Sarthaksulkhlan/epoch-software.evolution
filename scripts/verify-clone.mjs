#!/usr/bin/env node
import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const requiredFiles = ['package.json', 'pnpm-lock.yaml', 'vite.config.ts', 'src/main.tsx', 'docs/CLONE_CHECKLIST.md'];

const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const failures = [];

if (packageJson.packageManager !== 'pnpm@12.6.0') {
  failures.push(`packageManager must be pnpm@12.6.0 (found ${packageJson.packageManager ?? 'missing'})`);
}
if (packageJson.engines?.node !== '>=22.0.0') failures.push('package.json must require Node.js 22 or newer');

for (const file of requiredFiles) {
  try {
    await access(resolve(root, file));
  } catch {
    failures.push(`required file is missing: ${file}`);
  }
}

if (failures.length > 0) {
  console.error('Clone verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Clone verification passed (${requiredFiles.length} required files checked).`);
}
