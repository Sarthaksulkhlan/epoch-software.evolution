/**
 * Helpers for the persistence boundary. SQLite returns NULL for absent values
 * and TEXT for JSON columns; the Zod schemas use optional fields and arrays.
 * Rows are normalised here and then parsed with the entity schema (ADR-008).
 */

export type Row = Record<string, unknown>;

/** Drop null/undefined values so optional schema fields stay absent. */
export function compact(row: Row): Row {
  const out: Row = {};
  for (const [key, value] of Object.entries(row)) {
    if (value !== null && value !== undefined) out[key] = value;
  }
  return out;
}

/** Decode the named JSON columns in place. */
export function decodeJson(row: Row, columns: readonly string[]): Row {
  const out: Row = { ...row };
  for (const column of columns) {
    const value = out[column];
    if (typeof value === 'string') out[column] = JSON.parse(value) as unknown;
  }
  return out;
}

/** Convert an optional value to a SQLite parameter. */
export function param<T>(value: T | undefined): T | null {
  return value === undefined ? null : value;
}

export function json(value: unknown): string {
  return JSON.stringify(value);
}
