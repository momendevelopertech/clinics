import { describe, expect, it } from "vitest";
import {
  isPlanFinishable,
  isPlanTransitionAllowed,
  isStepTransitionAllowed,
} from "@/lib/treatment-plans";
import {
  treatmentPlanCreateSchema,
  treatmentPlanStepCreateSchema,
  treatmentPlanStepUpdateSchema,
} from "@/lib/validations";

describe("treatment plan machines", () => {
  it("moves draft -> active -> completed, never backwards", () => {
    expect(isPlanTransitionAllowed("draft", "active")).toBe(true);
    expect(isPlanTransitionAllowed("active", "completed")).toBe(true);
    expect(isPlanTransitionAllowed("completed", "active")).toBe(false);
    expect(isPlanTransitionAllowed("cancelled", "draft")).toBe(false);
  });

  it("moves steps with reopen support", () => {
    expect(isStepTransitionAllowed("pending", "done")).toBe(true);
    expect(isStepTransitionAllowed("pending", "skipped")).toBe(true);
    expect(isStepTransitionAllowed("done", "pending")).toBe(true);
    expect(isStepTransitionAllowed("skipped", "done")).toBe(false);
  });

  it("requires every step resolved before finishing (empty plan is finishable)", () => {
    expect(isPlanFinishable([])).toBe(true);
    expect(isPlanFinishable(["done", "skipped"])).toBe(true);
    expect(isPlanFinishable(["done", "pending"])).toBe(false);
  });
});

describe("treatment plan schemas", () => {
  it("validates plans and steps", () => {
    expect(
      treatmentPlanCreateSchema.safeParse({ patientId: "p", title: "HTN plan" }).success,
    ).toBe(true);
    expect(
      treatmentPlanStepCreateSchema.safeParse({ kind: "procedure", title: "Laser 1" }).success,
    ).toBe(true);
    expect(
      treatmentPlanStepCreateSchema.safeParse({ kind: "surgery", title: "x" }).success,
    ).toBe(false);
    expect(treatmentPlanStepUpdateSchema.safeParse({ status: "done" }).success).toBe(true);
  });
});
