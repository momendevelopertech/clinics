import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/org";
import { requireModulePermission } from "@/lib/permissions";
import { logServerError } from "@/lib/safe-logger";

/**
 * GET /api/prescriptions/favorites?q= — top personal medication-name
 * favorites for the current doctor, ordered by usage (then recency) and
 * capped at 10. Org + user scoped. The dialog calls this once the user
 * types ≥2 characters; with no query it returns the doctor's most-used.
 */
export async function GET(request: Request) {
  try {
    const context = await requireOrgContext();
    const { organizationId, userId } = context;

    const moduleAuthz = await requireModulePermission(organizationId, "labs");
    if (moduleAuthz.response) return moduleAuthz.response;

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";

    const favorites = await prisma.medicationFavorite.findMany({
      where: {
        organizationId,
        userId,
        ...(q.length >= 2
          ? { medicationName: { contains: q, mode: "insensitive" as const } }
          : {}),
      },
      select: {
        id: true,
        medicationName: true,
        defaultDosage: true,
        defaultFrequency: true,
        defaultDuration: true,
        usageCount: true,
        lastUsedAt: true,
      },
      orderBy: [{ usageCount: "desc" }, { lastUsedAt: "desc" }],
      take: 10,
    });

    return NextResponse.json(favorites);
  } catch (error) {
    logServerError("Failed to list prescription favorites", error);
    return NextResponse.json({ error: "Failed to list prescription favorites" }, { status: 500 });
  }
}