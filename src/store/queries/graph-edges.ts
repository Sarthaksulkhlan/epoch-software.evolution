import { getDb } from '../db.js';
import { compact, param, type Row } from '../rows.js';
import { GraphEdgeSchema, type GraphEdge, type Relationship } from '../../shared/schema/graph-edge.schema.js';

function toEdge(row: Row): GraphEdge {
  return GraphEdgeSchema.parse(compact(row));
}

export function insertEdge(edge: GraphEdge): void {
  getDb().prepare(`
    INSERT INTO graph_edges (
      edge_id, from_id, from_type, to_id, to_type,
      relationship, confidence, evidence_ref, created_at
    ) VALUES (
      @edge_id, @from_id, @from_type, @to_id, @to_type,
      @relationship, @confidence, @evidence_ref, @created_at
    )
  `).run({
    edge_id: edge.edge_id,
    from_id: edge.from_id,
    from_type: edge.from_type,
    to_id: edge.to_id,
    to_type: edge.to_type,
    relationship: edge.relationship,
    confidence: edge.confidence,
    evidence_ref: param(edge.evidence_ref),
    created_at: edge.created_at
  });
}

export function getEdgesFrom(fromId: string, relationship?: Relationship): GraphEdge[] {
  const rows = relationship
    ? getDb().prepare('SELECT * FROM graph_edges WHERE from_id = ? AND relationship = ? ORDER BY rowid').all(fromId, relationship)
    : getDb().prepare('SELECT * FROM graph_edges WHERE from_id = ? ORDER BY rowid').all(fromId);
  return (rows as Row[]).map(toEdge);
}

export function getEdgesTo(toId: string, relationship?: Relationship): GraphEdge[] {
  const rows = relationship
    ? getDb().prepare('SELECT * FROM graph_edges WHERE to_id = ? AND relationship = ? ORDER BY rowid').all(toId, relationship)
    : getDb().prepare('SELECT * FROM graph_edges WHERE to_id = ? ORDER BY rowid').all(toId);
  return (rows as Row[]).map(toEdge);
}

export function listEdgesByRelationship(relationship: Relationship): GraphEdge[] {
  const rows = getDb().prepare('SELECT * FROM graph_edges WHERE relationship = ? ORDER BY rowid').all(relationship) as Row[];
  return rows.map(toEdge);
}

export function listAllEdges(): GraphEdge[] {
  return (getDb().prepare('SELECT * FROM graph_edges ORDER BY rowid').all() as Row[]).map(toEdge);
}

/** Edges that touch a node in either direction. */
export function listEdgesForNode(nodeId: string): GraphEdge[] {
  const rows = getDb().prepare('SELECT * FROM graph_edges WHERE from_id = ? OR to_id = ? ORDER BY rowid').all(nodeId, nodeId) as Row[];
  return rows.map(toEdge);
}

/**
 * Mutations reachable backwards from a mutation through FOLLOWS edges,
 * nearest first, bounded by depth (recursive CTE, ARCHITECTURE §13).
 */
export function ancestorMutations(mutationId: string, maxDepth: number): Array<{ mutation_id: string; depth: number }> {
  return getDb().prepare(`
    WITH RECURSIVE ancestors(mutation_id, depth) AS (
      SELECT from_id, 1 FROM graph_edges WHERE to_id = ? AND relationship = 'FOLLOWS'
      UNION
      SELECT e.from_id, a.depth + 1
      FROM graph_edges e JOIN ancestors a ON e.to_id = a.mutation_id
      WHERE e.relationship = 'FOLLOWS' AND a.depth < ?
    )
    SELECT mutation_id, MIN(depth) AS depth FROM ancestors GROUP BY mutation_id ORDER BY depth ASC
  `).all(mutationId, maxDepth) as Array<{ mutation_id: string; depth: number }>;
}
