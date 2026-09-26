import { z } from 'zod';

export const AgentType = z.enum(['historian', 'context', 'security', 'qa', 'release', 'incident', 'evolution', 'counterfactual', 'adversarial', 'synthesis']);
export type AgentType = z.infer<typeof AgentType>;

export const TaskStatus = z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED']);
export type TaskStatus = z.infer<typeof TaskStatus>;

export const TaskSchema = z.object({
  task_id: z.string().min(1),
  workflow_id: z.string().min(1),
  agent_type: AgentType,
  status: TaskStatus,
  dependencies: z.array(z.string()).default([]),
  started_at: z.number().int().positive().optional(),
  completed_at: z.number().int().positive().optional(),
  input_ref: z.string().optional(),
  output_ref: z.string().optional(),
  retry_count: z.number().int().min(0).default(0)
});

export type Task = z.infer<typeof TaskSchema>;
