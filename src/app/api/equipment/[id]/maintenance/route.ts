import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { getEquipmentCalibrationAlertStatus } from "@/lib/equipment-maintenance";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { organizationId } = await requireOrgContext();
    const { id } = await params;
    const moduleAuthz = await requireModulePermission(organizationId, "locations");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(organizationId, [
      { action: "appointments:write", resource: "appointments" },
      { action: "patients:write", resource: "patients" },
    ]);
    if (authz.response) return authz.response;

    const equipment = await prisma.equipment.findFirst({
      where: { id, organizationId },
      include: { maintenances: { orderBy: { dueAt: "desc" } } },
    });

    if (!equipment) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
    }

    return NextResponse.json({
      equipment: {
        ...equipment,
        calibrationAlert: getEquipmentCalibrationAlertStatus(equipment),
      },
      maintenances: equipment.maintenances,
    });
  } catch {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const context = await requireOrgContext();
    const { id } = await params;
    const equipment = await prisma.equipment.findFirst({
      where: { id, organizationId: context.organizationId },
    });

    if (!equipment) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
    }

    const parsed = await request.json().catch(() => ({}));
    const type = typeof parsed.type === "string" ? parsed.type : "preventive";
    const status = typeof parsed.status === "string" ? parsed.status : "completed";
    const description = typeof parsed.description === "string" ? parsed.description : null;
    const technician = typeof parsed.technician === "string" ? parsed.technician : null;
    const dueAt = parsed.dueAt ? new Date(parsed.dueAt) : null;
    const performedAt = parsed.performedAt ? new Date(parsed.performedAt) : new Date();
    const notes = typeof parsed.notes === "string" ? parsed.notes : null;

    const maintenance = await prisma.equipmentMaintenance.create({
      data: {
        organizationId: context.organizationId,
        equipmentId: equipment.id,
        type,
        status,
        description,
        technician,
        dueAt,
        performedAt,
        notes,
        cost: parsed.cost ? Number(parsed.cost) : null,
      },
    });

    const nextCalibrationAt =
      type === "calibration" && dueAt ? dueAt : equipment.nextCalibrationAt;

    await prisma.equipment.update({
      where: { id: equipment.id },
      data: {
        lastCalibrationAt: type === "calibration" && performedAt ? performedAt : equipment.lastCalibrationAt,
        nextCalibrationAt,
        status:
          status === "overdue" || (nextCalibrationAt && nextCalibrationAt <= new Date())
            ? "maintenance_required"
            : "active",
      },
    });

    await createAuditLog({
      organizationId: context.organizationId,
      userId: context.userId,
      action: "CREATE",
      entityType: "EquipmentMaintenance",
      entityId: maintenance.id,
      afterState: JSON.stringify(maintenance),
    });

    return NextResponse.json(maintenance, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
}
