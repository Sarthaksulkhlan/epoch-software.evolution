import { Hono } from 'hono';
import { mutations, getMutation, queryMutations } from '../../store/index.js';
import { mutationEngine } from '../../core/epoch/mutation-engine.js';
import type { Mutation } from '../../shared/schema/mutation.schema.js';

export const mutationRoutes = new Hono();

mutationRoutes.get('/', (c) => {
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const offset = c.req.query('offset') ? parseInt(c.req.query('offset')!, 10) : undefined;
  const component = c.req.query('component') ?? undefined;
  const epochId = c.req.query('epochId') ?? undefined;

  const result = queryMutations({ component, epochId, limit, offset });
  return c.json({ mutations: result });
});

mutationRoutes.get('/:id', (c) => {
  const id = c.req.param('id');
  const mutation = getMutation(id);

  if (!mutation) {
    return c.json({ error: 'Mutation not found' }, 404);
  }

  return c.json({ mutation });
});

mutationRoutes.post('/', async (c) => {
  const body = await c.req.json<Partial<Mutation>>();

  if (!body.mutation_id || !body.workflow_id || !body.intent || !body.affected_components) {
    return c.json({ error: 'Mutation missing required fields' }, 400);
  }

  const mutation: Mutation = {
    mutation_id: body.mutation_id,
    workflow_id: body.workflow_id,
    intent: body.intent,
    affected_components: body.affected_components,
    delta_summary: body.delta_summary,
    evidence_refs: body.evidence_refs ?? ['none'],
    trajectory_delta: body.trajectory_delta ?? {
      couplingDelta: 0,
      boundaryIntegrityDelta: 0,
      behaviorDelta: 0,
      invariantChanges: []
    },
    epoch_id: body.epoch_id ?? 'E-001',
    created_at: body.created_at ?? Date.now()
  };

  const result = mutationEngine.apply(mutation);

  if (!result.ok) {
    return c.json({ error: result.error }, 409);
  }

  return c.json({ mutation: result.value }, 201);
});

mutationRoutes.post('/:id/rollback', (c) => {
  const id = c.req.param('id');
  const result = mutationEngine.rollback(id);

  if (!result.ok) {
    return c.json({ error: result.error }, 404);
  }

  return c.json({ status: 'rolled_back', mutation_id: id });
});

mutationRoutes.get('/:id/evidence', (c) => {
  const id = c.req.param('id');
  const mutation = getMutation(id);

  if (!mutation) {
    return c.json({ error: 'Mutation not found' }, 404);
  }

  const evidenceRefs = mutation.evidence_refs.filter(ref => ref !== 'none');
  return c.json({ mutation_id: id, evidence_refs: evidenceRefs });
});

export function registerMutationRoutes(app: Hono): void {
  app.route('/api/mutations', mutationRoutes);
}
