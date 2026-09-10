import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

/**
 * P3 integration DB helper. The unit-test setup (`tests/setup.ts`) forces
 * SKIP_DB_INIT, so `@/lib/prisma` always yields a dummy client under vitest.
 * Integration tests build their own live client here instead — same stack
 * (pg Pool + PrismaPg adapter), but only when a database URL is available.
 * Returns null when there is no DB (suite self-skips, CI stays green).
 */
export function loadIntegrationDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const env = readFileSync(join(process.cwd(), ".env"), "utf8");
    const m = env.match(/^DATABASE_URL=(.*)$/m);
    const url = m ? m[1].trim().replace(/"/g, "") : "";
    return url;
  } catch {
    return "";
  }
}

export function createIntegrationClient(url: string): PrismaClient {
  const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 30_000 });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}
