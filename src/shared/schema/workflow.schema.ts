import { z } from 'zod';

export const WorkflowStatus = z.enum(['PENDING', 'CONTEXT_LOADING', 'PLANNING', 'DELEGATING', 'EXECUTING', 'VERIFYING', 'AWAITING_APPROVAL', 'COMPLETED', 'REJECTED']);
export type WorkflowStatus = z.infer<typeof WorkflowStatus>;

export const WorkflowKind = z.enum(['feature', 'incident', 'remediation', 'replay', 'seed']);
export type WorkflowKind = z.infer<typeof WorkflowKind>;

export const WorkflowSchema = z.object({
  workflow_id: z.string().min(1),
  trigger_event_id: z.string().min(1),
  kind: WorkflowKind.default('feature'),
  title: z.string().optional(),
  status: WorkflowStatus,
  current_stage: z.string().optional(),
  created_at: z.number().int().positive(),
  completed_at: z.number().int().positive().optional(),
  context_ref: z.string().optional(),
  plan_ref: z.string().optional(),
  mutation_id: z.string().optional()
});

export type Workflow = z.infer<typeof WorkflowSchema>;

export const WorkflowEventSchema = z.object({
  id: z.number().int().optional(),
  workflow_id: z.string().min(1),
  from_status: WorkflowStatus,
  to_status: WorkflowStatus,
  stage: z.string().optional(),
  actor: z.string().min(1),
  timestamp: z.number().int().positive()
});

export type WorkflowEvent = z.infer<typeof WorkflowEventSchema>;
