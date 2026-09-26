import { z } from 'zod';
import { InvariantStatus } from './invariant.schema.js';

export const TrajectoryDeltaSchema = z.object({
  couplingDelta: z.number(),
  boundaryIntegrityDelta: z.number(),
  behaviorDelta: z.number(),
  invariantChanges: z.array(z.object({
    invariant_id: z.string(),
    previousStatus: InvariantStatus,
    newStatus: InvariantStatus
  }))
});
export type TrajectoryDelta = z.infer<typeof TrajectoryDeltaSchema>;

export const MutationSchema = z.object({
  mutation_id: z.string().min(1).regex(/^M-\d+/),
  workflow_id: z.string().min(1),
  intent: z.string().min(1),
  affected_components: z.array(z.string()).min(1),
  delta_summary: z.string().optional(),
  evidence_refs: z.array(z.string()).min(1),
  trajectory_delta: TrajectoryDeltaSchema,
  epoch_id: z.string().min(1),
  created_at: z.number().int().positive(),
  /** Commit in the sample repository that realises this mutation. */
  commit_sha: z.string().optional(),
  /** Who made the change, e.g. "IBM Bob (weave-lifecycle)" or "seed history". */
  author: z.string().optional(),
  /** Set when this mutation reverts an earlier one (mutations are never deleted). */
  compensates_mutation_id: z.string().optional()
});

export type Mutation = z.infer<typeof MutationSchema>;
