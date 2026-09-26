import { getDb } from '../db.js';

export interface Artifact {
  artifact_id: string;
  type: string;
  source_task_id: string | null;
  content_ref: string;
  hash: string;
  created_at: number;
  mime_type: string | null;
}

export function insertArtifact(artifact: Artifact): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO artifacts (
      artifact_id, type, source_task_id, content_ref,
      hash, created_at, mime_type
    ) VALUES (
      @artifact_id, @type, @source_task_id, @content_ref,
      @hash, @created_at, @mime_type
    )
  `);
  stmt.run(artifact);
}

export function getArtifact(artifactId: string): Artifact | undefined {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM artifacts WHERE artifact_id = ?');
  return stmt.get(artifactId) as Artifact | undefined;
}

export function listArtifactsByTask(taskId: string): Artifact[] {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM artifacts WHERE source_task_id = ?');
  return stmt.all(taskId) as Artifact[];
}
