import { describe, expect, it } from "vitest";
import { categorizeInventoryAlerts } from "@/lib/inventory-alerts";
import { inventoryCreateSchema, inventoryUpdateSchema } from "@/lib/validations/ops";

const NOW = new Date("2026-09-11T00:00:00Z");
const item = (over: object) => ({
  id: "i",
  name: "n",
  quantity: 10,
  reorderLevel: 5,
  expiryDate: null,
  ...over,
});

describe("categorizeInventoryAlerts", () => {
  it("splits expired / expiring-soon / low-stock", () => {
    const out = categorizeInventoryAlerts(
      [
        item({ id: "e", expiryDate: "2026-09-01" }),
        item({ id: "s", expiryDate: "2026-09-20" }),
        item({ id: "ok", expiryDate: "2027-01-01" }),
        item({ id: "low", quantity: 2 }),
        item({ id: "low-exp", quantity: 0, expiryDate: "2026-08-01" }),
      ],
      NOW,
    );
    expect(out.expired.map((i) => i.id).sort()).toEqual(["e", "low-exp"]);
    expect(out.expiringSoon.map((i) => i.id)).toEqual(["s"]);
    expect(out.lowStock.map((i) => i.id).sort()).toEqual(["low", "low-exp"]);
  });

  it("ignores items without expiry and bad dates", () => {
    const out = categorizeInventoryAlerts([item({ id: "a" }), item({ id: "b", expiryDate: "x" })], NOW);
    expect(out.expired).toEqual([]);
    expect(out.expiringSoon).toEqual([]);
  });
});

describe("inventory expiry/batch schemas", () => {
  it("accepts expiry + batch on create and partial update", () => {
    expect(
      inventoryCreateSchema.safeParse({
        name: "Amoxicillin",
        expiryDate: new Date("2027-01-01").toISOString(),
        batchNumber: "B-42",
      }).success,
    ).toBe(true);
    expect(inventoryUpdateSchema.safeParse({ batchNumber: "B-43" }).success).toBe(true);
    expect(inventoryUpdateSchema.safeParse({ expiryDate: null }).success).toBe(true);
  });

  it("rejects bad dates and overlong batches", () => {
    expect(inventoryCreateSchema.safeParse({ name: "x", expiryDate: "soon" }).success).toBe(false);
    expect(
      inventoryUpdateSchema.safeParse({ batchNumber: "b".repeat(81) }).success,
    ).toBe(false);
  });
});
