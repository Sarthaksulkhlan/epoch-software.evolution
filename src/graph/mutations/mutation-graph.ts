import { nanoid } from 'nanoid';
import * as store from '../../store/index.js';
import type { Mutation } from '../../shared/schema/mutation.schema.js';
import type { Mutation as StoreMutation } from '../../store/queries/mutations.js';
import { Relationship } from '../../shared/schema/graph-edge.schema.js';

export type EdgeType = Relationship;

export class MutationGraph {
  /**
   * Persist a mutation node and emit a graph node event.
   */
  addNode(m: Mutation): void {
    store.createMutation(m as unknown as StoreMutation);
  }

  /**
   * Persist a directed edge between two mutations.
   */
  addEdge(from: string, to: string, type: EdgeType): void {
    store.insertEdge({
      edge_id: nanoid(),
      from_id: from,
      from_type: 'mutation',
      to_id: to,
      to_type: 'mutation',
      relationship: type,
      confidence: 1.0,
      evidence_ref: null,
      created_at: Date.now()
    });
  }

  /**
   * Return the shortest path of mutations from `from` to `to` following
   * FOLLOWS edges. Empty array if no path exists.
   */
  getPath(from: string, to: string): Mutation[] {
    if (from === to) {
      const self = store.getMutation(from);
      return self ? [self as Mutation] : [];
    }

    const start = store.getMutation(from);
    if (!start) return [];

    const queue: Array<{ id: string; path: Mutation[] }> = [
      { id: from, path: [start as Mutation] }
    ];
    const visited = new Set<string>([from]);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const edges = store.graphEdges.getEdgesFrom(current.id, 'FOLLOWS');

      for (const edge of edges) {
        const nextId = edge.to_id;
        if (visited.has(nextId)) continue;
        visited.add(nextId);

        const nextMutation = store.getMutation(nextId);
        if (!nextMutation) continue;

        const nextPath = [...current.path, nextMutation as Mutation];
        if (nextId === to) return nextPath;

        queue.push({ id: nextId, path: nextPath });
      }
    }

    return [];
  }

  /**
   * Load all mutations as nodes in chronological order.
   */
  getNodes(): Mutation[] {
    return store.getAllMutations().sort((a, b) => a.created_at - b.created_at) as Mutation[];
  }

  /**
   * Load all outgoing edges for a mutation.
   */
  getEdges(mutationId: string): ReturnType<typeof store.graphEdges.getEdgesFrom> {
    return store.graphEdges.getEdgesFrom(mutationId);
  }
}

export const mutationGraph = new MutationGraph();
