import { describe, expect, it } from "vitest";
import { invoiceCreateSchema, paymentSchema } from "@/lib/validations";

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
