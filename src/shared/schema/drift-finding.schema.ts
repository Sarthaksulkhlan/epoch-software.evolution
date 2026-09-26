import { z } from 'zod';

export const DriftPattern = z.enum(['boundary_erosion', 'invariant_weakening', 'dependency_growth']);
export type DriftPattern = z.infer<typeof DriftPattern>;

export const DriftSeverity = z.enum(['warning', 'critical']);
export type DriftSeverity = z.infer<typeof DriftSeverity>;

export const DriftFindingStatus = z.enum(['open', 'resolved']);
export type DriftFindingStatus = z.infer<typeof DriftFindingStatus>;

/**
 * A trajectory-level finding produced by a deterministic drift pattern (ADR-015).
 * Measurements are observed; the candidate chain attached to it is hypothesised.
 */
export const DriftFindingSchema = z.object({
  finding_id: z.string().regex(/^DRIFT-\d+$/),
  pattern: DriftPattern,
  severity: DriftSeverity,
  title: z.string().min(1),
  summary: z.string().min(1),
  invariant_id: z.string().optional(),
  components: z.array(z.string()),
  mutation_ids: z.array(z.string()),
  evidence_refs: z.array(z.string()),
  earliest_plausible_mutation_id: z.string().optional(),
  measurement: z.object({
    metric: z.string(),
    value: z.number(),
    threshold: z.number(),
    window: z.number().int()
  }),
  status: DriftFindingStatus,
  detected_at: z.number().int().positive(),
  detected_by_mutation_id: z.string(),
  resolved_by_mutation_id: z.string().optional()
});

export type DriftFinding = z.infer<typeof DriftFindingSchema>;
