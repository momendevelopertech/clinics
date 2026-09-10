/**
 * Webhook idempotency decisions for Stripe payment events.
 *
 * Stripe retries webhook deliveries, so handlers must be idempotent:
 * applying the same event twice must not move money twice. A payment in a
 * terminal state for the incoming event is left untouched.
 */
export type PaymentWebhookEvent =
  | "payment_intent.succeeded"
  | "payment_intent.payment_failed"
  | "charge.refunded";

/**
 * Terminal payment states per event. A retried delivery for a payment that
 * already reached the event's terminal state (or a state past it, e.g. a
 * late success for a refunded payment) must be a no-op — otherwise invoice
 * money is moved twice.
 */
const SKIP_WHEN_STATUS: Record<PaymentWebhookEvent, ReadonlySet<string>> = {
  "payment_intent.succeeded": new Set(["completed", "failed", "refunded", "cancelled"]),
  "payment_intent.payment_failed": new Set(["failed", "refunded", "completed", "cancelled"]),
  "charge.refunded": new Set(["refunded", "cancelled"]),
};

export function shouldApplyPaymentEvent(
  currentStatus: string,
  event: PaymentWebhookEvent,
): boolean {
  return !SKIP_WHEN_STATUS[event].has(currentStatus);
}
