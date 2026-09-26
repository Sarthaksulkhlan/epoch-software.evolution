import { getDb } from '../db.js';

export type EvidenceStatus = "observed" | "inferred" | "hypothesised";

export interface Evidence {
  evidence_id: string;
  workflow_id: string | null;
  task_id: string | null;
  claim: string;
  status: EvidenceStatus;
  source_artifact_ref: string;
  finding_severity: string | null;
  created_at: number;
}

export function insertEvidence(evidence: Evidence): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO evidence (
      evidence_id, workflow_id, task_id, claim,
      status, source_artifact_ref, finding_severity, created_at
    ) VALUES (
      @evidence_id, @workflow_id, @task_id, @claim,
      @status, @source_artifact_ref, @finding_severity, @created_at
    )
  `);
  stmt.run(evidence);
}

export function getEvidence(evidenceId: string): Evidence | undefined {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM evidence WHERE evidence_id = ?');
  return stmt.get(evidenceId) as Evidence | undefined;
}

export function listEvidenceByWorkflow(workflowId: string): Evidence[] {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM evidence WHERE workflow_id = ?');
  return stmt.all(workflowId) as Evidence[];
}

export function listEvidenceByTask(taskId: string): Evidence[] {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM evidence WHERE task_id = ?');
  return stmt.all(taskId) as Evidence[];
}

export function listEvidenceByStatus(status: EvidenceStatus): Evidence[] {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM evidence WHERE status = ?');
  return stmt.all(status) as Evidence[];
}
