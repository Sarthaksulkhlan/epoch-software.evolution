import { z } from 'zod';

export const ArtifactType = z.enum(['diff', 'test_result', 'security_scan', 'dependency_graph', 'runtime_trace', 'deployment_manifest', 'reproduction_script', 'plan_json', 'context_bundle']);
export type ArtifactType = z.infer<typeof ArtifactType>;

export const ArtifactSchema = z.object({
  artifact_id: z.string().min(1),
  type: ArtifactType,
  source_task_id: z.string().min(1),
  content_ref: z.string().min(1),
  hash: z.string().min(1),
  created_at: z.number().int().positive(),
  mime_type: z.string().optional()
});

export type Artifact = z.infer<typeof ArtifactSchema>;
