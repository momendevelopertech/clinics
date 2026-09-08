import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireOwner } from "@/lib/roles";
import { createAuditLog } from "@/lib/audit";
import { branchCreateSchema } from "@/lib/validations/location";

export async function GET() {
  try {
    const { organizationId } = await requireOrgContext();
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
    const owner = await requireOwner({ json: true });
    if (!owner.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const parsed = branchCreateSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid branch" }, { status: 400 });
    const branch = await prisma.branch.create({
      data: { ...parsed.data, organizationId: context.organizationId },
    });
    await createAuditLog({
      organizationId: context.organizationId,
      userId: context.userId,
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
