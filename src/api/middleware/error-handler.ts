import type { Context, Next } from 'hono';
import { ZodError } from 'zod';

export class WorkflowTransitionError extends Error {
  constructor(message: string, public validTransitions: string[]) {
    super(message);
    this.name = 'WorkflowTransitionError';
  }
}

export async function errorHandler(c: Context, next: Next) {
  try {
    await next();
  } catch (error) {
    if (error instanceof ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    if (error instanceof WorkflowTransitionError) {
      return c.json({ error: error.message, validTransitions: error.validTransitions }, 409);
    }
    console.error('Unhandled error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
  return undefined;
}
