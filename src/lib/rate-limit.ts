import Redis from "ioredis";
import { logServerError } from "@/lib/safe-logger";

type RateLimitConfig = {
  max: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export type RateLimitRule = {
  key: string;
  config: RateLimitConfig;
};

export interface RateLimitStore {
  take(key: string, config: RateLimitConfig): Promise<RateLimitResult>;
}

export type RedisClient = {
  incr(key: string): Promise<number>;
  pexpire(key: string, milliseconds: number): Promise<number>;
  pttl(key: string): Promise<number>;
  connect?: () => Promise<void>;
};

export const HIGH_VOLUME_GET_ROUTES = new Set([
  "/api/patients",
  "/api/appointments",
  "/api/tasks",
  "/api/communications",
  "/api/waitlist",
  "/api/audit",
]);

export const AUTH_RATE_LIMIT_CONFIG: RateLimitConfig = {
  max: 5,
  windowMs: 60_000,
};

export const SIGNUP_RATE_LIMIT_CONFIG: RateLimitConfig = {
  max: 3,
  windowMs: 60 * 60 * 1000,
};

export const LIST_RATE_LIMIT_CONFIG: RateLimitConfig = {
  max: 60,
  windowMs: 60_000,
};

export const BOOK_RATE_LIMIT_CONFIG: RateLimitConfig = {
  max: 30,
  windowMs: 60_000,
};

export function resolveRateLimitRule(
  pathname: string,
  method: string,
  clientIp: string,
  tokenUserId?: string,
): RateLimitRule | null {
  if (pathname === "/api/signup") {
    return {
      key: `signup:${clientIp}`,
      config: SIGNUP_RATE_LIMIT_CONFIG,
    };
  }

  const authRoute =
    pathname.startsWith("/api/auth") || pathname === "/api/patient-auth/login";
  if (authRoute) {
    return {
      key: `auth:${clientIp}:${pathname}`,
      config: AUTH_RATE_LIMIT_CONFIG,
    };
  }

  if (method === "GET" && HIGH_VOLUME_GET_ROUTES.has(pathname)) {
    return {
      key: `list:${tokenUserId ?? clientIp}:${pathname}`,
      config: LIST_RATE_LIMIT_CONFIG,
    };
  }

  if (pathname.startsWith("/api/book/")) {
    return {
      key: `book:${clientIp}:${pathname}`,
      config: BOOK_RATE_LIMIT_CONFIG,
    };
  }

  return null;
}

type MemoryEntry = {
  count: number;
  resetAt: number;
};

const globalMemory = globalThis as typeof globalThis & {
  __rateLimitStore?: Map<string, MemoryEntry>;
};

export class MemoryStore implements RateLimitStore {
  private readonly store: Map<string, MemoryEntry>;
  private readonly now: () => number;

  constructor(now: () => number = Date.now) {
    this.now = now;
    this.store =
      globalMemory.__rateLimitStore ?? new Map<string, MemoryEntry>();
    globalMemory.__rateLimitStore = this.store;
  }

  async take(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const currentTime = this.now();
    const current = this.store.get(key);

    if (!current || current.resetAt <= currentTime) {
      this.store.set(key, {
        count: 1,
        resetAt: currentTime + config.windowMs,
      });

      return {
        allowed: true,
        remaining: config.max - 1,
        retryAfterSeconds: Math.ceil(config.windowMs / 1000),
      };
    }

    if (current.count >= config.max) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((current.resetAt - currentTime) / 1000),
        ),
      };
    }

    current.count += 1;
    this.store.set(key, current);

    return {
      allowed: true,
      remaining: Math.max(0, config.max - current.count),
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((current.resetAt - currentTime) / 1000),
      ),
    };
  }
}

const DEFAULT_REDIS_OPTIONS = {
  lazyConnect: true,
  connectTimeout: 1_500,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
  retryStrategy: () => null,
};

export class RedisStore implements RateLimitStore {
  private readonly url: string;
  private readonly createClient: (url: string) => RedisClient;
  private client: RedisClient | null = null;

  constructor(url: string, createClient?: (url: string) => RedisClient) {
    this.url = url;
    this.createClient =
      createClient ?? ((redisUrl) => new Redis(redisUrl, DEFAULT_REDIS_OPTIONS));
  }

  private async getClient() {
    if (!this.client) {
      const client = this.createClient(this.url);
      if (client.connect) {
        await client.connect();
      }
      this.client = client;
    }
    return this.client;
  }

  async take(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const client = await this.getClient();
    const count = await client.incr(key);

    if (count === 1) {
      await client.pexpire(key, config.windowMs);
    }

    const allowed = count <= config.max;
    let retryAfterSeconds = Math.ceil(config.windowMs / 1000);

    if (!allowed) {
      const ttl = await client.pttl(key);
      if (ttl > 0) {
        retryAfterSeconds = Math.max(1, Math.ceil(ttl / 1000));
      }
    }

    return {
      allowed,
      remaining: Math.max(0, config.max - count),
      retryAfterSeconds,
    };
  }
}

export function createRateLimitStore(redisUrl?: string): RateLimitStore {
  return redisUrl ? new RedisStore(redisUrl) : new MemoryStore();
}

let store: RateLimitStore | undefined;

function resolveStore() {
  if (!store) {
    store = createRateLimitStore(process.env.REDIS_URL?.trim());
  }
  return store;
}

export async function takeRateLimitToken(
  key: string,
  config: RateLimitConfig,
  storeOverride?: RateLimitStore,
): Promise<RateLimitResult> {
  try {
    const target = storeOverride ?? resolveStore();
    return await target.take(key, config);
  } catch (error) {
    logServerError("Rate limiter unavailable, failing closed", error);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil(config.windowMs / 1000),
    };
  }
}