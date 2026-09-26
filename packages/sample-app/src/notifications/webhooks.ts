export type WebhookEvent = 'order.settled' | 'dispute.opened';

export interface WebhookDelivery {
  event: WebhookEvent;
  payload: Record<string, unknown>;
}

/** Deliveries are recorded instead of sent; the demo has no network. */
export const deliveries: WebhookDelivery[] = [];

export function notify(event: WebhookEvent, payload: Record<string, unknown>): void {
  deliveries.push({ event, payload });
}

export function resetWebhooks(): void {
  deliveries.length = 0;
}
