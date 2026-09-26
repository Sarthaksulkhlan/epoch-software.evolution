import { Hono } from 'hono';
import { driftFindings, graphEdges } from '../../store/index.js';
import { exportGraph } from '../../graph/export.js';
import { causalArchaeologist, type CausalChain } from '../../graph/causal/archaeologist.js';
import { runPatterns } from '../../graph/drift/patterns.js';
import { loadHistory } from '../../core/epoch/history.js';
import { getRepoSpec } from '../../core/epoch/spec-registry.js';
import { HttpError, notFound } from '../http.js';

export const graphRoutes = new Hono();

graphRoutes.get('/', c => c.json(exportGraph({ includeWorkflows: c.req.query('workflows') === 'true' })));

graphRoutes.get('/node/:id', c => {
  const id = c.req.param('id');
  const graph = exportGraph({ includeWorkflows: true });
  const node = graph.nodes.find(n => n.id === id);
  if (!node) throw notFound(`Node ${id}`);
  const edges = graphEdges.listEdgesForNode(id);
  const neighbours = new Set(edges.flatMap(e => [e.from_id, e.to_id]));
  return c.json({ node, edges, neighbours: graph.nodes.filter(n => neighbours.has(n.id) && n.id !== id) });
});

/**
 * Candidate causal chain for a drift finding, incident, invariant, mutation or
 * free-text symptom. Results are ranked hypotheses, never proof (ADR-018).
 */
graphRoutes.get('/causal-chain', c => {
  const q = c.req.query();
  let chain: CausalChain;
  if (q.finding) chain = causalArchaeologist.traceFinding(q.finding);
  else if (q.incident) chain = causalArchaeologist.traceIncident(q.incident);
  else if (q.invariant) chain = causalArchaeologist.traceInvariant(q.invariant);
  else if (q.mutation) chain = causalArchaeologist.traceMutation(q.mutation);
  else if (q.symptom) chain = causalArchaeologist.traceSymptom(q.symptom);
  else throw new HttpError(400, 'Pass one of finding, incident, invariant, mutation or symptom');
  return c.json({ chain });
});

/** Run the drift patterns over the recorded history without persisting anything. */
graphRoutes.post('/check-drift', c => {
  const history = loadHistory().map(h => ({ mutationId: h.mutation.mutation_id, scan: h.scan, diff: h.diff }));
  return c.json({ outcomes: runPatterns(history, getRepoSpec()), open: driftFindings.listDriftFindings({ status: 'open' }) });
});

export const driftRoutes = new Hono();

driftRoutes.get('/', c => {
  const status = c.req.query('status');
  return c.json({ findings: driftFindings.listDriftFindings(status === 'open' || status === 'resolved' ? { status } : {}) });
});

driftRoutes.get('/:id', c => {
  const finding = driftFindings.getDriftFinding(c.req.param('id'));
  if (!finding) throw notFound(`Drift finding ${c.req.param('id')}`);
  return c.json({ finding, chain: causalArchaeologist.traceFinding(finding.finding_id) });
});

export function registerGraphRoutes(app: Hono): void {
  app.route('/api/graph', graphRoutes);
  app.route('/api/drift', driftRoutes);
}
