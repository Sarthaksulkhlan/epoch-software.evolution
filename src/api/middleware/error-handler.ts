import type { Context } from 'hono';
import { ZodError } from 'zod';
import { HttpError } from '../http.js';
import { WorkflowNotFoundError, WorkflowTransitionError } from '../../core/weave/workflow-engine.js';

/**
 * app.onError handler. Domain errors carry actionable messages, so they are
 * returned to the caller; unexpected errors are logged and reported as 500.
 */
export function handleError(error: Error, c: Context): Response {
  if (error instanceof HttpError) return c.json({ error: error.message }, error.status);
  if (error instanceof ZodError) {
    return c.json({ error: 'Validation failed', details: error.errors.map(e => ({ path: e.path.join('.'), message: e.message })) }, 400);
  }
  if (error instanceof WorkflowNotFoundError) return c.json({ error: error.message }, 404);
  if (error instanceof WorkflowTransitionError) {
    return c.json({ error: error.message, currentState: error.currentState, validTransitions: error.validTransitions }, 409);
  }
  if (error.constructor === Error) {
    const status = /not found/i.test(error.message) ? 404 : 409;
    return c.json({ error: error.message }, status);
  }
  console.error('Unhandled error:', error);
  return c.json({ error: 'Internal server error' }, 500);
}
