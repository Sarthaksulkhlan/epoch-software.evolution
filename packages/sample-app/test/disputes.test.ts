import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHARGEBACK_WINDOW_DAYS, fileDispute } from '../src/api/disputes.js';
import { placeOrder, settleOrder } from '../src/orders/order-service.js';

test('accepts a dispute on the last day of the chargeback window', () => {
  placeOrder('ord-window-edge', 'cust-1', 4200, '4111 1111 1111 1111', 0);
  settleOrder('ord-window-edge', 1);
  const result = fileDispute('ord-window-edge', 1 + CHARGEBACK_WINDOW_DAYS);
  assert.equal(result.accepted, true);
  assert.equal(result.reconciliation?.status, 'reconciled');
});

test('rejects a dispute one day after the chargeback window', () => {
  placeOrder('ord-window-late', 'cust-2', 1500, '5500 0000 0000 0004', 0);
  settleOrder('ord-window-late', 2);
  const result = fileDispute('ord-window-late', 2 + CHARGEBACK_WINDOW_DAYS + 1);
  assert.equal(result.accepted, false);
});

test('rejects disputes for unknown orders', () => {
  assert.equal(fileDispute('ord-missing', 3).accepted, false);
});
