import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { branchCreateSchema } from "@/lib/validations/location";

export async function GET() {
  try {
    const { organizationId } = await requireOrgContext();
    const moduleAuthz = await requireModulePermission(organizationId, "locations");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(organizationId, [
      { action: "appointments:write", resource: "appointments" },
    ]);
    if (authz.response) return authz.response;

    const branches = await prisma.branch.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
      include: { _count: { select: { rooms: true } } },
    });
    return NextResponse.json(branches);
  } catch {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireOrgContext();
    const moduleAuthz = await requireModulePermission(
      context.organizationId,
      "locations",
    );
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(context.organizationId, [
      { action: "appointments:write", resource: "appointments" },
    ]);
    if (authz.response) return authz.response;
    const parsed = branchCreateSchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json(
        { error: "Branch name is required" },
        { status: 400 },
      );
    const existing = await prisma.branch.findFirst({
      where: {
        organizationId: context.organizationId,
        name: { equals: parsed.data.name, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (existing)
      return NextResponse.json(
        { error: "A branch with this name already exists" },
        { status: 409 },
      );
    const branch = await prisma.branch.create({
      data: { ...parsed.data, organizationId: context.organizationId },
    });
    await createAuditLog({
      organizationId: context.organizationId,
      userId: authz.userId,
      action: "CREATE",
      entityType: "branch",
      entityId: branch.id,
      afterState: JSON.stringify(branch),
    });
    return NextResponse.json(branch, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
}
