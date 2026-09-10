import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ProductionBootError,
  assertProductionSecrets,
  inspectProductionSecrets,
} from "../../src/lib/boot-env";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("inspectProductionSecrets", () => {
  it("skips checks outside production", () => {
    expect(
      inspectProductionSecrets({
        NODE_ENV: "development",
        NEXTAUTH_SECRET: "",
        ENCRYPTION_KEY: "",
      }),
    ).toEqual({ ok: true });
  });

  it("fails closed in production when secrets are missing", () => {
    const result = inspectProductionSecrets({
      NODE_ENV: "production",
      NEXTAUTH_SECRET: "",
      ENCRYPTION_KEY: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.missing).toEqual(["NEXTAUTH_SECRET", "ENCRYPTION_KEY"]);
    }
  });

  it("rejects placeholder and short secrets", () => {
    const result = inspectProductionSecrets({
      NODE_ENV: "production",
      NEXTAUTH_SECRET: "change-me-before-production",
      ENCRYPTION_KEY: "short",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.missing).toContain("NEXTAUTH_SECRET");
      expect(result.missing).toContain("ENCRYPTION_KEY");
    }
  });

  it("accepts AUTH_SECRET as an alias for NEXTAUTH_SECRET", () => {
    const result = inspectProductionSecrets({
      NODE_ENV: "production",
      AUTH_SECRET: "a".repeat(32),
      ENCRYPTION_KEY: "b".repeat(32),
    });
    expect(result).toEqual({ ok: true });
  });

  it("accepts strong secrets in production", () => {
    expect(
      inspectProductionSecrets({
        NODE_ENV: "production",
        NEXTAUTH_SECRET: "n".repeat(32),
        ENCRYPTION_KEY: "e".repeat(32),
      }),
    ).toEqual({ ok: true });
  });
});

describe("assertProductionSecrets", () => {
  it("throws ProductionBootError in production without secrets", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXTAUTH_SECRET", "");
    vi.stubEnv("ENCRYPTION_KEY", "");

    expect(() => assertProductionSecrets()).toThrow(ProductionBootError);
  });

  it("does not throw in development without secrets", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXTAUTH_SECRET", "");
    vi.stubEnv("ENCRYPTION_KEY", "");

    expect(() => assertProductionSecrets()).not.toThrow();
  });
});
