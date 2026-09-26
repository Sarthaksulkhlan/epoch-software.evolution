import type { DriftPattern, DriftSeverity } from '../../shared/schema/drift-finding.schema.js';
import type { InvariantStatus } from '../../shared/schema/invariant.schema.js';
import type { RepoSpec } from '../scanner/spec.js';
import type { ScanResult } from '../scanner/scanner.js';
import type { ScanDiff } from '../scanner/diff.js';

/** One recorded mutation as the patterns see it. */
export interface PatternEntry {
  mutationId: string;
  scan: ScanResult;
  diff: ScanDiff;
}

/** What a pattern reports; the detector turns it into a persisted finding. */
export interface PatternOutcome {
  pattern: DriftPattern;
  /** Stable identity so repeated detections update one open finding. */
  subject: string;
  severity: DriftSeverity;
  title: string;
  summary: string;
  invariantId?: string;
  components: string[];
  mutationIds: string[];
  measurement: { metric: string; value: number; threshold: number; window: number };
}

export const WINDOW = 5;

/**
 * Boundary erosion (ADR-015): direct imports that bypass a declared module
 * boundary. Warning at the invariant's weakenedAt count, critical at violatedAt.
 */
export function boundaryErosion(history: PatternEntry[], spec: RepoSpec): PatternOutcome[] {
  const latest = history.at(-1);
  if (!latest) return [];
  const outcomes: PatternOutcome[] = [];

  for (const invariant of spec.invariants) {
    if (invariant.rule.type !== 'import-boundary') continue;
    const violations = latest.scan.boundaryViolations.filter(v => v.invariantId === invariant.id);
    if (violations.length < invariant.rule.weakenedAt) continue;

    const introducedBy = violations.map(v => introducedIn(history, e =>
      e.diff.addedViolations.some(a => a.invariantId === v.invariantId && a.importer === v.importer && a.module === v.module)
    ));
    const mutationIds = unique(introducedBy.filter((id): id is string => id !== undefined));
    const components = unique(violations.flatMap(v => [componentOf(v.importer), componentOf(v.module)]));
    outcomes.push({
      pattern: 'boundary_erosion',
      subject: invariant.id,
      severity: violations.length >= invariant.rule.violatedAt ? 'critical' : 'warning',
      title: `Boundary erosion: ${invariant.name}`,
      summary: `${violations.length} direct import(s) bypass the declared boundary: ${violations.map(v => `${v.importer} → ${v.module}`).join('; ')}. Each change passed its own tests.`,
      invariantId: invariant.id,
      components,
      mutationIds,
      measurement: { metric: 'boundary_violations', value: violations.length, threshold: invariant.rule.weakenedAt, window: WINDOW }
    });
  }
  return outcomes;
}

/**
 * Invariant weakening (ADR-015): a non-structural invariant (time, data, tests)
 * has moved away from HOLDING. Warning when WEAKENED, critical when VIOLATED.
 */
export function invariantWeakening(history: PatternEntry[], spec: RepoSpec): PatternOutcome[] {
  const latest = history.at(-1);
  if (!latest) return [];
  const outcomes: PatternOutcome[] = [];

  for (const invariant of spec.invariants) {
    if (invariant.rule.type === 'import-boundary') continue;
    const result = latest.scan.invariants.find(r => r.invariantId === invariant.id);
    if (!result || result.status === 'HOLDING') continue;

    const degradedAt = history
      .filter(e => e.diff.invariantTransitions.some(t => t.invariantId === invariant.id && rank(t.to) > rank(t.from)))
      .map(e => e.mutationId);
    outcomes.push({
      pattern: 'invariant_weakening',
      subject: invariant.id,
      severity: result.status === 'VIOLATED' ? 'critical' : 'warning',
      title: `Invariant weakening: ${invariant.name}`,
      summary: `${invariant.id} is ${result.status}. ${result.detail}.`,
      invariantId: invariant.id,
      components: invariant.components,
      mutationIds: unique(degradedAt),
      measurement: { metric: 'invariant_score', value: result.status === 'VIOLATED' ? 0 : 0.5, threshold: 1, window: WINDOW }
    });
  }
  return outcomes;
}

/**
 * Dependency growth (ADR-015): a component's fan-out rose by at least two
 * cross-component dependencies within the last five mutations.
 */
export function dependencyGrowth(history: PatternEntry[]): PatternOutcome[] {
  const window = history.slice(-WINDOW);
  const latest = window.at(-1);
  const start = window[0];
  if (!latest || !start || window.length < 2) return [];
  const outcomes: PatternOutcome[] = [];

  for (const component of latest.scan.components) {
    const before = start.scan.fanOut[component] ?? 0;
    const now = latest.scan.fanOut[component] ?? 0;
    const growth = now - before;
    if (growth < 2) continue;
    const contributors = window.slice(1)
      .filter(e => e.diff.addedComponentEdges.some(edge => edge.from === component))
      .map(e => e.mutationId);
    const targets = latest.scan.componentEdges.filter(e => e.from === component).map(e => e.to);
    outcomes.push({
      pattern: 'dependency_growth',
      subject: component,
      severity: growth >= 3 ? 'critical' : 'warning',
      title: `Dependency growth: ${component}`,
      summary: `${component} now depends on ${now} components (${targets.join(', ')}), up from ${before} ${window.length - 1} mutations ago.`,
      components: unique([component, ...targets]),
      mutationIds: unique(contributors),
      measurement: { metric: 'fan_out', value: now, threshold: before + 2, window: WINDOW }
    });
  }
  return outcomes;
}

export function runPatterns(history: PatternEntry[], spec: RepoSpec): PatternOutcome[] {
  return [...boundaryErosion(history, spec), ...invariantWeakening(history, spec), ...dependencyGrowth(history)];
}

function introducedIn(history: PatternEntry[], predicate: (entry: PatternEntry) => boolean): string | undefined {
  for (let i = history.length - 1; i >= 0; i--) {
    const entry = history[i]!;
    if (predicate(entry)) return entry.mutationId;
  }
  return undefined;
}

function componentOf(file: string): string {
  const parts = file.split('/');
  return parts.length > 2 && parts[0] === 'src' ? parts[1] ?? 'root' : 'root';
}

function rank(status: InvariantStatus): number {
  return status === 'HOLDING' ? 0 : status === 'WEAKENED' ? 1 : 2;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
