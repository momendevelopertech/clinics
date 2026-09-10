import { NextResponse } from "next/server";

export type CronAuthResult =
  | { ok: true }
  | { ok: false; response: NextResponse };

function extractPresentedSecret(request: Request): string | null {
  const headerSecret = request.headers.get("x-cron-secret")?.trim();
  if (headerSecret) {
    return headerSecret;
  }

  const authorization = request.headers.get("authorization");
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    const token = authorization.slice("Bearer ".length).trim();
    return token || null;
  }

  return null;
}

/**
 * Shared guard for unauthenticated cron routes. Requires CRON_SECRET and
 * accepts either `x-cron-secret` or `Authorization: Bearer <CRON_SECRET>`
 * (Vercel Cron uses the latter).
 */
export function authorizeCronRequest(request: Request): CronAuthResult {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "CRON_SECRET is not configured" },
        { status: 503 },
      ),
    };
  }

  const presented = extractPresentedSecret(request);
  if (!presented || presented !== expected) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { ok: true };
}
