import fs from 'node:fs';
import path from 'node:path';
import { sha256 } from '../../shared/utils/hash.js';
import type { InvariantStatus } from '../../shared/schema/invariant.schema.js';
import type { ProbeResult, TestRun } from '../../sandbox/runner.js';
import { parseImportSpecifiers, resolveSpecifier } from './imports.js';
import { constantKey, referencedConstants, type InvariantSpec, type RepoSpec } from './spec.js';

export const SCAN_VERSION = 1;

export interface ModuleEdge {
  from: string;
  to: string;
}

export interface ComponentEdge {
  from: string;
  to: string;
  /** Number of module-level imports behind this component dependency. */
  via: number;
}

export interface BoundaryViolation {
  invariantId: string;
  module: string;
  importer: string;
}

export interface InvariantResult {
  invariantId: string;
  status: InvariantStatus;
  /** False when the rule could not be evaluated in this scan and the previous status was carried forward. */
  evaluated: boolean;
  detail: string;
}

export interface ConsistencyResult {
  id: string;
  ok: boolean;
  detail: string;
}

export interface ScanResult {
  version: number;
  files: string[];
  components: string[];
  moduleEdges: ModuleEdge[];
  componentEdges: ComponentEdge[];
  fanOut: Record<string, number>;
  couplingScore: number;
  constants: Record<string, number>;
  boundaryViolations: BoundaryViolation[];
  invariants: InvariantResult[];
  consistency: ConsistencyResult[];
  boundaryIntegrityScore: number;
  tests?: TestRun;
  probes?: ProbeResult[];
  stateHash: string;
}

export interface ScanOptions {
  tests?: TestRun | undefined;
  probes?: ProbeResult[] | undefined;
  /** Used to carry forward test results and test-based invariants when tests were not run. */
  previous?: ScanResult | undefined;
}

const STATUS_SCORE: Record<InvariantStatus, number> = { HOLDING: 1, WEAKENED: 0.5, VIOLATED: 0 };

/** Deterministic structural scan of a watched repository's src/ tree. */
export function scanRepository(repoPath: string, spec: RepoSpec, options: ScanOptions = {}): ScanResult {
  const files = listSourceFiles(repoPath);
  const known = new Set(files);

  const moduleEdges: ModuleEdge[] = [];
  for (const file of files) {
    const source = fs.readFileSync(path.join(repoPath, file), 'utf8');
    for (const specifier of parseImportSpecifiers(source)) {
      const target = resolveSpecifier(file, specifier, known);
      if (target && target !== file) moduleEdges.push({ from: file, to: target });
    }
  }
  moduleEdges.sort(compareEdges);

  const components = [...new Set(files.map(componentOf))].sort();
  const componentEdges = buildComponentEdges(moduleEdges);
  const fanOut = Object.fromEntries(components.map(c => [c, componentEdges.filter(e => e.from === c).length]));
  const n = components.length;
  const couplingScore = n > 1 ? round4(componentEdges.length / (n * (n - 1))) : 0;

  const constants = readConstants(repoPath, spec, known);
  const tests = options.tests ?? options.previous?.tests;
  const probes = options.probes ?? options.previous?.probes;

  const boundaryViolations: BoundaryViolation[] = [];
  const invariants = spec.invariants.map(invariant =>
    evaluateInvariant(invariant, { moduleEdges, constants, tests, previous: options.previous, violations: boundaryViolations })
  );

  const consistency = spec.consistency.map(check => {
    const values = check.constants.map(ref => constants[constantKey(ref)]);
    const known = values.filter((v): v is number => v !== undefined);
    const ok = known.length === values.length && known.every(v => v === known[0]);
    const listing = check.constants.map((ref, i) => `${ref.name}=${values[i] ?? 'missing'}`).join(', ');
    return { id: check.id, ok, detail: `${check.description}: ${listing}` };
  });

  const boundaryIntegrityScore = invariants.length > 0
    ? round4(invariants.reduce((sum, r) => sum + STATUS_SCORE[r.status], 0) / invariants.length)
    : 1;

  const result: ScanResult = {
    version: SCAN_VERSION,
    files,
    components,
    moduleEdges,
    componentEdges,
    fanOut,
    couplingScore,
    constants,
    boundaryViolations,
    invariants,
    consistency,
    boundaryIntegrityScore,
    stateHash: sha256(JSON.stringify({ files, moduleEdges, constants }))
  };
  if (tests) result.tests = tests;
  if (probes) result.probes = probes;
  return result;
}

export function componentOf(file: string): string {
  const parts = file.split('/');
  return parts.length > 2 && parts[0] === 'src' ? parts[1] ?? 'root' : 'root';
}

function listSourceFiles(repoPath: string): string[] {
  const root = path.join(repoPath, 'src');
  const out: string[] = [];
  const walk = (dir: string): void => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
        out.push(path.relative(repoPath, full).split(path.sep).join('/'));
      }
    }
  };
  walk(root);
  return out.sort();
}

