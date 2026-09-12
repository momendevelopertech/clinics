import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";

export type ReceptionAction = "check-in" | "check-out" | "no-show";

type ReceptionTransition = {
  /** Current statuses the action accepts. */
  allowedFrom: string[];
  /** Status the appointment moves to. */
  to: string;
  /** Column stamped with `now`. */
  stampColumn: "checkedInAt" | "checkedOutAt" | null;
};

export const RECEPTION_TRANSITIONS: Record<ReceptionAction, ReceptionTransition> = {
  "check-in": { allowedFrom: ["scheduled", "confirmed"], to: "arrived", stampColumn: "checkedInAt" },
  "check-out": { allowedFrom: ["in_progress"], to: "completed", stampColumn: "checkedOutAt" },
  "no-show": { allowedFrom: ["scheduled", "confirmed", "arrived"], to: "no_show", stampColumn: null },
};

/**
 * Shared handler for the dedicated reception endpoints:
 * POST /api/appointments/[id]/check-in|check-out|no-show
 * Layers a named, guarded transition on top of the generic PATCH — the UI
 * never has to spell out status strings, and invalid flows get a clean 409.
 */
export async function handleReceptionAction(
  request: NextRequest | Request,
  { params }: { params: Promise<{ id: string }> },
  action: ReceptionAction,
) {
  try {
    const { id } = await params;
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "appointments");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(orgId, [
      { action: "appointments:write", resource: "appointments" },
    ]);
    if (authz.response) return authz.response;
    const { userId } = authz;

    const transition = RECEPTION_TRANSITIONS[action];
    const existing = await prisma.appointment.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }
    if (!transition.allowedFrom.includes(existing.status)) {
      return NextResponse.json(
        { error: `Cannot ${action} an appointment in status ${existing.status}` },
        { status: 409 },
      );
    }

    const now = new Date();
    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        status: transition.to,
        ...(transition.stampColumn
          ? { [transition.stampColumn]: now }
          : {}),
      },
    });

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "UPDATE",
      entityType: "Appointment",
      entityId: id,
      beforeState: JSON.stringify({ status: existing.status }),
      afterState: JSON.stringify({
        status: updated.status,
        action,
        at: now.toISOString(),
      }),
    });

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      action,
      checkedInAt: updated.checkedInAt,
      checkedOutAt: updated.checkedOutAt,
    });
  } catch (error) {
    logServerError(`Appointment ${action} failed`, error);
    return NextResponse.json({ error: `Failed to ${action} appointment` }, { status: 500 });
  }
}