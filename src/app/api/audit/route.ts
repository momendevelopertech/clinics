import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { logServerError } from "@/lib/safe-logger";
import { auditListQuerySchema } from "@/lib/validations/ops";

export async function GET(request: Request) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "audit");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(orgId, [
      { action: "patients:read", resource: "patients" },
      { action: "encounters:read", resource: "encounters" },
      { action: "billing:read", resource: "billing" },
    ]);
    if (authz.response) return authz.response;

    const { searchParams } = new URL(request.url);
    const parsed = auditListQuerySchema.safeParse({
      entityType: searchParams.get("entityType"),
      entityId: searchParams.get("entityId"),
      limit: searchParams.get("limit") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid audit query", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const entityType = parsed.data.entityType || undefined;
    const entityId = parsed.data.entityId || undefined;
    const limit = parsed.data.limit ?? 50;

    const logs = await prisma.auditLog.findMany({
      where: {
        organizationId: orgId,
        ...(entityType ? { entityType } : {}),
        ...(entityId ? { entityId } : {}),
      },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json(logs);
  } catch (error) {
    logServerError("Error fetching audit logs", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
