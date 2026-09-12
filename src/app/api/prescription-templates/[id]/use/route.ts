import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/org";
import { requireModulePermission } from "@/lib/permissions";
import { logServerError } from "@/lib/safe-logger";

/**
 * POST /api/prescription-templates/[id]/use — bumps usageCount for a
 * template the doctor just applied (fire-and-forget from the client; this
 * endpoint is cheap and never blocks the prescription flow).
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const context = await requireOrgContext();
    const orgId = context.organizationId;

    const moduleAuthz = await requireModulePermission(orgId, "labs");
    if (moduleAuthz.response) return moduleAuthz.response;

    const result = await prisma.prescriptionTemplate.updateMany({
      where: { id, organizationId: orgId },
      data: { usageCount: { increment: 1 } },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    logServerError("Failed to record template usage", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}