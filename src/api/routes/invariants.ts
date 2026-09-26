import { Hono } from 'hono';
import { z } from 'zod';
import { invariants } from '../../store/index.js';
import { invariantManager } from '../../core/epoch/invariant-store.js';
import { causalArchaeologist } from '../../graph/causal/archaeologist.js';
import { HttpError, notFound, parseBody } from '../http.js';
import { allInvariantViews, invariantHistory, invariantView } from '../views.js';

export const invariantRoutes = new Hono();

invariantRoutes.get('/', c => c.json({ invariants: allInvariantViews() }));

invariantRoutes.get('/:id', c => {
  const invariant = invariants.getInvariant(c.req.param('id'));
  if (!invariant) throw notFound(`Invariant ${c.req.param('id')}`);
  return c.json({
    invariant: invariantView(invariant),
    history: invariantHistory(invariant.invariant_id),
    chain: invariant.status === 'HOLDING' ? null : causalArchaeologist.traceInvariant(invariant.invariant_id)
  });
});

/**
 * Declare an invariant by hand. Machine-checked invariants live in the watched
 * repository's invariants.json; hand-declared ones are tracked but not evaluated.
 */
invariantRoutes.post('/', async c => {
  const body = await parseBody(c, z.object({
    id: z.string().regex(/^INV-[A-Z]+-\d+$/),
    statement: z.string().trim().min(5),
    components: z.array(z.string().min(1)).min(1),
    owner: z.string().optional()
  }));
  if (invariants.getInvariant(body.id)) throw new HttpError(409, `Invariant ${body.id} already exists`);
  const invariant = invariantManager.declare(body.id, body.statement, body.components, Date.now(), body.owner);
  return c.json({ invariant: invariantView(invariant) }, 201);
});

export function registerInvariantRoutes(app: Hono): void {
  app.route('/api/invariants', invariantRoutes);
}
