import { describe, expect, it } from "vitest";
import {
  availabilityUpdateSchema,
  inventoryTransactionSchema,
  taskUpdateSchema,
} from "@/lib/validations/ops";
import {
  pushSubscriptionSchema,
  pushUnsubscribeSchema,
} from "@/lib/validations/notifications";

describe("taskUpdateSchema", () => {
  it("accepts a valid status + priority update", () => {
    const r = taskUpdateSchema.safeParse({ status: "in_progress", priority: "high" });
    expect(r.success).toBe(true);
  });

  it("rejects unknown status enum", () => {
    const r = taskUpdateSchema.safeParse({ status: "done-ish" });
    expect(r.success).toBe(false);
  });

  it("rejects empty update", () => {
    const r = taskUpdateSchema.safeParse({});
    expect(r.success).toBe(false);
  });

  it("rejects invalid dueDate", () => {
    const r = taskUpdateSchema.safeParse({ dueDate: "not-a-date" });
    expect(r.success).toBe(false);
  });
});

describe("inventoryTransactionSchema", () => {
  it("accepts restock", () => {
    expect(
      inventoryTransactionSchema.safeParse({ type: "restock", quantity: 5 }).success,
    ).toBe(true);
  });

  it("rejects zero quantity", () => {
    expect(
      inventoryTransactionSchema.safeParse({ type: "usage", quantity: 0 }).success,
    ).toBe(false);
  });

  it("rejects unknown type", () => {
    expect(
      inventoryTransactionSchema.safeParse({ type: "delete", quantity: 1 }).success,
    ).toBe(false);
  });
});

describe("availabilityUpdateSchema", () => {
  it("accepts a full valid payload", () => {
    const r = availabilityUpdateSchema.safeParse({
      availabilityType: "regular",
      availableDays: ["sun", "mon"],
      availableFrom: "09:00",
      availableTo: "17:00",
    });
    expect(r.success).toBe(true);
  });

  it("rejects bad day and bad time", () => {
    expect(
      availabilityUpdateSchema.safeParse({ availableDays: ["funday"] }).success,
    ).toBe(false);
    expect(
      availabilityUpdateSchema.safeParse({ availableFrom: "25:00" }).success,
    ).toBe(false);
  });
});

describe("push subscription schemas", () => {
  it("validates subscribe + unsubscribe", () => {
    expect(
      pushSubscriptionSchema.safeParse({
        endpoint: "https://push.example/x",
        p256dh: "k",
        auth: "a",
      }).success,
    ).toBe(true);
    expect(
      pushSubscriptionSchema.safeParse({ endpoint: "not-a-url" }).success,
    ).toBe(false);
    expect(
      pushUnsubscribeSchema.safeParse({ endpoint: "https://push.example/x" })
        .success,
    ).toBe(true);
  });
});
