import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/org";
import { requireOwner } from "@/lib/roles";
import { createAuditLog } from "@/lib/audit";
import { roomUpdateSchema } from "@/lib/validations/location";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const context = await requireOrgContext();
    const owner = await requireOwner({ json: true });
    if (!owner.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await params;
    const existing = await prisma.room.findFirst({ where: { id, organizationId: context.organizationId } });
    if (!existing) return NextResponse.json({ error: "Room not found" }, { status: 404 });
    const parsed = roomUpdateSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid room" }, { status: 400 });
    if (parsed.data.branchId) {
      const branch = await prisma.branch.findFirst({ where: { id: parsed.data.branchId, organizationId: context.organizationId } });
      if (!branch) return NextResponse.json({ error: "Branch not found" }, { status: 400 });
    }
    const room = await prisma.room.update({ where: { id }, data: parsed.data });
    await createAuditLog({
      organizationId: context.organizationId, userId: context.userId, action: "UPDATE",
      entityType: "room", entityId: id,
      beforeState: JSON.stringify(existing), afterState: JSON.stringify(room),
    });
    return NextResponse.json(room);
  } catch {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
}
