/**
 * Minimal client for the EPOCH API. Every path is relative: in development Vite
 * proxies /api to the API (EPOCH_API_URL), and the hosted build is served from
 * the API's own origin.
 */

export class ApiError extends Error {
  readonly status: number;
  /** True when the API could not be reached at all (network error or dev-proxy failure). */
  readonly unreachable: boolean;
  readonly path: string;

  constructor(message: string, status: number, path: string, unreachable = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.path = path;
    this.unreachable = unreachable;
  }
}

export const START_API_HINT = 'Start the API with pnpm dev';

async function request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch {
    throw new ApiError(`Cannot reach the EPOCH API. ${START_API_HINT}.`, 0, path, true);
  }

  const isJson = (res.headers.get('content-type') ?? '').includes('application/json');
  const payload: unknown = isJson ? await res.json().catch(() => undefined) : undefined;

  if (!res.ok) {
    // The Vite dev proxy answers a plain-text 5xx when nothing listens behind it.
    if (!isJson && res.status >= 500) {
      throw new ApiError(`Cannot reach the EPOCH API. ${START_API_HINT}.`, res.status, path, true);
    }
    const message = payload && typeof payload === 'object' && 'error' in payload && typeof (payload as { error: unknown }).error === 'string'
      ? (payload as { error: string }).error
      : `${method} ${path} failed with ${res.status}`;
    throw new ApiError(message, res.status, path);
  }
  if (!isJson) {
    // index.html instead of JSON means the request never reached the API.
    throw new ApiError(`Cannot reach the EPOCH API. ${START_API_HINT}.`, res.status, path, true);
  }
  return payload as T;
}

export const apiGet = <T>(path: string): Promise<T> => request<T>('GET', path);
export const apiPost = <T>(path: string, body: unknown = {}): Promise<T> => request<T>('POST', path, body);

/**
 * A short, human explanation of a failed call. Write-specific statuses follow
 * the public demo contract (docs/API_CONTRACT.md).
 */
export function describeError(error: unknown, context: 'read' | 'write' | 'restore' = 'read'): string {
  if (error instanceof ApiError) {
    if (error.unreachable) return `Cannot reach the EPOCH API. ${START_API_HINT}.`;
    if (context !== 'read') {
      if (error.status === 429) return 'Busy, try again in a moment.';
      if (error.status === 409 && context === 'restore') return 'Restore already running.';
      if (error.status === 403) return 'Read-only in the public demo.';
    }
    return error.message;
  }
  return error instanceof Error ? error.message : String(error);
}

export const isNotFound = (error: unknown): boolean => error instanceof ApiError && error.status === 404;
