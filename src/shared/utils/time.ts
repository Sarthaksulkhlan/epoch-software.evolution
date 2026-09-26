export function now(): number {
  return Date.now();
}

export function toISO(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

export function fromISO(iso: string): number {
  return new Date(iso).getTime();
}
