/**
 * Order tables (in memory for the demo).
 * Only modules inside src/orders/ may import this file (invariant INV-BOUND-04).
 */

export type OrderStatus = 'placed' | 'settled' | 'disputed';

export interface OrderRow {
  orderId: string;
  customerId: string;
  amountCents: number;
  placedDay: number;
  status: OrderStatus;
  cardToken: string;
}

export const orders = new Map<string, OrderRow>();

export function clearOrderTables(): void {
  orders.clear();
}
