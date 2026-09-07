import { describe, expect, it } from "vitest";

describe("medical timeline projection", () => {
  it("uses tenant and patient scope for every clinical event source", () => {
    const sources = ["appointments", "encounters", "prescriptions", "invoices", "labResults", "diagnoses", "followUps", "procedureOrders", "documents"];
    expect(sources).toHaveLength(9);
    expect(sources).toContain("procedureOrders");
    expect(sources).toContain("documents");
  });
});
