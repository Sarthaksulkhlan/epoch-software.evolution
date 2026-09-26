import { z } from 'zod';

export const EvidenceStatus = z.enum(['observed', 'inferred', 'hypothesised']);
export type EvidenceStatus = z.infer<typeof EvidenceStatus>;

export const FindingSeverity = z.enum(['info', 'low', 'medium', 'high', 'critical']);
export type FindingSeverity = z.infer<typeof FindingSeverity>;

export const EvidenceSchema = z.object({
  evidence_id: z.string().min(1),
  workflow_id: z.string().min(1),
  task_id: z.string().min(1),
  claim: z.string().min(1),
  status: EvidenceStatus,
  source_artifact_ref: z.string().min(1),
  finding_severity: FindingSeverity.optional(),
  created_at: z.number().int().positive()
});

export type Evidence = z.infer<typeof EvidenceSchema>;
