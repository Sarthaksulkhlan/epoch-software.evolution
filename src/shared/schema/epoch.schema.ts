import { z } from 'zod';

export const EpochStatus = z.enum(['proposed', 'confirmed', 'current']);
export type EpochStatus = z.infer<typeof EpochStatus>;

export const EpochSchema = z.object({
  epoch_id: z.string().min(1).regex(/^E-\d+/),
  name: z.string().min(1),
  start_mutation_id: z.string().min(1),
  end_mutation_id: z.string().optional(),
  defining_properties: z.array(z.string()).min(1),
  boundary_evidence: z.array(z.string()).default([]),
  status: EpochStatus,
  created_at: z.number().int().positive()
});

export type Epoch = z.infer<typeof EpochSchema>;
