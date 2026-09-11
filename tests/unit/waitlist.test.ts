import { describe, expect, it } from "vitest";
import { rankWaitlistCandidates } from "@/lib/waitlist";
import { waitlistUpdateSchema } from "@/lib/validations/ops";

describe("rankWaitlistCandidates", () => {
  const freed = new Date(2026, 8, 8, 10, 0);
  const entries = [
    { id: "old-no-pref", preferredDate: null, createdAt: new Date(2026, 8, 1) },
    { id: "new-same-day", preferredDate: new Date(2026, 8, 8, 15, 0), createdAt: new Date(2026, 8, 5) },
    { id: "old-other-day", preferredDate: new Date(2026, 8, 9, 9, 0), createdAt: new Date(2026, 8, 2) },
    { id: "older-no-pref", preferredDate: null, createdAt: new Date(2026, 7, 30) },
  ];

  it("prefers same-day preference, then oldest-waiting", () => {
    expect(rankWaitlistCandidates(entries, freed, 10).map((e) => e.id)).toEqual([
      "new-same-day",
      "older-no-pref",
      "old-no-pref",
      "old-other-day",
    ]);
  });

  it("caps offers at the limit", () => {
    expect(rankWaitlistCandidates(entries, freed, 2)).toHaveLength(2);
  });
});

describe("waitlistUpdateSchema", () => {
  it("accepts known lifecycle statuses and rejects the rest", () => {
    expect(waitlistUpdateSchema.safeParse({ status: "offered" }).success).toBe(true);
    expect(waitlistUpdateSchema.safeParse({ status: "scheduled" }).success).toBe(false);
    expect(waitlistUpdateSchema.safeParse({}).success).toBe(true);
  });
});
