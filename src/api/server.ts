import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { getMimeType } from 'hono/utils/mime';
import { getDb, initializeSchema } from '../store/index.js';
import { handleError } from './middleware/error-handler.js';
import { registerEventRoutes } from './routes/events.js';
import { registerWorkflowRoutes } from './routes/workflows.js';
import { registerMutationRoutes } from './routes/mutations.js';
import { registerGraphRoutes } from './routes/graph.js';
import { registerTrajectoryRoutes } from './routes/trajectory.js';
import { registerInvariantRoutes } from './routes/invariants.js';
import { registerIncidentRoutes } from './routes/incidents.js';
import { registerSimulationRoutes } from './routes/simulations.js';
import { registerSystemRoutes } from './routes/system.js';
import { registerSSERoutes } from './routes/sse.js';
import { registerConsoleRoutes } from './console/routes.js';

const DEFAULT_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:4173'];

export function createApp(options: { log?: boolean } = {}): Hono {
  const app = new Hono();
  const origins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()) : DEFAULT_ORIGINS;
  app.use('*', cors({ origin: origins, allowMethods: ['GET', 'POST', 'OPTIONS'], allowHeaders: ['Content-Type', 'Last-Event-ID'] }));
  if (options.log !== false) app.use('*', logger());
  app.onError(handleError);
  app.notFound(c => c.json({ error: `No route for ${c.req.method} ${c.req.path}` }, 404));

  registerSystemRoutes(app);
  registerEventRoutes(app);
  registerWorkflowRoutes(app);
  registerMutationRoutes(app);
  registerGraphRoutes(app);
  registerTrajectoryRoutes(app);
  registerInvariantRoutes(app);
  registerIncidentRoutes(app);
  registerSimulationRoutes(app);
  registerSSERoutes(app);
  registerConsoleRoutes(app);
  if (process.env.EPOCH_CONSOLE_DIR) serveConsole(app, process.env.EPOCH_CONSOLE_DIR);
  return app;
}

/**
 * Serve the built console (`pnpm build`) from the API's origin, so one process
 * hosts everything. Files are read only from inside `dir`; other non-API paths
 * get index.html for the console's client-side routes, and unknown /api paths
 * still answer JSON 404.
 */
function serveConsole(app: Hono, dir: string): void {
  const root = path.resolve(dir);
  const indexFile = path.join(root, 'index.html');
  if (!fs.existsSync(indexFile)) throw new Error(`EPOCH_CONSOLE_DIR has no index.html: ${dir}`);
  const indexHtml = fs.readFileSync(indexFile, 'utf8');
  app.get('*', async (c, next) => {
    if (c.req.path === '/api' || c.req.path.startsWith('/api/')) return next();
    let file: string;
    try {
      file = path.resolve(root, `.${decodeURIComponent(c.req.path)}`);
    } catch {
      return c.html(indexHtml);
    }
    if (!file.startsWith(root + path.sep) || !fs.statSync(file, { throwIfNoEntry: false })?.isFile()) return c.html(indexHtml);
    const hashed = file.startsWith(path.join(root, 'assets') + path.sep);
    return c.body(fs.readFileSync(file), 200, {
      'Content-Type': getMimeType(file) ?? 'application/octet-stream',
      'Cache-Control': hashed ? 'public, max-age=31536000, immutable' : 'no-cache'
    });
  });
}

export function startServer(): void {
  initializeSchema(getDb());
  const port = Number.parseInt(process.env.PORT ?? '3000', 10);
  const hostname = process.env.HOST ?? '127.0.0.1';
  serve({ fetch: createApp().fetch, port, hostname }, info => {
    console.log(`EPOCH API listening on http://${hostname}:${info.port}`);
  });
}

// Run only when executed directly (works on Windows paths too).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer();
}
