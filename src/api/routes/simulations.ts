import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { simulations, getSimulation, saveSimulation } from '../../store/index.js';
import { whatIfSimulator, type WhatIfScenario } from '../../graph/simulation/what-if.js';
import type { Simulation } from '../../shared/schema/simulation.schema.js';

export const simulationRoutes = new Hono();

simulationRoutes.get('/', (c) => {
  const status = c.req.query('status') ?? undefined;
  const result = simulations.listSimulations({ status });
  return c.json({ simulations: result });
});

simulationRoutes.get('/:id', (c) => {
  const id = c.req.param('id');
  const simulation = getSimulation(id);

  if (!simulation) {
    return c.json({ error: 'Simulation not found' }, 404);
  }

  return c.json({ simulation });
});

simulationRoutes.post('/', async (c) => {
  const body = await c.req.json<{
    base_mutation_id: string;
    base_state_hash?: string;
    hypothesis: string;
    changes: string[];
    expectedCouplingDelta?: number;
    expectedBoundaryDelta?: number;
    expectedBehaviorDelta?: number;
  }>();

  if (!body.base_mutation_id || !body.hypothesis || !body.changes) {
    return c.json({ error: 'Simulation missing required fields' }, 400);
  }

  const scenario: WhatIfScenario = {
    baseMutationId: body.base_mutation_id,
    hypothesis: body.hypothesis,
    changes: body.changes,
    expectedCouplingDelta: body.expectedCouplingDelta,
    expectedBoundaryDelta: body.expectedBoundaryDelta,
    expectedBehaviorDelta: body.expectedBehaviorDelta
  };

  const result = whatIfSimulator.simulate(scenario);

  const simulation: Simulation = {
    simulation_id: result.simulationId,
    base_mutation_id: body.base_mutation_id,
    base_state_hash: body.base_state_hash ?? result.branchName,
    hypothesis: body.hypothesis,
    scenarios: [{
      scenario_id: nanoid(),
      label: 'primary',
      description: body.hypothesis,
      branch_name: result.branchName,
      changes: body.changes,
      trajectory_delta: result.projectedDelta,
      coupling_score_after: result.projectedCouplingScore,
      boundary_integrity_after: result.projectedBoundaryIntegrityScore,
      test_pass_rate: result.projectedTestPassRate
    }],
    status: 'COMPLETED',
    outcome_ref: JSON.stringify(result),
    created_at: result.createdAt,
    completed_at: Date.now()
  };

  saveSimulation(simulation);

  return c.json({ simulation, result }, 201);
});

simulationRoutes.post('/:id/select', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ scenario_id: string }>();

  const simulation = getSimulation(id);
  if (!simulation) {
    return c.json({ error: 'Simulation not found' }, 404);
  }

  simulations.selectScenario(id, body.scenario_id);
  return c.json({ status: 'selected', simulation_id: id, scenario_id: body.scenario_id });
});

export function registerSimulationRoutes(app: Hono): void {
  app.route('/api/simulations', simulationRoutes);
}
