import { Hono } from 'hono';
import { z } from 'zod';
import { mutations } from '../../store/index.js';
import { mutationEngine } from '../../core/epoch/mutation-engine.js';
import { causalArchaeologist } from '../../graph/causal/archaeologist.js';
import { ActorSchema, notFound, parseBody, queryInt } from '../http.js';
import { mutationDetail } from '../views.js';

export const mutationRoutes = new Hono();

mutationRoutes.get('/', c => c.json({
  mutations: mutations.listMutations({
    component: c.req.query('component'),
    epochId: c.req.query('epoch'),
    limit: queryInt(c, 'limit', 100),
    offset: queryInt(c, 'offset', 0),
    order: c.req.query('order') === 'asc' ? 'asc' : 'desc'
  }),
  total: mutations.countMutations()
}));

mutationRoutes.get('/:id', c => {
  const detail = mutationDetail(c.req.param('id'));
  if (!detail) throw notFound(`Mutation ${c.req.param('id')}`);
  return c.json(detail);
});

mutationRoutes.get('/:id/evidence', c => {
  const detail = mutationDetail(c.req.param('id'));
  if (!detail) throw notFound(`Mutation ${c.req.param('id')}`);
  return c.json({ evidence: detail.evidence });
});

mutationRoutes.get('/:id/ancestry', c => {
  if (!mutations.getMutation(c.req.param('id'))) throw notFound(`Mutation ${c.req.param('id')}`);
  return c.json({ chain: causalArchaeologist.traceMutation(c.req.param('id')) });
});

/** Mutations are immutable: undoing one records a compensating mutation that reverts its commit. */
mutationRoutes.post('/:id/compensate', async c => {
  const body = await parseBody(c, z.object({ actor: ActorSchema }));
  const outcome = await mutationEngine.compensate(c.req.param('id'), body.actor);
  return c.json({ mutation: outcome.mutation, point: outcome.point }, 201);
});

export function registerMutationRoutes(app: Hono): void {
  app.route('/api/mutations', mutationRoutes);
}
