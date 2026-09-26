import { getDb } from '../db.js';

export interface Simulation {
  simulation_id: string;
  base_mutation_id: string | null;
  base_state_hash: string;
  hypothesis: string;
  scenarios: any; // JSON
  status: string;
  outcome_ref: string | null;
  selected_scenario_id: string | null;
  created_at: number;
  completed_at: number | null;
}

export function insertSimulation(simulation: Simulation): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO simulations (
      simulation_id, base_mutation_id, base_state_hash, hypothesis,
      scenarios, status, outcome_ref, selected_scenario_id,
      created_at, completed_at
    ) VALUES (
      @simulation_id, @base_mutation_id, @base_state_hash, @hypothesis,
      @scenarios, @status, @outcome_ref, @selected_scenario_id,
      @created_at, @completed_at
    )
  `);
  stmt.run({
    ...simulation,
    scenarios: JSON.stringify(simulation.scenarios)
  });
}

export function getSimulation(simulationId: string): Simulation | undefined {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM simulations WHERE simulation_id = ?');
  const row = stmt.get(simulationId) as any;
  if (!row) return undefined;
  
  return {
    ...row,
    scenarios: JSON.parse(row.scenarios)
  };
}

export function listSimulations(options: { status?: string } = {}): Simulation[] {
  const db = getDb();
  let query = 'SELECT * FROM simulations';
  const params: any[] = [];
  
  if (options.status) {
    query += ' WHERE status = ?';
    params.push(options.status);
  }
  
  query += ' ORDER BY created_at DESC';
  
  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as any[];
  
  return rows.map(row => ({
    ...row,
    scenarios: JSON.parse(row.scenarios)
  }));
}

export function updateSimulationStatus(simulationId: string, status: string): void {
  const db = getDb();
  const stmt = db.prepare('UPDATE simulations SET status = ? WHERE simulation_id = ?');
  stmt.run(status, simulationId);
}

export function completeSimulation(simulationId: string, outcomeRef: string): void {
  const db = getDb();
  const stmt = db.prepare('UPDATE simulations SET status = ?, outcome_ref = ?, completed_at = ? WHERE simulation_id = ?');
  stmt.run('COMPLETED', outcomeRef, Date.now(), simulationId);
}

export function selectScenario(simulationId: string, scenarioId: string): void {
  const db = getDb();
  const stmt = db.prepare('UPDATE simulations SET selected_scenario_id = ? WHERE simulation_id = ?');
  stmt.run(scenarioId, simulationId);
}
