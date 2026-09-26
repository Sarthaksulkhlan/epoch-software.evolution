import { getSettlement } from '../ledger/ledger-service.js';

export type ReconciliationStatus = 'reconciled' | 'settlement-missing';

export interface ReconciliationResult {
  orderId: string;
  status: ReconciliationStatus;
  amountCents?: number;
}

/** Match a disputed order against its settlement so the funds can be held. */
export function openReconciliation(orderId: string): ReconciliationResult {
  const settlement = getSettlement(orderId);
  if (!settlement) return { orderId, status: 'settlement-missing' };
  return { orderId, status: 'reconciled', amountCents: settlement.amountCents };
}
