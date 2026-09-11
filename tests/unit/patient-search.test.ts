import { describe, expect, it } from "vitest";
import { patientListQuerySchema } from "@/lib/validations/patient";

describe("patientListQuerySchema", () => {
  it("accepts empty query (legacy full-list mode)", () => {
    const r = patientListQuerySchema.safeParse({ q: null, status: null, page: null, pageSize: null });
    expect(r.success).toBe(true);
  });

  it("accepts search + status + pagination", () => {
    const r = patientListQuerySchema.safeParse({ q: "ahmed", status: "Active", page: "2", pageSize: "10" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.page).toBe(2);
      expect(r.data.pageSize).toBe(10);
    }
  });

  it("rejects bad status, page 0, and oversized pageSize", () => {
    expect(patientListQuerySchema.safeParse({ status: "Unknown" }).success).toBe(false);
    expect(patientListQuerySchema.safeParse({ page: "0" }).success).toBe(false);
    expect(patientListQuerySchema.safeParse({ pageSize: "500" }).success).toBe(false);
  });

  it("trims overlong search terms", () => {
    expect(patientListQuerySchema.safeParse({ q: "x".repeat(101) }).success).toBe(false);
  });
});
