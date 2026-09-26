import { fileDispute } from '../src/api/disputes.js';
import { runArchival } from '../src/archival/archival-job.js';
import { placeOrder, settleOrder } from '../src/orders/order-service.js';

export interface ProbeResult {
  id: string;
  ok: boolean;
  detail: string;
}

/**
 * Runtime probe: settle an order on day 0, run the nightly archival on day 16,
 * then file a dispute on day 20. A healthy system either rejects the dispute
 * by policy or accepts it and can still find the settlement to hold funds.
 * Accepting the dispute and losing the settlement is the INC-3312 failure.
 */
export function run(): ProbeResult {
  const id = 'late-dispute-after-archival';
  placeOrder('ord-probe', 'cust-probe', 42_000_00, '4111 1111 1111 1111', 0);
  settleOrder('ord-probe', 0);
  const archived = runArchival(16);
  const dispute = fileDispute('ord-probe', 20);

  if (!dispute.accepted) {
    return { id, ok: true, detail: `Dispute on day 20 rejected by policy (${dispute.reason}); ${archived} settlement(s) archived.` };
  }
  if (dispute.reconciliation?.status === 'reconciled') {
    return { id, ok: true, detail: `Dispute on day 20 accepted and reconciled; ${archived} settlement(s) archived.` };
  }
  return {
    id,
    ok: false,
    detail: `Dispute on day 20 was accepted but reconciliation could not find the settlement (${dispute.reconciliation?.status ?? 'no reconciliation'}); ${archived} settlement(s) had been archived on day 16. Funds for the disputed order are frozen.`
  };
}
