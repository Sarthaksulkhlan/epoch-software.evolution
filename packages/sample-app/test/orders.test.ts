import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkoutReceipt, DISPUTE_WINDOW_NOTICE_DAYS, placeOrder, settleOrder } from '../src/orders/order-service.js';
import { getSettlement } from '../src/ledger/ledger-service.js';

test('checkout receipt states the dispute window and hides the card number', () => {
  placeOrder('ord-receipt', 'cust-9', 12999, '4000 0566 5566 5556', 0);
  const receipt = checkoutReceipt('ord-receipt');
  assert.match(receipt, new RegExp(`within ${DISPUTE_WINDOW_NOTICE_DAYS} days`));
  assert.match(receipt, /ending 5556/);
  assert.doesNotMatch(receipt, /4000056655665556/);
});

test('settling an order records it in the ledger', () => {
  placeOrder('ord-settle', 'cust-3', 5000, '4111 1111 1111 1111', 0);
  settleOrder('ord-settle', 2);
  assert.equal(getSettlement('ord-settle')?.settledDay, 2);
});
