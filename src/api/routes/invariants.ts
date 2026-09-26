import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { invariants, getInvariants, getInvariant } from '../../store/index.js';
import { invariantManager } from '../../core/epoch/invariant-store.js';
import type { Invariant, InvariantStatus } from '../../shared/schema/invariant.schema.js';

export const invariantRoutes = new Hono();

invariantRoutes.get('/', (c) => {
  const component = c.req.query('component') ?? undefined;
  const status = c.req.query('status') ?? undefined;

  let result: Invariant[];
  if (component || status) {
    result = invariants.listInvariants().filter(inv => {
      const matchesComponent = !component || inv.scope_components.includes(component);
      const matchesStatus = !status || inv.status.toLowerCase() === status.toLowerCase();
      return matchesComponent && matchesStatus;
    });
  } else {
    result = getInvariants() as Invariant[];
  }

  return c.json({ invariants: result });
});

invariantRoutes.post('/', async (c) => {
  const body = await c.req.json<{
    statement: string;
    scope_components: string[];
    owner?: string;
  }>();

  if (!body.statement || !body.scope_components || body.scope_components.length === 0) {
    return c.json({ error: 'Invariant missing required fields' }, 400);
  }

  const invariant = invariantManager.declareInvariant(
    body.statement,
    body.scope_components,
    body.owner
  );

  return c.json({ invariant }, 201);
});

invariantRoutes.get('/:id', (c) => {
  const id = c.req.param('id');
  const invariant = getInvariant(id) as Invariant | undefined;

  if (!invariant) {
    return c.json({ error: 'Invariant not found' }, 404);
  }

  return c.json({ invariant });
});

invariantRoutes.post('/:id/restore', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ mutation_id: string }>();

  const invariant = getInvariant(id);
  if (!invariant) {
    return c.json({ error: 'Invariant not found' }, 404);
  }

  invariantManager.restoreInvariant(id, body.mutation_id ?? nanoid());
  return c.json({ status: 'restored', invariant_id: id });
});

invariantRoutes.post('/:id/status', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ status: InvariantStatus; mutation_id: string }>();

  const invariant = getInvariant(id);
  if (!invariant) {
    return c.json({ error: 'Invariant not found' }, 404);
  }

  invariantManager.updateStatus(id, body.status, body.mutation_id ?? nanoid());
  return c.json({ status: 'updated', invariant_id: id });
});

export function registerInvariantRoutes(app: Hono): void {
  app.route('/api/invariants', invariantRoutes);
}
