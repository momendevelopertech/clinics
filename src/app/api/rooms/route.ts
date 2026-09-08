import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireOwner } from "@/lib/roles";
import { createAuditLog } from "@/lib/audit";
import { roomCreateSchema } from "@/lib/validations/location";

export async function GET() {
  try {
    const { organizationId } = await requireOrgContext();
    const authz = await requireAnyPermission(organizationId, [
      { action: "patients:read", resource: "patients" },
      { action: "appointments:read", resource: "appointments" },
    ]);
    if (authz.response) return authz.response;
    return NextResponse.json(await prisma.room.findMany({
      where: { organizationId },
      orderBy: [{ status: "asc" }, { name: "asc" }],
      include: { branch: { select: { id: true, name: true } } },
    }));
  } catch {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireOrgContext();
    const owner = await requireOwner({ json: true });
    if (!owner.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const parsed = roomCreateSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid room" }, { status: 400 });
    if (parsed.data.branchId) {
      const branch = await prisma.branch.findFirst({ where: { id: parsed.data.branchId, organizationId: context.organizationId } });
      if (!branch) return NextResponse.json({ error: "Branch not found" }, { status: 400 });
    }
    const room = await prisma.room.create({ data: { ...parsed.data, organizationId: context.organizationId } });
    await createAuditLog({
      organizationId: context.organizationId, userId: context.userId, action: "CREATE",
      entityType: "room", entityId: room.id, afterState: JSON.stringify(room),
    });
    return NextResponse.json(room, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
}
