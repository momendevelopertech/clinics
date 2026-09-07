import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/org";
import { requireOwner } from "@/lib/roles";
import { createAuditLog } from "@/lib/audit";
import { staffRoleAssignmentSchema } from "@/lib/validations";
import { logServerError } from "@/lib/safe-logger";

export async function GET() {
  try {
    const { organizationId } = await requireOrgContext();
    const roles = await prisma.role.findMany({
      where: { organizationId, name: { not: "Super Admin" } },
      select: { id: true, name: true, permissions: { select: { action: true, resource: true } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(roles);
  } catch (error) {
    logServerError("Error fetching staff roles", error);
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireOrgContext();
    const owner = await requireOwner({ json: true });
    if (!owner.ok) return owner.response ?? NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const parsed = staffRoleAssignmentSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid role assignment", details: parsed.error.flatten() }, { status: 400 });
    const { userId, roleId } = parsed.data;
    const [user, role] = await Promise.all([
      prisma.user.findFirst({ where: { id: userId, organizationId: context.organizationId }, select: { id: true } }),
      prisma.role.findFirst({ where: { id: roleId, organizationId: context.organizationId, name: { not: "Super Admin" } }, select: { id: true, name: true } }),
    ]);
    if (!user || !role) return NextResponse.json({ error: "Staff member or role not found" }, { status: 404 });
    const assignment = await prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId } },
      update: {},
      create: { userId, roleId },
      include: { role: { select: { id: true, name: true } } },
    });
    await createAuditLog({ organizationId: context.organizationId, userId: context.userId, action: "UPDATE", entityType: "staff_role", entityId: userId, afterState: JSON.stringify({ roleId, roleName: role.name }) });
    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    logServerError("Error assigning staff role", error);
    return NextResponse.json({ error: "Failed to assign staff role" }, { status: 500 });
  }
}
