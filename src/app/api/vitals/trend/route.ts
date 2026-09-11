import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { logServerError } from "@/lib/safe-logger";
import { toTrendSeries, trendStats, TREND_METRICS, type TrendMetric } from "@/lib/vitals-trend";
import { z } from "zod";

const trendQuerySchema = z.object({
  patientId: z.string().min(1),
  metric: z.enum(TREND_METRICS).default("bloodPressureSystolic"),
  days: z.coerce.number().int().min(7).max(730).default(180),
});

/** GET /api/vitals/trend?patientId=&metric=&days= — time series + stats. */
export async function GET(request: Request) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "encounters");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(orgId, [
      { action: "patients:read", resource: "patients" },
      { action: "encounters:read", resource: "encounters" },
    ]);
    if (authz.response) return authz.response;

    const { searchParams } = new URL(request.url);
    const parsed = trendQuerySchema.safeParse({
      patientId: searchParams.get("patientId"),
      metric: searchParams.get("metric"),
      days: searchParams.get("days"),
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query" }, { status: 400 });
    }
    const patient = await prisma.patient.findFirst({
      where: { id: parsed.data.patientId, organizationId: orgId },
      select: { id: true },
    });
    if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

    const since = new Date(Date.now() - parsed.data.days * 24 * 60 * 60 * 1000);
    const vitals = await prisma.vital.findMany({
      where: { patientId: patient.id, recordedAt: { gte: since } },
      orderBy: { recordedAt: "asc" },
      take: 1000,
    });
    const metric = parsed.data.metric as TrendMetric;
    const points = toTrendSeries(
      vitals as unknown as Array<Record<string, unknown>>,
      metric,
    );
    return NextResponse.json({ metric, points, stats: trendStats(points) });
  } catch (error) {
    logServerError("Error computing vitals trend", error);
    return NextResponse.json({ error: "Failed to compute trend" }, { status: 500 });
  }
}
