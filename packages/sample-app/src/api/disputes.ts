import { getOrder, markDisputed } from '../orders/order-service.js';
import { getSettlement } from '../ledger/ledger-service.js';
import { openReconciliation, type ReconciliationResult } from '../disputes/reconciler.js';
import { notify } from '../notifications/webhooks.js';

/** Customer-facing chargeback policy: days after settlement during which a dispute is accepted. */
export const CHARGEBACK_WINDOW_DAYS = 15;

export interface DisputeResult {
  accepted: boolean;
  reason: string;
  reconciliation?: ReconciliationResult;
}

export function fileDispute(orderId: string, day: number): DisputeResult {
  const order = getOrder(orderId);
  if (!order) return { accepted: false, reason: 'unknown order' };

  const settlement = getSettlement(orderId);
  if (!settlement) return { accepted: false, reason: 'order is not settled' };

  const ageDays = day - settlement.settledDay;
  if (ageDays > CHARGEBACK_WINDOW_DAYS) {
    return { accepted: false, reason: `outside the ${CHARGEBACK_WINDOW_DAYS}-day chargeback window` };
  }

  markDisputed(orderId);
  const reconciliation = openReconciliation(orderId);
  notify('dispute.opened', { orderId, day, reconciliation: reconciliation.status });
  return { accepted: true, reason: 'within the chargeback window', reconciliation };
}
