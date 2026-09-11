/**
 * Shared payment helpers (used by card, manual, and refund flows).
 * Money stays in major units (e.g. 25.50); Stripe conversion happens at the edge.
 */

export const PAYMENT_METHODS = [
  "card",
  "online",
  "cash",
  "transfer",
  "check",
  "insurance",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Record-only methods settle immediately without a Stripe PaymentIntent. */
export const MANUAL_METHODS: ReadonlySet<string> = new Set([
  "cash",
  "transfer",
  "check",
  "insurance",
]);

const EPS = 0.005;

export type InvoicePaymentStatus = "paid" | "partially_paid" | "sent";

/**
 * Recomputes invoice status after a payment or refund moves amountPaid.
 * Only the money-driven states are returned — draft/overdue are lifecycle
 * states owned by the billing flow and must never be overwritten here.
 */
export function resolveInvoiceStatus(total: number, paid: number): InvoicePaymentStatus {
  if (paid >= total - EPS) return "paid";
  if (paid <= EPS) return "sent";
  return "partially_paid";
}
