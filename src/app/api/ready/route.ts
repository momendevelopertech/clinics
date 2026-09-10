import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evaluateReadiness } from "@/lib/health";

export const dynamic = "force-dynamic";

/** Readiness probe — database is reachable. No secrets in the payload. */
export async function GET() {
  const report = await evaluateReadiness(() => prisma.$queryRaw`SELECT 1`);
  return NextResponse.json(report, {
    status: report.status === "ready" ? 200 : 503,
  });
}
