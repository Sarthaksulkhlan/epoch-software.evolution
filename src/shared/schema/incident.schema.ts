import { z } from 'zod';
import { FindingSeverity } from './evidence.schema.js';

export const IncidentStatus = z.enum(['detected', 'investigating', 'remediation_in_progress', 'resolved', 'wont_fix']);
export type IncidentStatus = z.infer<typeof IncidentStatus>;

export const IncidentSchema = z.object({
  incident_id: z.string().min(1).regex(/^INC-\d+/),
  signal: z.string().min(1),
  severity: FindingSeverity,
  affected_component: z.string().min(1),
  detected_at: z.number().int().positive(),
  reproduction_ref: z.string().optional(),
  candidate_mutations: z.array(z.string()).optional(),
  remediation_workflow_id: z.string().optional(),
  status: IncidentStatus
});

export type Incident = z.infer<typeof IncidentSchema>;
