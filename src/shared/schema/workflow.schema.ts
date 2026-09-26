import { z } from 'zod';

export const WorkflowStatus = z.enum(['PENDING', 'CONTEXT_LOADING', 'PLANNING', 'DELEGATING', 'EXECUTING', 'VERIFYING', 'AWAITING_APPROVAL', 'COMPLETED', 'REJECTED']);
export type WorkflowStatus = z.infer<typeof WorkflowStatus>;

export const WorkflowSchema = z.object({
  workflow_id: z.string().min(1),
  trigger_event_id: z.string().min(1),
  status: WorkflowStatus,
  current_stage: z.string().optional(),
  created_at: z.number().int().positive(),
  completed_at: z.number().int().positive().optional(),
  context_ref: z.string().optional(),
  plan_ref: z.string().optional(),
  mutation_id: z.string().optional()
});

export type Workflow = z.infer<typeof WorkflowSchema>;
