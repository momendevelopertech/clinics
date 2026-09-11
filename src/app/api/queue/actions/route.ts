import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import { queueActionSchema } from "@/lib/validations/ops";
import { isAppointmentTransitionAllowed } from "@/lib/appointments";

const ACTION_TARGET: Record<string, string> = {
  "call-next": "in_progress",
  complete: "completed",
  "no-show": "no_show",
};

const ACTION_SOURCE: Record<string, string[]> = {
  "call-next": ["arrived"],
  complete: ["in_progress"],
  "no-show": ["scheduled", "confirmed", "arrived"],
};

/**
 * POST /api/queue/actions { action: call-next | complete | no-show,
 *   appointmentId? } — reception queue operations on today's queue.
 * Without appointmentId, acts on the head of the relevant line (earliest
 * arrived for call-next, earliest in_progress for complete).
 */
export async function POST(request: Request) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "queue");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(orgId, [
      { action: "appointments:write", resource: "appointments" },
    ]);
    if (authz.response) return authz.response;
    const { userId } = authz;

    const parsed = queueActionSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid queue action", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { action, appointmentId } = parsed.data;
    const target = ACTION_TARGET[action];

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const appointment = appointmentId
      ? await prisma.appointment.findFirst({
          where: { id: appointmentId, organizationId: orgId },
        })
      : await prisma.appointment.findFirst({
          where: {
            organizationId: orgId,
            startTime: { gte: start, lt: end },
            status: { in: ACTION_SOURCE[action] },
          },
          orderBy: [{ startTime: "asc" }, { tokenNumber: "asc" }],
        });
    if (!appointment) {
      return NextResponse.json({ error: "No matching appointment in queue" }, { status: 404 });
    }
    if (!isAppointmentTransitionAllowed(appointment.status, target)) {
      return NextResponse.json(
        { error: `Cannot move appointment from ${appointment.status} to ${target}` },
        { status: 409 },
      );
    }

    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: target },
    });
    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "UPDATE",
      entityType: "Appointment",
      entityId: appointment.id,
      beforeState: JSON.stringify({ status: appointment.status }),
      afterState: JSON.stringify({ status: target, queueAction: action }),
    });
    return NextResponse.json(updated);
  } catch (error) {
    logServerError("Queue action failed", error);
    return NextResponse.json({ error: "Queue action failed" }, { status: 500 });
  }
}
