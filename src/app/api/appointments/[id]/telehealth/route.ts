import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import { isTelehealthAppointment } from "@/lib/telehealth";
import { z } from "zod";

const telehealthSchema = z.object({
  url: z.string().trim().url().max(2048).nullable(),
});

/**
 * PATCH /api/appointments/[id]/telehealth { url } — attach (or clear with
 * null) the staff's own meeting link to a telehealth visit. Only telehealth
 * appointments accept a link; only https URLs are stored.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
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

    const parsed = telehealthSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid meeting link" }, { status: 400 });
    }
    const appointment = await prisma.appointment.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!appointment) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    if (!isTelehealthAppointment(appointment.appointmentType)) {
      return NextResponse.json(
        { error: "Meeting links are for telehealth visits only" },
        { status: 400 },
      );
    }
    if (parsed.data.url && !parsed.data.url.startsWith("https://")) {
      return NextResponse.json({ error: "Meeting link must be HTTPS" }, { status: 400 });
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: { telehealthUrl: parsed.data.url },
    });
    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "UPDATE",
      entityType: "Appointment",
      entityId: id,
      beforeState: JSON.stringify({ telehealthUrl: appointment.telehealthUrl }),
      afterState: JSON.stringify({ telehealthUrl: updated.telehealthUrl }),
    });
    return NextResponse.json(updated);
  } catch (error) {
    logServerError("Error setting telehealth link", error);
    return NextResponse.json({ error: "Failed to set meeting link" }, { status: 500 });
  }
}
