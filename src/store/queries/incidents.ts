import { getDb } from '../db.js';
import { compact, decodeJson, json, param, type Row } from '../rows.js';
import { IncidentSchema, type Incident, type IncidentStatus } from '../../shared/schema/incident.schema.js';

function toIncident(row: Row): Incident {
  return IncidentSchema.parse(compact(decodeJson(row, ['candidate_mutations'])));
}

export function insertIncident(incident: Incident): void {
  getDb().prepare(`
    INSERT INTO incidents (
      incident_id, signal, severity, affected_component, detected_at,
      reproduction_ref, candidate_mutations, remediation_workflow_id, status
    ) VALUES (
      @incident_id, @signal, @severity, @affected_component, @detected_at,
      @reproduction_ref, @candidate_mutations, @remediation_workflow_id, @status
    )
  `).run({
    incident_id: incident.incident_id,
    signal: incident.signal,
    severity: incident.severity,
    affected_component: incident.affected_component,
    detected_at: incident.detected_at,
    reproduction_ref: param(incident.reproduction_ref),
    candidate_mutations: incident.candidate_mutations ? json(incident.candidate_mutations) : null,
    remediation_workflow_id: param(incident.remediation_workflow_id),
    status: incident.status
  });
}

export function getIncident(incidentId: string): Incident | undefined {
  const row = getDb().prepare('SELECT * FROM incidents WHERE incident_id = ?').get(incidentId) as Row | undefined;
  return row ? toIncident(row) : undefined;
}

export function listIncidents(options: { status?: string | undefined; component?: string | undefined } = {}): Incident[] {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (options.status) {
    conditions.push('status = ?');
    params.push(options.status);
  }
  if (options.component) {
    conditions.push('affected_component = ?');
    params.push(options.component);
  }
  let sql = 'SELECT * FROM incidents';
  if (conditions.length > 0) sql += ` WHERE ${conditions.join(' AND ')}`;
  sql += ' ORDER BY detected_at DESC, rowid DESC';
  return (getDb().prepare(sql).all(...params) as Row[]).map(toIncident);
}

export function findOpenIncidentBySignal(signal: string): Incident | undefined {
  const row = getDb()
    .prepare("SELECT * FROM incidents WHERE signal = ? AND status NOT IN ('resolved', 'wont_fix') ORDER BY detected_at DESC LIMIT 1")
    .get(signal) as Row | undefined;
  return row ? toIncident(row) : undefined;
}

export function updateIncidentStatus(incidentId: string, status: IncidentStatus): void {
  getDb().prepare('UPDATE incidents SET status = ? WHERE incident_id = ?').run(status, incidentId);
}

export function setRemediationWorkflow(incidentId: string, workflowId: string): void {
  getDb().prepare('UPDATE incidents SET remediation_workflow_id = ? WHERE incident_id = ?').run(workflowId, incidentId);
}

export function setCandidateMutations(incidentId: string, mutationIds: string[]): void {
  getDb().prepare('UPDATE incidents SET candidate_mutations = ? WHERE incident_id = ?').run(json(mutationIds), incidentId);
}

/** Next numeric incident sequence, starting at `floor` when none exist. */
export function nextIncidentSequence(floor: number): number {
  const row = getDb()
    .prepare('SELECT MAX(CAST(SUBSTR(incident_id, 5) AS INTEGER)) AS max FROM incidents')
    .get() as { max: number | null };
  return Math.max(floor, (row.max ?? floor - 1) + 1);
}
