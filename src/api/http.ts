import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { z, type ZodTypeAny } from 'zod';

/** An error with an explicit HTTP status, thrown by route handlers. */
export class HttpError extends Error {
  constructor(readonly status: ContentfulStatusCode, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}

export function notFound(what: string): HttpError {
  return new HttpError(404, `${what} not found`);
}

/** Parse and validate a JSON body; invalid bodies become 400 responses. */
export async function parseBody<S extends ZodTypeAny>(c: Context, schema: S): Promise<z.infer<S>> {
  let raw: unknown = {};
  const text = await c.req.text();
  if (text.trim().length > 0) {
    try {
      raw = JSON.parse(text) as unknown;
    } catch {
      throw new HttpError(400, 'Request body is not valid JSON');
    }
  }
  return schema.parse(raw) as z.infer<S>;
}

export function queryInt(c: Context, name: string, fallback?: number): number | undefined {
  const value = c.req.query(name);
  if (value === undefined || value === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) throw new HttpError(400, `Query parameter ${name} must be a non-negative integer`);
  return parsed;
}

export const ActorSchema = z.string().trim().min(1).max(120);
