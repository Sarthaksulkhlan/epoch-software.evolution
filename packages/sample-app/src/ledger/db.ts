/**
 * Settlement ledger tables (in memory for the demo).
 * Only modules inside src/ledger/ may import this file (invariant INV-BOUND-04);
 * everything else goes through ledger-service.ts, which knows about the archive.
 */

export interface SettlementRow {
  orderId: string;
  amountCents: number;
  settledDay: number;
  debitCents: number;
  creditCents: number;
}

/** Settlements still in the hot ledger partition. */
export const liveSettlements = new Map<string, SettlementRow>();

/** Settlements moved to cold storage by the archival job. */
export const archivedSettlements = new Map<string, SettlementRow>();

export function clearLedgerTables(): void {
  liveSettlements.clear();
  archivedSettlements.clear();
}
