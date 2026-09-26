/**
 * Shared helpers for the demo scripts. When the API is running, scripts go
 * through it so the console sees every step live on the event stream; when it
 * is not, they run the same code in-process.
 */

export const API_URL = (process.env.EPOCH_API_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');

export async function apiIsUp(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/health`, { signal: AbortSignal.timeout(1500) });
    return response.ok;
  } catch {
    return false;
  }
}

export async function post<T>(path: string, body: unknown = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? `${path} failed with ${response.status}`);
  return data;
}

export function fail(error: unknown): never {
  console.error(`✖ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
