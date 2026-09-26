import { getDb } from '../db.js';

export interface Incident {
  incident_id: string;
  signal: string;
  severity: string;
  affected_component: string;
  detected_at: number;
  reproduction_ref: string | null;
  candidate_mutations: string[]; // JSON
  remediation_workflow_id: string | null;
  status: string;
}

export function insertIncident(incident: Incident): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO incidents (
      incident_id, signal, severity, affected_component,
      detected_at, reproduction_ref, candidate_mutations,
      remediation_workflow_id, status
    ) VALUES (
      @incident_id, @signal, @severity, @affected_component,
      @detected_at, @reproduction_ref, @candidate_mutations,
      @remediation_workflow_id, @status
    )
  `);
  stmt.run({
    ...incident,
    candidate_mutations: JSON.stringify(incident.candidate_mutations)
  });
}

export function getIncident(incidentId: string): Incident | undefined {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM incidents WHERE incident_id = ?');
  const row = stmt.get(incidentId) as any;
  if (!row) return undefined;
  
  return {
    ...row,
    candidate_mutations: JSON.parse(row.candidate_mutations)
  };
}

export function listIncidents(options: { status?: string, component?: string } = {}): Incident[] {
  const db = getDb();
  let query = 'SELECT * FROM incidents';
  const params: any[] = [];
  const conditions: string[] = [];
  
  if (options.status) {
    conditions.push('status = ?');
    params.push(options.status);
  }
  if (options.component) {
    conditions.push('affected_component = ?');
    params.push(options.component);
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  query += ' ORDER BY detected_at DESC';
  
  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as any[];
  
  return rows.map(row => ({
    ...row,
    candidate_mutations: JSON.parse(row.candidate_mutations)
  }));
}

export function updateIncidentStatus(incidentId: string, status: string): void {
  const db = getDb();
  const stmt = db.prepare('UPDATE incidents SET status = ? WHERE incident_id = ?');
  stmt.run(status, incidentId);
}

export function setRemediationWorkflow(incidentId: string, workflowId: string): void {
  const db = getDb();
  const stmt = db.prepare('UPDATE incidents SET remediation_workflow_id = ? WHERE incident_id = ?');
  stmt.run(workflowId, incidentId);
}

export function setCandidateMutations(incidentId: string, mutationIds: string[]): void {
  const db = getDb();
  const stmt = db.prepare('UPDATE incidents SET candidate_mutations = ? WHERE incident_id = ?');
  stmt.run(JSON.stringify(mutationIds), incidentId);
}
