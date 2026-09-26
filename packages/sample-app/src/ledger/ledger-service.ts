import { archivedSettlements, clearLedgerTables, liveSettlements, type SettlementRow } from './db.js';

/**
 * The only public way to read or write settlements. Lookups check the hot
 * partition first and then the archive, so archival never hides a settlement.
 */

export function recordSettlement(orderId: string, amountCents: number, day: number): SettlementRow {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error(`Settlement amount must be a positive integer, got ${amountCents}`);
  }
  const row: SettlementRow = { orderId, amountCents, settledDay: day, debitCents: amountCents, creditCents: amountCents };
  liveSettlements.set(orderId, row);
  return row;
}

export function getSettlement(orderId: string): SettlementRow | undefined {
  return liveSettlements.get(orderId) ?? archivedSettlements.get(orderId);
}

/** Move settlements that settled before `cutoffDay` to cold storage. Returns how many moved. */
export function archiveSettledBefore(cutoffDay: number): number {
  let moved = 0;
  for (const [orderId, row] of liveSettlements) {
    if (row.settledDay < cutoffDay) {
      archivedSettlements.set(orderId, row);
      liveSettlements.delete(orderId);
      moved++;
    }
  }
  return moved;
}

/** Double-entry check across both partitions (invariant INV-DATA-01). */
export function trialBalance(): { debitCents: number; creditCents: number } {
  let debitCents = 0;
  let creditCents = 0;
  for (const row of [...liveSettlements.values(), ...archivedSettlements.values()]) {
    debitCents += row.debitCents;
    creditCents += row.creditCents;
  }
  return { debitCents, creditCents };
}

export function resetLedger(): void {
  clearLedgerTables();
}