function buildComponentEdges(moduleEdges: ModuleEdge[]): ComponentEdge[] {
  const counts = new Map<string, ComponentEdge>();
  for (const edge of moduleEdges) {
    const from = componentOf(edge.from);
    const to = componentOf(edge.to);
    if (from === to) continue;
    const key = `${from}->${to}`;
    const existing = counts.get(key);
    if (existing) existing.via += 1;
    else counts.set(key, { from, to, via: 1 });
  }
  return [...counts.values()].sort(compareEdges);
}

function readConstants(repoPath: string, spec: RepoSpec, known: ReadonlySet<string>): Record<string, number> {
  const values: Record<string, number> = {};
  for (const ref of referencedConstants(spec)) {
    if (!known.has(ref.file)) continue;
    const source = fs.readFileSync(path.join(repoPath, ref.file), 'utf8');
    const pattern = new RegExp(`export\\s+const\\s+${escapeRegExp(ref.name)}\\s*(?::\\s*number\\s*)?=\\s*([0-9][0-9_]*)`);
    const match = pattern.exec(source);
    if (match?.[1]) values[constantKey(ref)] = Number.parseInt(match[1].replace(/_/g, ''), 10);
  }
  return values;
}

interface RuleContext {
  moduleEdges: ModuleEdge[];
  constants: Record<string, number>;
  tests: TestRun | undefined;
  previous: ScanResult | undefined;
  violations: BoundaryViolation[];
}

function evaluateInvariant(invariant: InvariantSpec, ctx: RuleContext): InvariantResult {
  const rule = invariant.rule;
  const carried = (reason: string): InvariantResult => {
    const prior = ctx.previous?.invariants.find(r => r.invariantId === invariant.id);
    return { invariantId: invariant.id, status: prior?.status ?? 'HOLDING', evaluated: false, detail: `${reason}; status carried forward` };
  };

  switch (rule.type) {
    case 'import-boundary': {
      const found: BoundaryViolation[] = [];
      for (const guarded of rule.modules) {
        for (const edge of ctx.moduleEdges) {
          if (edge.to !== guarded.module) continue;
          const allowed = guarded.allowedImporters.some(prefix => edge.from === prefix || edge.from.startsWith(prefix));
          if (!allowed) found.push({ invariantId: invariant.id, module: guarded.module, importer: edge.from });
        }
      }
      ctx.violations.push(...found);
      const status: InvariantStatus = found.length >= rule.violatedAt ? 'VIOLATED' : found.length >= rule.weakenedAt ? 'WEAKENED' : 'HOLDING';
      const detail = found.length === 0
        ? `No imports cross the guarded modules (${rule.modules.map(m => m.module).join(', ')})`
        : `${found.length} boundary violation(s): ${found.map(v => `${v.importer} → ${v.module}`).join('; ')}`;
      return { invariantId: invariant.id, status, evaluated: true, detail };
    }
    case 'constant-order': {
      const lesser = ctx.constants[constantKey(rule.lesser)];
      const greater = ctx.constants[constantKey(rule.greater)];
      if (lesser === undefined || greater === undefined) return carried('Constants not found');
      if (lesser <= greater) {
        return { invariantId: invariant.id, status: 'HOLDING', evaluated: true, detail: `${rule.lesser.name}=${lesser} ≤ ${rule.greater.name}=${greater}` };
      }
      const escalation = rule.escalateWhen;
      const exposedBy = escalation
        ? ctx.moduleEdges.filter(e => e.to === escalation.module && !e.from.startsWith(escalation.importedOutside)).map(e => e.from)
        : [];
      const status: InvariantStatus = exposedBy.length > 0 ? 'VIOLATED' : 'WEAKENED';
      const detail = exposedBy.length > 0
        ? `${rule.lesser.name}=${lesser} > ${rule.greater.name}=${greater}, and ${exposedBy.join(', ')} read ${escalation?.module ?? ''} directly`
        : `${rule.lesser.name}=${lesser} > ${rule.greater.name}=${greater}; no code path reads the table directly yet`;
      return { invariantId: invariant.id, status, evaluated: true, detail };
    }
    case 'test': {
      const file = ctx.tests?.files.find(f => f.file === rule.file);
      if (!file) return carried(`${rule.file} was not run in this scan`);
      return {
        invariantId: invariant.id,
        status: file.ok ? 'HOLDING' : 'VIOLATED',
        evaluated: true,
        detail: `${rule.file}: ${file.passed} passed, ${file.failed} failed`
      };
    }
  }
}

function compareEdges(a: { from: string; to: string }, b: { from: string; to: string }): number {
  return a.from === b.from ? a.to.localeCompare(b.to) : a.from.localeCompare(b.from);
}

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
