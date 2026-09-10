import { describe, expect, it } from "vitest";
import { invoiceCreateSchema, paymentSchema } from "@/lib/validations";
import { shouldApplyPaymentEvent } from "@/lib/webhooks";

describe("billing totals and allocation inputs", () => {
  it("accepts catalog-backed invoice lines", () => {
    const parsed = invoiceCreateSchema.safeParse({
      patientId: "patient-1",
      lineItems: [{
        serviceCatalogId: "service-1",
        quantity: 2,
        discountAmount: 5,
        taxAmount: 2.5,
      }],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid or non-positive payment amounts", () => {
    expect(paymentSchema.safeParse({ invoiceId: "inv-1", amount: 25 }).success).toBe(true);
    expect(paymentSchema.safeParse({ invoiceId: "inv-1", amount: 0 }).success).toBe(false);
  });
});

describe("webhook idempotency", () => {
  it("applies each event once — duplicate deliveries are no-ops", () => {
    expect(shouldApplyPaymentEvent("pending", "payment_intent.succeeded")).toBe(true);
    expect(shouldApplyPaymentEvent("completed", "payment_intent.succeeded")).toBe(false);
    expect(shouldApplyPaymentEvent("pending", "payment_intent.payment_failed")).toBe(true);
    expect(shouldApplyPaymentEvent("failed", "payment_intent.payment_failed")).toBe(false);
    expect(shouldApplyPaymentEvent("completed", "charge.refunded")).toBe(true);
    expect(shouldApplyPaymentEvent("refunded", "charge.refunded")).toBe(false);
  });

  it("never re-credits a completed invoice on redelivery", () => {
    // Regression: duplicate payment_intent.succeeded added payment.amount
    // to invoice.amountPaid a second time. Terminal states must skip —
    // including late arrivals for refunded payments.
    for (const terminal of ["completed", "failed", "refunded", "cancelled"]) {
      expect(shouldApplyPaymentEvent(terminal, "payment_intent.succeeded")).toBe(false);
    }
    expect(shouldApplyPaymentEvent("pending", "payment_intent.succeeded")).toBe(true);
  });
});
