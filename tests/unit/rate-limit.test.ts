import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MemoryStore,
  RedisClient,
  RedisStore,
  createRateLimitStore,
  resolveRateLimitRule,
  takeRateLimitToken,
} from "../../src/lib/rate-limit";

function makeFakeRedis(overrides: Partial<Record<"incr" | "pexpire" | "pttl" | "connect", ReturnType<typeof vi.fn>>> = {}) {
  return {
    incr: vi.fn().mockResolvedValue(1),
    pexpire: vi.fn().mockResolvedValue(1),
    pttl: vi.fn().mockResolvedValue(30_000),
    connect: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as RedisClient & { incr: ReturnType<typeof vi.fn>; pexpire: ReturnType<typeof vi.fn>; pttl: ReturnType<typeof vi.fn>; connect: ReturnType<typeof vi.fn> };
}

function redisStoreWith(fake: ReturnType<typeof makeFakeRedis>) {
  return new RedisStore("redis://fake:6379", () => fake as unknown as RedisClient);
}

beforeEach(() => {
  vi.stubEnv("REDIS_URL", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("MemoryStore", () => {
  it("enforces the max within a window and resets after the window", async () => {
    let clock = 0;
    const store = new MemoryStore(() => clock);
    const config = { max: 3, windowMs: 10_000 };
    const key = "mem-window-reset";

    const first = await store.take(key, config);
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(2);
    expect(first.retryAfterSeconds).toBe(10);

    await store.take(key, config);
    const beforeBlock = await store.take(key, config);
    expect(beforeBlock.allowed).toBe(true);
    expect(beforeBlock.remaining).toBe(0);

    const blocked = await store.take(key, config);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);

    clock = 10_001;
    const reset = await store.take(key, config);
    expect(reset.allowed).toBe(true);
    expect(reset.remaining).toBe(2);
  });

  it("reports remaining and retry-after correctly", async () => {
    let clock = 1_000;
    const store = new MemoryStore(() => clock);
    const key = "mem-remaining";
    const config = { max: 2, windowMs: 60_000 };

    const r1 = await store.take(key, config);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(1);
    expect(r1.retryAfterSeconds).toBe(60);

    const r2 = await store.take(key, config);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(0);

    clock = 60_500;
    const blocked = await store.take(key, config);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBe(1);
  });

  it("isolates counters per key", async () => {
    const store = new MemoryStore();
    const config = { max: 1, windowMs: 60_000 };

    const a1 = await store.take("iso-key-a", config);
    expect(a1.allowed).toBe(true);
    const a2 = await store.take("iso-key-a", config);
    expect(a2.allowed).toBe(false);
    const b1 = await store.take("iso-key-b", config);
    expect(b1.allowed).toBe(true);
  });
});

describe("RedisStore", () => {
  it("increments and sets the TTL only on the first hit in a window", async () => {
    const fake = makeFakeRedis();
    const store = redisStoreWith(fake);
    const key = "redis-first";
    const config = { max: 60, windowMs: 60_000 };

    const result = await store.take(key, config);

    expect(fake.incr).toHaveBeenCalledWith(key);
    expect(fake.pexpire).toHaveBeenCalledWith(key, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(59);
    expect(result.retryAfterSeconds).toBe(60);
  });

  it("does not extend the TTL on subsequent hits", async () => {
    const fake = makeFakeRedis({ incr: vi.fn().mockResolvedValue(2) });
    const store = redisStoreWith(fake);

    await store.take("redis-subsequent", { max: 60, windowMs: 60_000 });

    expect(fake.pexpire).not.toHaveBeenCalled();
  });

  it("blocks and reports retry-after from the remaining TTL", async () => {
    const fake = makeFakeRedis({
      incr: vi.fn().mockResolvedValue(61),
      pttl: vi.fn().mockResolvedValue(45_000),
    });
    const store = redisStoreWith(fake);
    const key = "redis-blocked";

    const result = await store.take(key, { max: 60, windowMs: 60_000 });

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(fake.pttl).toHaveBeenCalledWith(key);
    expect(result.retryAfterSeconds).toBe(45);
  });

  it("reuses the connected client across calls", async () => {
    const fake = makeFakeRedis();
    const store = redisStoreWith(fake);

    await store.take("k", { max: 5, windowMs: 60_000 });
    await store.take("k", { max: 5, windowMs: 60_000 });

    expect(fake.connect).toHaveBeenCalledTimes(1);
  });

  it("propagates command errors for the caller to handle", async () => {
    const fake = makeFakeRedis({
      incr: vi.fn().mockRejectedValue(new Error("redis timeout")),
    });
    const store = redisStoreWith(fake);

    await expect(
      store.take("redis-error", { max: 5, windowMs: 60_000 }),
    ).rejects.toThrow("redis timeout");
  });
});

describe("fail-closed behavior", () => {
  it("fails closed and logs when the store throws", async () => {
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const failingStore = {
      take: vi.fn().mockRejectedValue(new Error("connection refused")),
    };

    const result = await takeRateLimitToken(
      "any-key",
      { max: 5, windowMs: 60_000 },
      failingStore,
    );

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(errorSpy).toHaveBeenCalled();

    const [payload] = errorSpy.mock.calls[0] as [string];
    expect(payload).toContain("Rate limiter unavailable, failing closed");
    errorSpy.mockRestore();
  });

  it("fails closed through a connection failure in the Redis store path", async () => {
    const fake = makeFakeRedis({
      connect: vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED 127.0.0.1:6379")),
    });

    const result = await takeRateLimitToken(
      "redis-unreachable",
      { max: 5, windowMs: 60_000 },
      new RedisStore("redis://127.0.0.1:6379", () => fake as unknown as RedisClient),
    );

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });
});

describe("store selection", () => {
  it("uses the memory store when no REDIS_URL is configured", () => {
    expect(createRateLimitStore("")).toBeInstanceOf(MemoryStore);
    expect(createRateLimitStore(undefined)).toBeInstanceOf(MemoryStore);
  });

  it("uses the Redis store when REDIS_URL is configured", () => {
    expect(createRateLimitStore("redis://redis:6379")).toBeInstanceOf(RedisStore);
  });

  it("honors the default memory store end to end", async () => {
    const key = `default-store-${Date.now()}`;
    const config = { max: 2, windowMs: 60_000 };

    const a = await takeRateLimitToken(key, config);
    expect(a.allowed).toBe(true);

    const b = await takeRateLimitToken(key, config);
    expect(b.allowed).toBe(true);

    const c = await takeRateLimitToken(key, config);
    expect(c.allowed).toBe(false);
  });
});

describe("existing route rules and keying", () => {
  it("limits signup to 3 per hour per IP", () => {
    const rule = resolveRateLimitRule("/api/signup", "POST", "1.2.3.4");
    expect(rule).toEqual({
      key: "signup:1.2.3.4",
      config: { max: 3, windowMs: 3_600_000 },
    });
  });

  it("limits auth routes to 5 per minute per IP per path", () => {
    const nextAuth = resolveRateLimitRule(
      "/api/auth/callback/credentials",
      "POST",
      "1.2.3.4",
    );
    expect(nextAuth).toEqual({
      key: "auth:1.2.3.4:/api/auth/callback/credentials",
      config: { max: 5, windowMs: 60_000 },
    });

    const patientLogin = resolveRateLimitRule(
      "/api/patient-auth/login",
      "POST",
      "5.6.7.8",
    );
    expect(patientLogin?.key).toBe("auth:5.6.7.8:/api/patient-auth/login");
    expect(patientLogin?.config.max).toBe(5);
  });

  it("keys list routes by userId when present, else by IP", () => {
    const withUser = resolveRateLimitRule("/api/patients", "GET", "1.2.3.4", "user-1");
    expect(withUser?.key).toBe("list:user-1:/api/patients");
    expect(withUser?.config.max).toBe(60);

    const byIp = resolveRateLimitRule("/api/patients", "GET", "1.2.3.4");
    expect(byIp?.key).toBe("list:1.2.3.4:/api/patients");
  });

  it("only rates the exact high-volume GET routes and leaves others alone", () => {
    expect(resolveRateLimitRule("/api/tasks", "GET", "1.2.3.4")?.config.max).toBe(60);
    expect(resolveRateLimitRule("/api/appointments", "GET", "1.2.3.4")).not.toBeNull();
    expect(resolveRateLimitRule("/api/audit", "GET", "1.2.3.4")).not.toBeNull();

    expect(resolveRateLimitRule("/api/patients/123", "GET", "1.2.3.4")).toBeNull();
    expect(resolveRateLimitRule("/api/patients", "POST", "1.2.3.4")).toBeNull();
    expect(resolveRateLimitRule("/api/vitals/stream", "GET", "1.2.3.4")).toBeNull();
    expect(resolveRateLimitRule("/dashboard", "GET", "1.2.3.4")).toBeNull();
  });

  it("rate-limits public self-booking endpoints per IP", () => {
    const availability = resolveRateLimitRule("/api/book/acme/availability", "GET", "1.2.3.4");
    expect(availability?.config.max).toBe(30);
    expect(availability?.key).toContain("1.2.3.4");
    const booking = resolveRateLimitRule("/api/book/acme/appointments", "POST", "1.2.3.4");
    expect(booking?.config.max).toBe(30);
  });
});