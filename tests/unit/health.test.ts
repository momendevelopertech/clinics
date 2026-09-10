import { describe, expect, it } from "vitest";
import { evaluateReadiness, livenessPayload } from "../../src/lib/health";

describe("livenessPayload", () => {
  it("reports ok without dependency details", () => {
    expect(livenessPayload()).toEqual({ status: "ok" });
  });
});

describe("evaluateReadiness", () => {
  it("is ready when the database ping succeeds", async () => {
    await expect(evaluateReadiness(async () => 1)).resolves.toEqual({
      status: "ready",
      checks: { database: "ok" },
    });
  });

  it("is not ready when the database ping fails", async () => {
    await expect(
      evaluateReadiness(async () => {
        throw new Error("connect ECONNREFUSED");
      }),
    ).resolves.toEqual({
      status: "not_ready",
      checks: { database: "fail" },
    });
  });
});
