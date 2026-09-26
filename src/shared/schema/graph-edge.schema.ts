import { z } from 'zod';

export const Relationship = z.enum(['TRIGGERS', 'PRODUCES', 'TOUCHES', 'FOLLOWS', 'WEAKENS', 'CAUSED_BY', 'SPAWNED', 'BOUNDARY', 'REMEDIATES']);
export type Relationship = z.infer<typeof Relationship>;

export const NodeType = z.enum(['event', 'workflow', 'mutation', 'component', 'incident', 'invariant', 'epoch', 'decision']);
export type NodeType = z.infer<typeof NodeType>;

export const GraphEdgeSchema = z.object({
  edge_id: z.string().min(1),
  from_id: z.string().min(1),
  from_type: NodeType,
  to_id: z.string().min(1),
  to_type: NodeType,
  relationship: Relationship,
  confidence: z.number().min(0).max(1).default(1.0),
  evidence_ref: z.string().optional(),
  created_at: z.number().int().positive()
});

export type GraphEdge = z.infer<typeof GraphEdgeSchema>;
