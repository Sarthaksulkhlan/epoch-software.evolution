import { getDb } from '../db.js';
import { compact, decodeJson, json, param, type Row } from '../rows.js';
import { DriftFindingSchema, type DriftFinding } from '../../shared/schema/drift-finding.schema.js';

const JSON_COLUMNS = ['components', 'mutation_ids', 'evidence_refs', 'measurement'] as const;

function toFinding(row: Row): DriftFinding {
  return DriftFindingSchema.parse(compact(decodeJson(row, JSON_COLUMNS)));
}

export function insertDriftFinding(finding: DriftFinding): void {
  getDb().prepare(`
    INSERT INTO drift_findings (
      finding_id, pattern, severity, title, summary, invariant_id, components,
      mutation_ids, evidence_refs, earliest_plausible_mutation_id, measurement,
      status, detected_at, detected_by_mutation_id, resolved_by_mutation_id
    ) VALUES (
      @finding_id, @pattern, @severity, @title, @summary, @invariant_id, @components,
      @mutation_ids, @evidence_refs, @earliest_plausible_mutation_id, @measurement,
      @status, @detected_at, @detected_by_mutation_id, @resolved_by_mutation_id
    )
  `).run({
    finding_id: finding.finding_id,
    pattern: finding.pattern,
    severity: finding.severity,
    title: finding.title,
    summary: finding.summary,
    invariant_id: param(finding.invariant_id),
    components: json(finding.components),
    mutation_ids: json(finding.mutation_ids),
    evidence_refs: json(finding.evidence_refs),
    earliest_plausible_mutation_id: param(finding.earliest_plausible_mutation_id),
    measurement: json(finding.measurement),
    status: finding.status,
    detected_at: finding.detected_at,
    detected_by_mutation_id: finding.detected_by_mutation_id,
    resolved_by_mutation_id: param(finding.resolved_by_mutation_id)
  });
}

export function getDriftFinding(findingId: string): DriftFinding | undefined {
  const row = getDb().prepare('SELECT * FROM drift_findings WHERE finding_id = ?').get(findingId) as Row | undefined;
  return row ? toFinding(row) : undefined;
}

export function listDriftFindings(options: { status?: 'open' | 'resolved' | undefined } = {}): DriftFinding[] {
  const params: unknown[] = [];
  let sql = 'SELECT * FROM drift_findings';
  if (options.status) {
    sql += ' WHERE status = ?';
    params.push(options.status);
  }
  sql += ' ORDER BY detected_at DESC, rowid DESC';
  return (getDb().prepare(sql).all(...params) as Row[]).map(toFinding);
}

/** Replace severity, measurement and chain of a finding that is still open. */
export function updateOpenFinding(finding: DriftFinding): void {
  getDb().prepare(`
    UPDATE drift_findings
    SET severity = @severity, title = @title, summary = @summary, components = @components,
        mutation_ids = @mutation_ids, evidence_refs = @evidence_refs,
        earliest_plausible_mutation_id = @earliest_plausible_mutation_id, measurement = @measurement
    WHERE finding_id = @finding_id
  `).run({
    finding_id: finding.finding_id,
    severity: finding.severity,
    title: finding.title,
    summary: finding.summary,
    components: json(finding.components),
    mutation_ids: json(finding.mutation_ids),
    evidence_refs: json(finding.evidence_refs),
    earliest_plausible_mutation_id: param(finding.earliest_plausible_mutation_id),
    measurement: json(finding.measurement)
  });
}

export function resolveDriftFinding(findingId: string, mutationId: string): void {
  getDb()
    .prepare("UPDATE drift_findings SET status = 'resolved', resolved_by_mutation_id = ? WHERE finding_id = ?")
    .run(mutationId, findingId);
}

export function nextDriftSequence(floor: number): number {
  const row = getDb()
    .prepare('SELECT MAX(CAST(SUBSTR(finding_id, 7) AS INTEGER)) AS max FROM drift_findings')
    .get() as { max: number | null };
  return Math.max(floor, (row.max ?? floor - 1) + 1);
}
