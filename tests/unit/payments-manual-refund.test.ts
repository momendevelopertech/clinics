import { describe, expect, it } from "vitest";
import { MANUAL_METHODS, PAYMENT_METHODS, resolveInvoiceStatus } from "@/lib/payments";
import { paymentRefundSchema, paymentSchema } from "@/lib/validations";

describe("resolveInvoiceStatus", () => {
  it("marks paid / partial / sent by money only", () => {
    expect(resolveInvoiceStatus(100, 100)).toBe("paid");
    expect(resolveInvoiceStatus(100, 99.998)).toBe("paid"); // cent tolerance
    expect(resolveInvoiceStatus(100, 40)).toBe("partially_paid");
    expect(resolveInvoiceStatus(100, 0)).toBe("sent");
    expect(resolveInvoiceStatus(100, 0.004)).toBe("sent");
  });
});

describe("payment method inputs", () => {
  it("accepts card default plus counter methods", () => {
    expect(paymentSchema.safeParse({ invoiceId: "i", amount: 10 }).success).toBe(true);
    expect(
      paymentSchema.safeParse({ invoiceId: "i", amount: 10 }).success &&
        (paymentSchema.safeParse({ invoiceId: "i", amount: 10 }).data as { method: string }).method,
    ).toBe("card");
    for (const m of ["online", "cash", "transfer", "check", "insurance"]) {
      expect(paymentSchema.safeParse({ invoiceId: "i", amount: 10, method: m }).success).toBe(true);
    }
    expect(paymentSchema.safeParse({ invoiceId: "i", amount: 10, method: "crypto" }).success).toBe(
      false,
    );
  });

  it("classifies manual vs Stripe methods", () => {
    expect(PAYMENT_METHODS).toContain("cash");
    for (const m of ["cash", "transfer", "check", "insurance"]) {
      expect(MANUAL_METHODS.has(m)).toBe(true);
    }
    expect(MANUAL_METHODS.has("card")).toBe(false);
    expect(MANUAL_METHODS.has("online")).toBe(false);
  });
});

describe("paymentRefundSchema", () => {
  it("accepts empty (full refund) or a positive partial amount", () => {
    expect(paymentRefundSchema.safeParse({}).success).toBe(true);
    expect(paymentRefundSchema.safeParse({ amount: 25.5 }).success).toBe(true);
    expect(paymentRefundSchema.safeParse({ amount: 0 }).success).toBe(false);
    expect(paymentRefundSchema.safeParse({ amount: -5 }).success).toBe(false);
  });
});
