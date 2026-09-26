import { getDb } from '../db.js';
import { compact, decodeJson, json, param, type Row } from '../rows.js';
import { SimulationSchema, type Simulation } from '../../shared/schema/simulation.schema.js';

function toSimulation(row: Row): Simulation {
  return SimulationSchema.parse(compact(decodeJson(row, ['scenarios'])));
}

export function insertSimulation(simulation: Simulation): void {
  getDb().prepare(`
    INSERT INTO simulations (
      simulation_id, base_mutation_id, base_state_hash, hypothesis, scenarios,
      status, outcome_ref, selected_scenario_id, created_at, completed_at
    ) VALUES (
      @simulation_id, @base_mutation_id, @base_state_hash, @hypothesis, @scenarios,
      @status, @outcome_ref, @selected_scenario_id, @created_at, @completed_at
    )
  `).run(toParams(simulation));
}

/** Replace the mutable parts of a simulation (scenario results, status, selection). */
export function updateSimulation(simulation: Simulation): void {
  getDb().prepare(`
    UPDATE simulations
    SET scenarios = @scenarios, status = @status, outcome_ref = @outcome_ref,
        selected_scenario_id = @selected_scenario_id, completed_at = @completed_at
    WHERE simulation_id = @simulation_id
  `).run(toParams(simulation));
}

export function getSimulation(simulationId: string): Simulation | undefined {
  const row = getDb().prepare('SELECT * FROM simulations WHERE simulation_id = ?').get(simulationId) as Row | undefined;
  return row ? toSimulation(row) : undefined;
}

export function listSimulations(options: { status?: string | undefined } = {}): Simulation[] {
  const params: unknown[] = [];
  let sql = 'SELECT * FROM simulations';
  if (options.status) {
    sql += ' WHERE status = ?';
    params.push(options.status);
  }
  sql += ' ORDER BY created_at DESC, rowid DESC';
  return (getDb().prepare(sql).all(...params) as Row[]).map(toSimulation);
}

function toParams(simulation: Simulation): Record<string, unknown> {
  return {
    simulation_id: simulation.simulation_id,
    base_mutation_id: simulation.base_mutation_id,
    base_state_hash: simulation.base_state_hash,
    hypothesis: simulation.hypothesis,
    scenarios: json(simulation.scenarios),
    status: simulation.status,
    outcome_ref: param(simulation.outcome_ref),
    selected_scenario_id: param(simulation.selected_scenario_id),
    created_at: simulation.created_at,
    completed_at: param(simulation.completed_at)
  };
}
