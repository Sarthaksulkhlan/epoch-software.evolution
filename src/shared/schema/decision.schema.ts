import { z } from 'zod';

export const DecisionAction = z.enum(['APPROVED', 'REJECTED']);
export type DecisionAction = z.infer<typeof DecisionAction>;

export const DecisionSchema = z.object({
  decision_id: z.string().min(1),
  workflow_id: z.string().min(1),
  actor: z.string().min(1),
  action: DecisionAction,
  rationale: z.string().optional(),
  scope: z.string().optional(),
  timestamp: z.number().int().positive()
});

export type Decision = z.infer<typeof DecisionSchema>;
