import { Hono } from 'hono';
import { z } from 'zod';
import { epochs } from '../../store/index.js';
import { ENVELOPE, trajectoryEngine } from '../../core/epoch/trajectory.js';
import { epochDetector } from '../../core/epoch/epoch-detector.js';
import { debtModel } from '../../core/epoch/debt-model.js';
import { inflections, project, velocity } from '../../graph/trajectory/analytics.js';
import { ActorSchema, parseBody, queryInt } from '../http.js';

export const trajectoryRoutes = new Hono();

trajectoryRoutes.get('/snapshot', c => c.json({ snapshot: trajectoryEngine.snapshot() }));

trajectoryRoutes.get('/timeseries', c => c.json({ points: trajectoryEngine.series(queryInt(c, 'limit')) }));

trajectoryRoutes.get('/envelope', c => {
  const snapshot = trajectoryEngine.snapshot();
  return c.json({ envelope: ENVELOPE, withinEnvelope: snapshot.withinEnvelope, couplingScore: snapshot.couplingScore, boundaryIntegrityScore: snapshot.boundaryIntegrityScore });
});

trajectoryRoutes.get('/epochs', c => c.json({ epochs: epochs.listEpochs() }));

/** A person confirms a proposed epoch boundary (ADR-023). */
trajectoryRoutes.post('/epochs/:id/confirm', async c => {
  await parseBody(c, z.object({ actor: ActorSchema }));
  return c.json({ epoch: epochDetector.confirm(c.req.param('id')) });
});

trajectoryRoutes.get('/debt', c => c.json({ debt: debtModel.summary() }));

trajectoryRoutes.get('/velocity', c => c.json({ velocity: velocity(queryInt(c, 'window', 5)) }));

trajectoryRoutes.get('/inflections', c => c.json({ inflections: inflections() }));

trajectoryRoutes.get('/projection', c => c.json({ projection: project(queryInt(c, 'horizon', 5), queryInt(c, 'window', 5)) }));

export function registerTrajectoryRoutes(app: Hono): void {
  app.route('/api/trajectory', trajectoryRoutes);
}
