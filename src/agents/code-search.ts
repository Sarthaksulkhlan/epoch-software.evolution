import fs from 'node:fs';
import path from 'node:path';

export interface NumericConstant {
  file: string;
  name: string;
  value: number;
  line: number;
}

/** Components whose code reaches customers directly in the sample service. */
export const CUSTOMER_FACING = new Set(['api', 'orders', 'notifications']);

export function listSource(repoPath: string): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.ts')) out.push(path.relative(repoPath, full).split(path.sep).join('/'));
    }
  };
  walk(path.join(repoPath, 'src'));
  return out.sort();
}

/** Exported numeric constants in src/, e.g. `export const CHARGEBACK_WINDOW_DAYS = 15;`. */
export function numericConstants(repoPath: string): NumericConstant[] {
  const found: NumericConstant[] = [];
  const pattern = /^export\s+const\s+([A-Z][A-Z0-9_]*)\s*(?::\s*number\s*)?=\s*([0-9][0-9_]*)\s*;/;
  for (const file of listSource(repoPath)) {
    const lines = fs.readFileSync(path.join(repoPath, file), 'utf8').split('\n');
    lines.forEach((text, index) => {
      const match = pattern.exec(text.trim());
      if (match?.[1] && match[2]) {
        found.push({ file, name: match[1], value: Number.parseInt(match[2].replace(/_/g, ''), 10), line: index + 1 });
      }
    });
  }
  return found;
}

export function componentOfFile(file: string): string {
  const parts = file.split('/');
  return parts.length > 2 ? parts[1] ?? 'root' : 'root';
}

/** Lowercase word stems of length ≥ 4 from free text. */
export function keywords(text: string): string[] {
  return [...new Set(text.toLowerCase().match(/[a-z][a-z-]{3,}/g) ?? [])];
}

/** Numbers mentioned in free text. */
export function numbersIn(text: string): number[] {
  return [...new Set((text.match(/\b\d+\b/g) ?? []).map(n => Number.parseInt(n, 10)))];
}

/** Added lines of a unified diff, with their file. */
export function addedLines(diff: string): Array<{ file: string; text: string }> {
  const out: Array<{ file: string; text: string }> = [];
  let file = '';
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ b/')) file = line.slice(6);
    else if (line.startsWith('+') && !line.startsWith('+++')) out.push({ file, text: line.slice(1) });
  }
  return out;
}

export function changedFilesOf(diff: string): string[] {
  return [...new Set(diff.split('\n').filter(l => l.startsWith('+++ b/')).map(l => l.slice(6)))].sort();
}
