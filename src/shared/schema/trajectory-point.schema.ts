import { z } from 'zod';

export const TrajectoryPointSchema = z.object({
  id: z.number().optional(),
  mutation_id: z.string().min(1),
  timestamp: z.number().int().positive(),
  coupling_score: z.number().min(0).max(1),
  boundary_integrity_score: z.number().min(0).max(1),
  drift_delta: z.number(),
  epoch_id: z.string().min(1),
  state_hash: z.string().min(1)
});

export type TrajectoryPoint = z.infer<typeof TrajectoryPointSchema>;
