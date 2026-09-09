import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { logServerError } from "@/lib/safe-logger";

// Skip DB init only when explicitly requested (e.g. for CI builds without a DB).
// Do NOT skip on Vercel runtime - API routes need the real Prisma client.
const skipDbInit = process.env.SKIP_DB_INIT === "true";

const connectionString = process.env.DATABASE_URL || "";
const dbUnavailable = skipDbInit || !connectionString;

let adapter: PrismaPg | undefined;

// Neon cold starts can take 5–15s; increase timeout so first request doesn't fail
if (!dbUnavailable) {
  try {
    const pool = new Pool({
      connectionString,
      connectionTimeoutMillis: 30_000,
      idleTimeoutMillis: 30_000,
    });
    adapter = new PrismaPg(pool);
  } catch (err) {
    logServerError("Prisma pool initialization failed, continuing without adapter", err);
  }
}

const globalForPrisma = globalThis as { prisma?: PrismaClient };

let client: PrismaClient;
if (dbUnavailable) {
  // during build or when skipping, provide a dummy proxy client that throws if used
  client =
    globalForPrisma.prisma ||
    (new Proxy(
      {},
      {
        get(_target, prop) {
          if (prop === "__isPrismaClient") return true;
          return () => {
            throw new Error(
              "Prisma client is disabled in the current environment",
            );
          };
        },
      },
    ) as PrismaClient);
} else {
  client =
    globalForPrisma.prisma ||
    new PrismaClient({
      ...(adapter ? { adapter } : {}),
      log:
        process.env.NODE_ENV === "development"
          ? ["query", "error", "warn"]
          : ["error"],
    });
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;
}

export const prisma = client;
