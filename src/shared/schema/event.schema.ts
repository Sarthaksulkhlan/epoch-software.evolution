import { z } from 'zod';

export const EventType = z.enum(['requirement.created', 'commit.pushed', 'pr.opened', 'pr.merged', 'release.triggered', 'incident.detected', 'workflow.manual']);
export type EventType = z.infer<typeof EventType>;

export const EventSchema = z.object({
  event_id: z.string().min(1),
  type: EventType,
  source: z.string().min(1),
  timestamp: z.number().int().positive(),
  repo: z.string().optional(),
  branch: z.string().optional(),
  payload: z.record(z.string(), z.unknown())
});

export type Event = z.infer<typeof EventSchema>;
