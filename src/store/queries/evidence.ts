import { getDb } from '../db.js';
import { compact, param, type Row } from '../rows.js';
import { EvidenceSchema, type Evidence, type EvidenceStatus } from '../../shared/schema/evidence.schema.js';

function toEvidence(row: Row): Evidence {
  return EvidenceSchema.parse(compact(row));
}

export function insertEvidence(evidence: Evidence): void {
  getDb().prepare(`
    INSERT INTO evidence (
      evidence_id, workflow_id, task_id, claim, status,
      source_artifact_ref, finding_severity, created_at
    ) VALUES (
      @evidence_id, @workflow_id, @task_id, @claim, @status,
      @source_artifact_ref, @finding_severity, @created_at
    )
  `).run({
    evidence_id: evidence.evidence_id,
    workflow_id: evidence.workflow_id,
    task_id: evidence.task_id,
    claim: evidence.claim,
    status: evidence.status,
    source_artifact_ref: evidence.source_artifact_ref,
    finding_severity: param(evidence.finding_severity),
    created_at: evidence.created_at
  });
}

export function getEvidence(evidenceId: string): Evidence | undefined {
  const row = getDb().prepare('SELECT * FROM evidence WHERE evidence_id = ?').get(evidenceId) as Row | undefined;
  return row ? toEvidence(row) : undefined;
}

export function listEvidenceByWorkflow(workflowId: string): Evidence[] {
  const rows = getDb()
    .prepare('SELECT * FROM evidence WHERE workflow_id = ? ORDER BY created_at ASC, rowid ASC')
    .all(workflowId) as Row[];
  return rows.map(toEvidence);
}

export function listEvidenceByTask(taskId: string): Evidence[] {
  const rows = getDb()
    .prepare('SELECT * FROM evidence WHERE task_id = ? ORDER BY created_at ASC, rowid ASC')
    .all(taskId) as Row[];
  return rows.map(toEvidence);
}

export function listEvidenceByIds(ids: readonly string[]): Evidence[] {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(', ');
  const rows = getDb()
    .prepare(`SELECT * FROM evidence WHERE evidence_id IN (${placeholders}) ORDER BY created_at ASC, rowid ASC`)
    .all(...ids) as Row[];
  return rows.map(toEvidence);
}

export function listEvidenceByStatus(status: EvidenceStatus): Evidence[] {
  const rows = getDb().prepare('SELECT * FROM evidence WHERE status = ? ORDER BY created_at DESC').all(status) as Row[];
  return rows.map(toEvidence);
}
