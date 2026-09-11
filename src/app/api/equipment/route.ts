import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { getEquipmentCalibrationAlertStatus } from "@/lib/equipment-maintenance";

export async function GET() {
  try {
    const { organizationId } = await requireOrgContext();
    const moduleAuthz = await requireModulePermission(organizationId, "locations");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(organizationId, [
      { action: "appointments:write", resource: "appointments" },
      { action: "patients:write", resource: "patients" },
    ]);
    if (authz.response) return authz.response;

    const equipment = await prisma.equipment.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
      include: {
        maintenances: {
          orderBy: { dueAt: "desc" },
          take: 5,
        },
      },
    });

    return NextResponse.json(
      equipment.map((item) => ({
        ...item,
        calibrationAlert: getEquipmentCalibrationAlertStatus(item),
      })),
    );
  } catch {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireOrgContext();
    const parsed = await request.json().catch(() => ({}));
    const name = typeof parsed.name === "string" ? parsed.name.trim() : "";
    const type = typeof parsed.type === "string" ? parsed.type.trim() || null : null;

    if (!name) {
      return NextResponse.json({ error: "Equipment name is required" }, { status: 400 });
    }

    const equipment = await prisma.equipment.create({
      data: {
        organizationId: context.organizationId,
        name,
        type,
        status: parsed.status || "active",
        lastCalibrationAt: parsed.lastCalibrationAt ? new Date(parsed.lastCalibrationAt) : null,
        nextCalibrationAt: parsed.nextCalibrationAt ? new Date(parsed.nextCalibrationAt) : null,
      },
    });

    await createAuditLog({
      organizationId: context.organizationId,
      userId: context.userId,
      action: "CREATE",
      entityType: "Equipment",
      entityId: equipment.id,
      afterState: JSON.stringify(equipment),
    });

    return NextResponse.json(equipment, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
}
