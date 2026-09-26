import { Hono } from 'hono';
import { z } from 'zod';
import { mutations, simulations } from '../../store/index.js';
import { futuresSimulator } from '../../core/futures/simulator.js';
import { ActorSchema, HttpError, notFound, parseBody } from '../http.js';

export const simulationRoutes = new Hono();

const ForkBody = z.object({
  base_mutation_id: z.string().regex(/^M-\d+$/).optional(),
  hypothesis: z.string().trim().min(5),
  scenarios: z.array(z.object({
    id: z.string().regex(/^[A-Za-z0-9_-]{1,32}$/),
    label: z.string().trim().min(1),
    description: z.string().trim().min(1),
    patch: z.string().optional()
  })).min(1).max(3),
  /** Measure the futures right away (only useful when every scenario carries a patch). */
  evaluate: z.boolean().default(false)
});

simulationRoutes.get('/', c => c.json({ simulations: simulations.listSimulations({ status: c.req.query('status') }) }));

simulationRoutes.post('/', async c => {
  const body = await parseBody(c, ForkBody);
  const base = body.base_mutation_id ?? mutations.getLatestMutation()?.mutation_id;
  if (!base) throw new HttpError(409, 'No mutations recorded yet; reset the demo first');
  let simulation = futuresSimulator.fork(base, body.hypothesis, body.scenarios);
  if (body.evaluate) simulation = await futuresSimulator.evaluateAll(simulation.simulation_id);
  return c.json({ simulation, recommended: futuresSimulator.recommend(simulation)?.scenario_id ?? null }, 201);
});

simulationRoutes.get('/:id', c => {
  const simulation = simulations.getSimulation(c.req.param('id'));
  if (!simulation) throw notFound(`Simulation ${c.req.param('id')}`);
  return c.json({ simulation, recommended: futuresSimulator.recommend(simulation)?.scenario_id ?? null });
});

simulationRoutes.post('/:id/evaluate', async c => {
  const simulation = await futuresSimulator.evaluateAll(c.req.param('id'));
  return c.json({ simulation, recommended: futuresSimulator.recommend(simulation)?.scenario_id ?? null });
});

simulationRoutes.post('/:id/scenarios/:scenario/evaluate', async c => {
  const simulation = await futuresSimulator.evaluate(c.req.param('id'), c.req.param('scenario'));
  return c.json({ simulation, recommended: futuresSimulator.recommend(simulation)?.scenario_id ?? null });
});

/** Adopt a future: its diff lands in the sample repo and a remediation workflow starts for it. */
simulationRoutes.post('/:id/select', async c => {
  const body = await parseBody(c, z.object({ scenario_id: z.string().min(1), actor: ActorSchema }));
  const result = futuresSimulator.select(c.req.param('id'), body.scenario_id, body.actor);
  return c.json(result, 201);
});

simulationRoutes.post('/:id/cleanup', c => c.json({ simulation: futuresSimulator.cleanup(c.req.param('id')) }));

export function registerSimulationRoutes(app: Hono): void {
  app.route('/api/simulations', simulationRoutes);
}
