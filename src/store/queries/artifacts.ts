import { getDb } from '../db.js';
import { compact, param, type Row } from '../rows.js';
import { ArtifactSchema, type Artifact } from '../../shared/schema/artifact.schema.js';

function toArtifact(row: Row): Artifact {
  return ArtifactSchema.parse(compact(row));
}

export function insertArtifact(artifact: Artifact): void {
  getDb().prepare(`
    INSERT INTO artifacts (artifact_id, type, source_task_id, content_ref, hash, created_at, mime_type)
    VALUES (@artifact_id, @type, @source_task_id, @content_ref, @hash, @created_at, @mime_type)
  `).run({
    artifact_id: artifact.artifact_id,
    type: artifact.type,
    source_task_id: artifact.source_task_id,
    content_ref: artifact.content_ref,
    hash: artifact.hash,
    created_at: artifact.created_at,
    mime_type: param(artifact.mime_type)
  });
}

export function getArtifact(artifactId: string): Artifact | undefined {
  const row = getDb().prepare('SELECT * FROM artifacts WHERE artifact_id = ?').get(artifactId) as Row | undefined;
  return row ? toArtifact(row) : undefined;
}

export function listArtifactsByTask(taskId: string): Artifact[] {
  const rows = getDb().prepare('SELECT * FROM artifacts WHERE source_task_id = ? ORDER BY created_at ASC').all(taskId) as Row[];
  return rows.map(toArtifact);
}
