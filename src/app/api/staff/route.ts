import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/org";
import { requireOwner } from "@/lib/roles";
import { createAuditLog } from "@/lib/audit";
import { staffProfileUpdateSchema } from "@/lib/validations/staff";
import { logServerError } from "@/lib/safe-logger";

export async function GET() {
  try {
    const { organizationId } = await requireOrgContext();
    const staff = await prisma.user.findMany({
      where: { organizationId, active: true },
      orderBy: { name: "asc" },
      select: {
        id: true, name: true, email: true, role: true, specialty: true,
        licenseNumber: true, workingHours: true, availabilityType: true,
        availableDays: true, availableFrom: true, availableTo: true,
        branch: { select: { id: true, name: true } },
        room: { select: { id: true, name: true, number: true } },
        userRoles: { select: { role: { select: { id: true, name: true } } } },
      },
    });
    return NextResponse.json(staff);
  } catch (error) {
    logServerError("Error fetching staff", error);
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await requireOrgContext();
    const owner = await requireOwner({ json: true });
    if (!owner.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const body = await request.json();
    const userId = typeof body.userId === "string" ? body.userId : "";
    const parsed = staffProfileUpdateSchema.safeParse(body.profile);
    if (!userId || !parsed.success) return NextResponse.json({ error: "Invalid staff profile" }, { status: 400 });

    const existing = await prisma.user.findFirst({ where: { id: userId, organizationId: context.organizationId } });
    if (!existing) return NextResponse.json({ error: "Staff member not found" }, { status: 404 });

    const { branchId, roomId } = parsed.data;
    if (branchId && !(await prisma.branch.findFirst({ where: { id: branchId, organizationId: context.organizationId } }))) {
      return NextResponse.json({ error: "Branch not found" }, { status: 400 });
    }
    if (roomId && !(await prisma.room.findFirst({ where: { id: roomId, organizationId: context.organizationId } }))) {
      return NextResponse.json({ error: "Room not found" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: parsed.data,
      select: {
        id: true, name: true, email: true, role: true, specialty: true,
        licenseNumber: true, workingHours: true, availabilityType: true,
        availableDays: true, availableFrom: true, availableTo: true,
        branch: { select: { id: true, name: true } },
        room: { select: { id: true, name: true, number: true } },
      },
    });
    await createAuditLog({
      organizationId: context.organizationId, userId: context.userId,
      action: "UPDATE", entityType: "staff_operational_profile", entityId: userId,
      beforeState: JSON.stringify(existing), afterState: JSON.stringify(updated),
    });
    return NextResponse.json(updated);
  } catch (error) {
    logServerError("Error updating staff profile", error);
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
}
