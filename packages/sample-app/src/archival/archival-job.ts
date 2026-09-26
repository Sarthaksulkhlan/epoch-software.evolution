import { archiveSettledBefore } from '../ledger/ledger-service.js';

/** Settled ledger rows older than this many days move to cold storage each night. */
export const LEDGER_RETENTION_DAYS = 15;

/** Nightly job. Returns how many settlements were archived. */
export function runArchival(today: number): number {
  return archiveSettledBefore(today - LEDGER_RETENTION_DAYS);
}
