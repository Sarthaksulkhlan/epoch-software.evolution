import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { incidents, getIncident, queryIncidents } from '../../store/index.js';
import type { Incident, IncidentStatus } from '../../shared/schema/incident.schema.js';
import type { FindingSeverity } from '../../shared/schema/evidence.schema.js';

export const incidentRoutes = new Hono();

incidentRoutes.get('/', (c) => {
  const status = c.req.query('status') ?? undefined;
  const component = c.req.query('component') ?? undefined;
  const result = queryIncidents({ status, component });
  return c.json({ incidents: result });
});

incidentRoutes.get('/:id', (c) => {
  const id = c.req.param('id');
  const incident = getIncident(id);

  if (!incident) {
    return c.json({ error: 'Incident not found' }, 404);
  }

  return c.json({ incident });
});

incidentRoutes.post('/', async (c) => {
  const body = await c.req.json<{
    signal: string;
    severity: FindingSeverity;
    affected_component: string;
    status?: IncidentStatus;
  }>();

  if (!body.signal || !body.severity || !body.affected_component) {
    return c.json({ error: 'Incident missing required fields' }, 400);
  }

  const incident: Incident = {
    incident_id: `INC-${nanoid(8)}`,
    signal: body.signal,
    severity: body.severity,
    affected_component: body.affected_component,
    detected_at: Date.now(),
    status: body.status ?? 'detected'
  };

  incidents.insertIncident(incident);
  return c.json({ incident }, 201);
});

incidentRoutes.post('/:id/status', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ status: IncidentStatus }>();

  const incident = getIncident(id);
  if (!incident) {
    return c.json({ error: 'Incident not found' }, 404);
  }

  incidents.updateIncidentStatus(id, body.status);
  return c.json({ status: 'updated', incident_id: id });
});

export function registerIncidentRoutes(app: Hono): void {
  app.route('/api/incidents', incidentRoutes);
}
