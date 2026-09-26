import { driftFindings } from '../../store/index.js';
import type { DriftFinding } from '../../shared/schema/drift-finding.schema.js';
import type { RepoSpec } from '../scanner/spec.js';
import { runPatterns, type PatternEntry, type PatternOutcome } from './patterns.js';

/** First finding id; keeps ids stable across demo resets (DRIFT-401, DRIFT-402, …). */
const FINDING_FLOOR = 401;

export interface DriftRun {
  detected: DriftFinding[];
  escalated: DriftFinding[];
  resolved: DriftFinding[];
}

export type EvidenceRecorder = (claim: string, severity: 'medium' | 'high' | 'critical') => string;

/**
 * Runs the deterministic patterns after each mutation and keeps one open
 * finding per (pattern, subject). Measurements are observed; the earliest
 * plausible mutation attached to a finding is a hypothesis.
 */
export class DriftDetector {
  run(history: PatternEntry[], spec: RepoSpec, mutationId: string, at: number, recordEvidence: EvidenceRecorder): DriftRun {
    const outcomes = runPatterns(history, spec);
    const open = driftFindings.listDriftFindings({ status: 'open' });
    const result: DriftRun = { detected: [], escalated: [], resolved: [] };

    for (const outcome of outcomes) {
      const existing = open.find(f => f.pattern === outcome.pattern && subjectOf(f) === outcome.subject);
      const severityWord = outcome.severity === 'critical' ? 'critical' : 'high';
      if (!existing) {
        const evidenceId = recordEvidence(`${outcome.title} (${outcome.severity}): ${outcome.summary}`, severityWord);
        const finding = this.toFinding(outcome, mutationId, at, [evidenceId]);
        driftFindings.insertDriftFinding(finding);
        result.detected.push(finding);
        continue;
      }
      const changed = existing.severity !== outcome.severity
        || existing.measurement.value !== outcome.measurement.value
        || existing.mutation_ids.join() !== outcome.mutationIds.join();
      if (!changed) continue;
      const evidenceId = recordEvidence(`${outcome.title} now ${outcome.severity}: ${outcome.summary}`, severityWord);
      const updated: DriftFinding = {
        ...existing,
        severity: outcome.severity,
        title: outcome.title,
        summary: outcome.summary,
        components: outcome.components,
        mutation_ids: outcome.mutationIds,
        evidence_refs: [...existing.evidence_refs, evidenceId],
        measurement: outcome.measurement
      };
      const earliest = earliestOf(outcome.mutationIds);
      if (earliest) updated.earliest_plausible_mutation_id = earliest;
      driftFindings.updateOpenFinding(updated);
      if (existing.severity !== outcome.severity) result.escalated.push(updated);
    }

    for (const finding of open) {
      const stillPresent = outcomes.some(o => o.pattern === finding.pattern && o.subject === subjectOf(finding));
      if (stillPresent) continue;
      driftFindings.resolveDriftFinding(finding.finding_id, mutationId);
      result.resolved.push({ ...finding, status: 'resolved', resolved_by_mutation_id: mutationId });
    }
    return result;
  }

  private toFinding(outcome: PatternOutcome, mutationId: string, at: number, evidenceRefs: string[]): DriftFinding {
    const finding: DriftFinding = {
      finding_id: `DRIFT-${driftFindings.nextDriftSequence(FINDING_FLOOR)}`,
      pattern: outcome.pattern,
      severity: outcome.severity,
      title: outcome.title,
      summary: outcome.summary,
      components: outcome.components,
      mutation_ids: outcome.mutationIds,
      evidence_refs: evidenceRefs,
      measurement: outcome.measurement,
      status: 'open',
      detected_at: at,
      detected_by_mutation_id: mutationId
    };
    if (outcome.invariantId) finding.invariant_id = outcome.invariantId;
    const earliest = earliestOf(outcome.mutationIds);
    if (earliest) finding.earliest_plausible_mutation_id = earliest;
    return finding;
  }
}

/** Findings are keyed by invariant for invariant patterns and by component for dependency growth. */
export function subjectOf(finding: DriftFinding): string {
  return finding.pattern === 'dependency_growth' ? finding.components[0] ?? '' : finding.invariant_id ?? '';
}

function earliestOf(mutationIds: string[]): string | undefined {
  return [...mutationIds].sort((a, b) => sequence(a) - sequence(b))[0];
}

function sequence(mutationId: string): number {
  const match = /^M-(\d+)$/.exec(mutationId);
  return match?.[1] ? Number.parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
}

export const driftDetector = new DriftDetector();
