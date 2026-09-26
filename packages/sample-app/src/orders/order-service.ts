import { clearOrderTables, orders, type OrderRow } from './order-store.js';
import { recordSettlement } from '../ledger/ledger-service.js';
import { lastFour, tokenize } from '../vault/card-vault.js';

/** Printed on every checkout receipt. Customer-facing copy of the chargeback policy. */
export const DISPUTE_WINDOW_NOTICE_DAYS = 15;

export function placeOrder(orderId: string, customerId: string, amountCents: number, cardNumber: string, day: number): OrderRow {
  if (orders.has(orderId)) throw new Error(`Order ${orderId} already exists`);
  const row: OrderRow = { orderId, customerId, amountCents, placedDay: day, status: 'placed', cardToken: tokenize(cardNumber) };
  orders.set(orderId, row);
  return row;
}

export function settleOrder(orderId: string, day: number): void {
  const order = requireOrder(orderId);
  recordSettlement(orderId, order.amountCents, day);
  order.status = 'settled';
}

export function getOrder(orderId: string): OrderRow | undefined {
  return orders.get(orderId);
}

export function markDisputed(orderId: string): void {
  requireOrder(orderId).status = 'disputed';
}

export function checkoutReceipt(orderId: string): string {
  const order = requireOrder(orderId);
  return [
    `Order ${order.orderId}: ${(order.amountCents / 100).toFixed(2)} USD`,
    `Card ending ${lastFour(order.cardToken)}`,
    `Disputes accepted within ${DISPUTE_WINDOW_NOTICE_DAYS} days of settlement.`
  ].join('\n');
}

export function resetOrders(): void {
  clearOrderTables();
}

function requireOrder(orderId: string): OrderRow {
  const order = orders.get(orderId);
  if (!order) throw new Error(`Unknown order ${orderId}`);
  return order;
}
