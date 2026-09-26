import { getDb } from '../db.js';

export interface GraphEdge {
  edge_id: string;
  from_id: string;
  from_type: string;
  to_id: string;
  to_type: string;
  relationship: string;
  confidence: number;
  evidence_ref: string | null;
  created_at: number;
}

export function insertEdge(edge: GraphEdge): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO graph_edges (
      edge_id, from_id, from_type, to_id, to_type,
      relationship, confidence, evidence_ref, created_at
    ) VALUES (
      @edge_id, @from_id, @from_type, @to_id, @to_type,
      @relationship, @confidence, @evidence_ref, @created_at
    )
  `);
  stmt.run(edge);
}

export function getEdgesFrom(fromId: string, relationship?: string): GraphEdge[] {
  const db = getDb();
  if (relationship) {
    const stmt = db.prepare('SELECT * FROM graph_edges WHERE from_id = ? AND relationship = ?');
    return stmt.all(fromId, relationship) as GraphEdge[];
  }
  const stmt = db.prepare('SELECT * FROM graph_edges WHERE from_id = ?');
  return stmt.all(fromId) as GraphEdge[];
}

export function getEdgesTo(toId: string, relationship?: string): GraphEdge[] {
  const db = getDb();
  if (relationship) {
    const stmt = db.prepare('SELECT * FROM graph_edges WHERE to_id = ? AND relationship = ?');
    return stmt.all(toId, relationship) as GraphEdge[];
  }
  const stmt = db.prepare('SELECT * FROM graph_edges WHERE to_id = ?');
  return stmt.all(toId) as GraphEdge[];
}

export function getFullGraph(): { nodes: any[], edges: GraphEdge[] } {
  const db = getDb();
  const edges = db.prepare('SELECT * FROM graph_edges').all() as GraphEdge[];
  // Extract nodes dynamically from edges for basic representation
  // Actual node details would require joining with other tables if needed.
  const nodesMap = new Map();
  for (const edge of edges) {
    if (!nodesMap.has(edge.from_id)) {
      nodesMap.set(edge.from_id, { id: edge.from_id, type: edge.from_type });
    }
    if (!nodesMap.has(edge.to_id)) {
      nodesMap.set(edge.to_id, { id: edge.to_id, type: edge.to_type });
    }
  }
  return { nodes: Array.from(nodesMap.values()), edges };
}

export function getComponentSubgraph(componentId: string): { nodes: any[], edges: GraphEdge[] } {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM graph_edges 
    WHERE from_id = ? OR to_id = ?
  `);
  const edges = stmt.all(componentId, componentId) as GraphEdge[];
  
  const nodesMap = new Map();
  for (const edge of edges) {
    if (!nodesMap.has(edge.from_id)) {
      nodesMap.set(edge.from_id, { id: edge.from_id, type: edge.from_type });
    }
    if (!nodesMap.has(edge.to_id)) {
      nodesMap.set(edge.to_id, { id: edge.to_id, type: edge.to_type });
    }
  }
  return { nodes: Array.from(nodesMap.values()), edges };
}

export function ancestorTraversal(startId: string, maxDepth: number): Array<{ mutation_id: string, depth: number }> {
  const db = getDb();
  // Using recursive CTE for BFS backward traversal on graph_edges assuming relationship like 'mutates_from' or similar
  const stmt = db.prepare(`
    WITH RECURSIVE
      traverse(id, depth) AS (
        SELECT to_id, 0 FROM graph_edges WHERE from_id = ? 
        UNION
        SELECT e.to_id, t.depth + 1
        FROM graph_edges e
        JOIN traverse t ON e.from_id = t.id
        WHERE t.depth < ?
      )
    SELECT id as mutation_id, depth FROM traverse
  `);
  return stmt.all(startId, maxDepth) as Array<{ mutation_id: string, depth: number }>;
}
