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
  created_at: z.number().int().positive()
});

export type Mutation = z.infer<typeof MutationSchema>;
