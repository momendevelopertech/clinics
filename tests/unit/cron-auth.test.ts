import { afterEach, describe, expect, it, vi } from "vitest";
import { authorizeCronRequest } from "../../src/lib/cron-auth";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("authorizeCronRequest", () => {
  it("returns 503 when CRON_SECRET is not configured", () => {
    vi.stubEnv("CRON_SECRET", "");
    const result = authorizeCronRequest(new Request("http://localhost/cron"));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(503);
    }
  });

  it("rejects missing or wrong secrets with 401", () => {
    vi.stubEnv("CRON_SECRET", "expected-secret");
    const missing = authorizeCronRequest(new Request("http://localhost/cron"));
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.response.status).toBe(401);

    const wrong = authorizeCronRequest(
      new Request("http://localhost/cron", {
        headers: { "x-cron-secret": "nope" },
      }),
    );
    expect(wrong.ok).toBe(false);
  });

  it("accepts x-cron-secret and Authorization Bearer", () => {
    vi.stubEnv("CRON_SECRET", "expected-secret");

    const header = authorizeCronRequest(
      new Request("http://localhost/cron", {
        headers: { "x-cron-secret": "expected-secret" },
      }),
    );
    expect(header).toEqual({ ok: true });

    const bearer = authorizeCronRequest(
      new Request("http://localhost/cron", {
        headers: { Authorization: "Bearer expected-secret" },
      }),
    );
    expect(bearer).toEqual({ ok: true });
  });
});
