import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import { getEquipmentCalibrationAlertStatus } from "@/lib/equipment-maintenance";
import { maintenanceCreateSchema } from "@/lib/validations/ops";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "inventory");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(orgId, [
      { action: "inventory:read", resource: "inventory" },
    ]);
    if (authz.response) return authz.response;

    const { id } = await params;
    const equipment = await prisma.equipment.findFirst({
      where: { id, organizationId: orgId },
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
  } catch (error) {
    logServerError("Error fetching equipment maintenance", error);
    return NextResponse.json({ error: "Failed to fetch maintenance log" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "inventory");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(orgId, [
      { action: "inventory:write", resource: "inventory" },
    ]);
    if (authz.response) return authz.response;
    const { userId } = authz;

    const { id } = await params;
    const equipment = await prisma.equipment.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!equipment) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
    }

    const parsed = maintenanceCreateSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { type, status, description, technician, dueAt, performedAt, notes, cost } = parsed.data;
    const performed = performedAt ? new Date(performedAt) : new Date();
    const due = dueAt ? new Date(dueAt) : null;

    const maintenance = await prisma.equipmentMaintenance.create({
      data: {
        organizationId: orgId,
        equipmentId: equipment.id,
        type,
        status,
        description,
        technician,
        dueAt: due,
        performedAt: performed,
        notes,
        cost: cost ?? null,
      },
    });

    const nextCalibrationAt = type === "calibration" && due ? due : equipment.nextCalibrationAt;
    const needsMaintenance =
      status === "overdue" || (nextCalibrationAt && nextCalibrationAt <= new Date());

    await prisma.equipment.update({
      where: { id: equipment.id },
      data: {
        lastCalibrationAt:
          type === "calibration" && performed ? performed : equipment.lastCalibrationAt,
        nextCalibrationAt,
        status: needsMaintenance ? "maintenance_required" : "active",
      },
    });

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "CREATE",
      entityType: "EquipmentMaintenance",
      entityId: maintenance.id,
      afterState: JSON.stringify(maintenance),
    });

    return NextResponse.json(maintenance, { status: 201 });
  } catch (error) {
    logServerError("Error saving equipment maintenance", error);
    return NextResponse.json({ error: "Failed to save maintenance log" }, { status: 500 });
  }
}