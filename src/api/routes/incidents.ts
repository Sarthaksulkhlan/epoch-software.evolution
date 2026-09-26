import { Hono } from 'hono';
import { z } from 'zod';
import { incidents } from '../../store/index.js';
import { IncidentStatus } from '../../shared/schema/incident.schema.js';
import { causalArchaeologist } from '../../graph/causal/archaeologist.js';
import { loadContext, workflowEngine } from '../../core/weave/index.js';
import { ActorSchema, HttpError, notFound, parseBody } from '../http.js';

export const incidentRoutes = new Hono();

incidentRoutes.get('/', c => c.json({ incidents: incidents.listIncidents({ status: c.req.query('status'), component: c.req.query('component') }) }));

incidentRoutes.get('/:id', c => {
  const incident = incidents.getIncident(c.req.param('id'));
  if (!incident) throw notFound(`Incident ${c.req.param('id')}`);
  return c.json({ incident, chain: causalArchaeologist.traceIncident(incident.incident_id) });
});

incidentRoutes.post('/:id/status', async c => {
  const body = await parseBody(c, z.object({ status: IncidentStatus, actor: ActorSchema }));
  const incident = incidents.getIncident(c.req.param('id'));
  if (!incident) throw notFound(`Incident ${c.req.param('id')}`);
  if (body.status === 'resolved') throw new HttpError(409, 'Incidents resolve when their probe passes after a mutation; they cannot be closed by hand');
  incidents.updateIncidentStatus(incident.incident_id, body.status);
  return c.json({ incident: incidents.getIncident(incident.incident_id) });
});

/** Start the incident workflow: reproduce, trace, propose a patch, validate, approve. */
incidentRoutes.post('/:id/workflow', async c => {
  const body = await parseBody(c, z.object({ actor: ActorSchema.default('console user') }));
  const incident = incidents.getIncident(c.req.param('id'));
  if (!incident) throw notFound(`Incident ${c.req.param('id')}`);
  const chain = causalArchaeologist.traceIncident(incident.incident_id);
  const { workflow } = workflowEngine.start({
    kind: 'incident',
    title: `Investigate ${incident.incident_id}`,
    requirement: `Investigate ${incident.incident_id}: ${incident.signal}. Candidate causal chain: ${chain.chain.join(' → ') || 'none yet'}.`,
    author: body.actor,
    payload: { incident_id: incident.incident_id }
  });
  loadContext(workflow.workflow_id, body.actor);
  incidents.updateIncidentStatus(incident.incident_id, 'investigating');
  incidents.setRemediationWorkflow(incident.incident_id, workflow.workflow_id);
  return c.json({ workflow: workflowEngine.require(workflow.workflow_id), chain }, 201);
});

export function registerIncidentRoutes(app: Hono): void {
  app.route('/api/incidents', incidentRoutes);
}
