import path from 'node:path';

const STATIC_IMPORT = /^\s*(?:import|export)\b[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]/gm;
const SIDE_EFFECT_IMPORT = /^\s*import\s*['"]([^'"]+)['"]/gm;
const DYNAMIC_IMPORT = /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g;

/** Module specifiers imported by a TypeScript source file (type-only imports included). */
export function parseImportSpecifiers(source: string): string[] {
  const specifiers = new Set<string>();
  for (const pattern of [STATIC_IMPORT, SIDE_EFFECT_IMPORT, DYNAMIC_IMPORT]) {
    pattern.lastIndex = 0;
    for (const match of source.matchAll(pattern)) {
      if (match[1]) specifiers.add(match[1]);
    }
  }
  return [...specifiers].sort();
}

/**
 * Resolve a relative specifier from `fromFile` (repo-relative, posix) to a
 * repo-relative .ts path, or undefined for packages and unknown files.
 * Node ESM style `./x.js` maps to `./x.ts`.
 */
export function resolveSpecifier(fromFile: string, specifier: string, knownFiles: ReadonlySet<string>): string | undefined {
  if (!specifier.startsWith('.')) return undefined;
  const base = path.posix.join(path.posix.dirname(fromFile), specifier);
  const candidates = [
    base.replace(/\.js$/, '.ts'),
    base,
    `${base}.ts`,
    path.posix.join(base, 'index.ts')
  ];
  return candidates.find(candidate => knownFiles.has(candidate));
}
