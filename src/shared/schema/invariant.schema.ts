import { z } from 'zod';

export const InvariantStatus = z.enum(['HOLDING', 'WEAKENED', 'VIOLATED']);
export type InvariantStatus = z.infer<typeof InvariantStatus>;

export const InvariantSchema = z.object({
  invariant_id: z.string().min(1),
  statement: z.string().min(1),
  owner: z.string().optional(),
  scope_components: z.array(z.string()).min(1),
  status: InvariantStatus,
  last_checked_mutation_id: z.string().optional(),
  violation_mutations: z.array(z.string()).default([]),
  created_at: z.number().int().positive()
});

export type Invariant = z.infer<typeof InvariantSchema>;
