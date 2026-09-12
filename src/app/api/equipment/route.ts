import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import { getEquipmentCalibrationAlertStatus } from "@/lib/equipment-maintenance";
import { equipmentCreateSchema } from "@/lib/validations/ops";

export async function GET() {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "inventory");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(orgId, [
      { action: "inventory:read", resource: "inventory" },
    ]);
    if (authz.response) return authz.response;

    const equipment = await prisma.equipment.findMany({
      where: { organizationId: orgId },
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
  } catch (error) {
    logServerError("Error fetching equipment", error);
    return NextResponse.json({ error: "Failed to fetch equipment" }, { status: 500 });
  }
}

export async function POST(request: Request) {
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

    const parsed = equipmentCreateSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { name, type, status, lastCalibrationAt, nextCalibrationAt } = parsed.data;
    const equipment = await prisma.equipment.create({
      data: {
        organizationId: orgId,
        name,
        type,
        status,
        lastCalibrationAt: lastCalibrationAt ? new Date(lastCalibrationAt) : null,
        nextCalibrationAt: nextCalibrationAt ? new Date(nextCalibrationAt) : null,
      },
    });

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "CREATE",
      entityType: "Equipment",
      entityId: equipment.id,
      afterState: JSON.stringify(equipment),
    });

    return NextResponse.json(equipment, { status: 201 });
  } catch (error) {
    logServerError("Error creating equipment", error);
    return NextResponse.json({ error: "Failed to save equipment" }, { status: 500 });
  }
}