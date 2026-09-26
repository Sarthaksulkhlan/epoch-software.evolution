import { z } from 'zod';
import { MutationSchema } from './mutation.schema.js';
import { InvariantSchema } from './invariant.schema.js';

export const MutationSummarySchema = MutationSchema.pick({
  mutation_id: true,
  intent: true,
  affected_components: true,
  trajectory_delta: true,
  created_at: true
});
export type MutationSummary = z.infer<typeof MutationSummarySchema>;

export const ContextBundleSchema = z.object({
  workflow_id: z.string(),
  assembled_at: z.number().int().positive(),
  repository: z.object({
    repo: z.string(),
    branch: z.string(),
    head_commit: z.string(),
    file_tree_digest: z.string(),
    relevant_files: z.array(z.string())
  }),
  requirements: z.array(z.object({
    id: z.string(),
    statement: z.string(),
    acceptance_criteria: z.array(z.string()),
    source: z.string()
  })),
  prior_mutations: z.array(MutationSummarySchema),
  invariants: z.array(InvariantSchema),
  telemetry: z.object({
    error_rate: z.number(),
    p99_latency_ms: z.number(),
    recent_alerts: z.array(z.string())
  }).optional(),
  provenance: z.array(z.object({
    item_id: z.string(),
    source_type: z.string(),
    source_ref: z.string(),
    retrieved_at: z.number()
  }))
});

export type ContextBundle = z.infer<typeof ContextBundleSchema>;
