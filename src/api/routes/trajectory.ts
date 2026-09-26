import { Hono } from 'hono';
import { trajectoryEngine } from '../../core/epoch/trajectory.js';
import { trajectoryAnalyzer } from '../../graph/trajectory/trajectory-analyzer.js';
import { debtModel } from '../../core/epoch/debt-model.js';
import { epochDetector } from '../../core/epoch/epoch-detector.js';
import { getTrajectoryTimeSeries } from '../../store/index.js';

export const trajectoryRoutes = new Hono();

trajectoryRoutes.get('/snapshot', (c) => {
  const snapshot = trajectoryEngine.getTrajectorySnapshot();
  return c.json({ snapshot });
});

trajectoryRoutes.get('/timeseries', (c) => {
  const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : undefined;
  const series = trajectoryEngine.getTrajectoryTimeSeries(limit);
  return c.json({ series });
});

trajectoryRoutes.get('/envelope', (c) => {
  const current = trajectoryEngine.getTrajectorySnapshot();
  const trajectory = trajectoryEngine.compute(
    {
      couplingScore: current.couplingScore,
      boundaryIntegrityScore: current.boundaryIntegrityScore,
      behaviorScore: 0
    },
    {
      couplingScore: current.couplingScore,
      boundaryIntegrityScore: current.boundaryIntegrityScore,
      behaviorScore: 0
    }
  );

  return c.json({
    withinEnvelope: trajectoryEngine.checkEnvelope(trajectory),
    violations: trajectory.envelopeViolations
  });
});

trajectoryRoutes.get('/debt', (c) => {
  const summary = debtModel.getSummary();
  return c.json({ debt: summary });
});

trajectoryRoutes.get('/projections', (c) => {
  const windowSize = c.req.query('window') ? parseInt(c.req.query('window')!, 10) : 10;
  const projection = trajectoryAnalyzer.projectTrend(windowSize);
  return c.json({ projection });
});

trajectoryRoutes.get('/velocity', (c) => {
  const windowSize = c.req.query('window') ? parseInt(c.req.query('window')!, 10) : 10;
  const velocity = trajectoryAnalyzer.computeVelocity(windowSize);
  return c.json({ velocity });
});

trajectoryRoutes.get('/inflections', (c) => {
  const windowSize = c.req.query('window') ? parseInt(c.req.query('window')!, 10) : 10;
  const inflections = trajectoryAnalyzer.detectInflection(windowSize);
  return c.json({ inflections });
});

trajectoryRoutes.get('/epochs', (c) => {
  const current = epochDetector.getCurrentEpoch();
  const series = getTrajectoryTimeSeries(100);
  const epochIds = Array.from(new Set(series.map(p => p.epoch_id).filter((id): id is string => id !== null)));

  return c.json({ current_epoch: current, epochs: epochIds });
});

export function registerTrajectoryRoutes(app: Hono): void {
  app.route('/api/trajectory', trajectoryRoutes);
}
