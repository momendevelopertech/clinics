import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { logServerError } from "@/lib/safe-logger";

/**
 * GET /api/feedback — staff ratings overview.
 * ?summary=doctor → [{ providerId, name, average, count }] for active staff
 * with at least one rating; otherwise the 100 most recent ratings.
 */
export async function GET(request: Request) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "analytics");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(orgId, [
      { action: "encounters:read", resource: "encounters" },
    ]);
    if (authz.response) return authz.response;

    if (new URL(request.url).searchParams.get("summary") === "doctor") {
      const grouped = await prisma.feedback.groupBy({
        by: ["providerId"],
        where: { organizationId: orgId, providerId: { not: null } },
        _avg: { rating: true },
        _count: { rating: true },
      });
      const ids = grouped.map((g) => g.providerId as string);
      const users =
        ids.length > 0
          ? await prisma.user.findMany({
              where: { id: { in: ids } },
              select: { id: true, name: true },
            })
          : [];
      const names = new Map(users.map((u) => [u.id, u.name ?? "—"]));
      return NextResponse.json(
        grouped.map((g) => ({
          providerId: g.providerId,
          name: names.get(g.providerId as string) ?? "—",
          average:
            g._avg.rating == null ? null : Math.round(g._avg.rating * 10) / 10,
          count: g._count.rating,
        })),
      );
    }

    const rows = await prisma.feedback.findMany({
      where: { organizationId: orgId },
      include: {
        patient: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json(rows);
  } catch (error) {
    logServerError("Error fetching feedback", error);
    return NextResponse.json({ error: "Failed to fetch feedback" }, { status: 500 });
  }
}
