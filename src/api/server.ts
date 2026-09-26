import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { getDb } from '../store/db.js';
import { initializeSchema } from '../store/schema.js';
import { errorHandler } from './middleware/error-handler.js';

import { registerEventRoutes } from './routes/events.js';
import { registerWorkflowRoutes } from './routes/workflows.js';
import { registerMutationRoutes } from './routes/mutations.js';
import { registerGraphRoutes } from './routes/graph.js';
import { registerSimulationRoutes } from './routes/simulations.js';
import { registerInvariantRoutes } from './routes/invariants.js';
import { registerIncidentRoutes } from './routes/incidents.js';
import { registerTrajectoryRoutes } from './routes/trajectory.js';
import { registerAgentRoutes } from './routes/agents.js';
import { registerSSERoutes } from './routes/sse.js';

export function createApp(): Hono {
  const app = new Hono();

  app.use('*', cors({
    origin: process.env.CORS_ORIGIN ?? '*',
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  }));
  app.use('*', logger());
  app.use('*', errorHandler);

  app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }));

  registerEventRoutes(app);
  registerWorkflowRoutes(app);
  registerMutationRoutes(app);
  registerGraphRoutes(app);
  registerSimulationRoutes(app);
  registerInvariantRoutes(app);
  registerIncidentRoutes(app);
  registerTrajectoryRoutes(app);
  registerAgentRoutes(app);
  registerSSERoutes(app);

  return app;
}

const app = createApp();

const db = getDb();
initializeSchema(db);

const PORT = parseInt(process.env.PORT || '3000', 10);
serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`EPOCH API server running on http://localhost:${info.port}`);
});

export { app };
