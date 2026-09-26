import { Hono } from 'hono';
import { mutationGraph } from '../../graph/mutations/mutation-graph.js';
import {
  semanticDriftDetector,
  structuralDriftDetector,
  temporalDriftDetector
} from '../../graph/drift/index.js';
import { causalArchaeologist } from '../../graph/causal/archaeologist.js';
import { getFullGraph, getComponentSubgraph } from '../../store/index.js';

export const graphRoutes = new Hono();

graphRoutes.get('/', (c) => {
  const graph = getFullGraph();
  return c.json(graph);
});

graphRoutes.get('/component/:id', (c) => {
  const id = c.req.param('id');
  const subgraph = getComponentSubgraph(id);
  return c.json({ component: id, ...subgraph });
});

graphRoutes.get('/mutation/:id/edges', (c) => {
  const id = c.req.param('id');
  const edges = mutationGraph.getEdges(id);
  return c.json({ mutation_id: id, edges });
});

graphRoutes.get('/mutation/:from/path/:to', (c) => {
  const from = c.req.param('from');
  const to = c.req.param('to');
  const path = mutationGraph.getPath(from, to);
  return c.json({ from, to, path });
});

graphRoutes.post('/check-drift', (c) => {
  const reports = [
    semanticDriftDetector.detect(mutationGraph),
    structuralDriftDetector.detect(mutationGraph),
    temporalDriftDetector.detect(mutationGraph)
  ];

  return c.json({ findings: reports });
});

graphRoutes.get('/causal-chain', (c) => {
  const symptom = c.req.query('symptom') ?? '';
  const component = c.req.query('component') ?? '';
  const mutationId = c.req.query('mutationId') ?? '';

  const chain = mutationId
    ? causalArchaeologist.findRootCause(mutationId)
    : causalArchaeologist.traceCausalChain(symptom, component);

  return c.json({ chain });
});

export function registerGraphRoutes(app: Hono): void {
  app.route('/api/graph', graphRoutes);
}
