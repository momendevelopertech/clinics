import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import { waitlistBookSchema } from "@/lib/validations/ops";
import { hasAppointmentConflict } from "@/lib/appointments";

/**
 * POST /api/waitlist/[id]/book { providerId, startTime, endTime?, roomId? }
 * Books a waiting/offered entry into a real appointment: conflict-checked
 * and created in ONE transaction that also flips the entry to "booked".
 * Past slots are rejected.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const orgId = await getOrgId();
    const moduleAuthz = await requireModulePermission(orgId, "waitlist");
    if (moduleAuthz.response) return moduleAuthz.response;
    assertOrgScope(orgId);
    const authz = await requireAnyPermission(orgId, [
      { action: "appointments:write", resource: "appointments" },
    ]);
    if (authz.response) return authz.response;
    const { userId } = authz;

    const parsed = waitlistBookSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid booking payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const start = new Date(parsed.data.startTime);
    const end = parsed.data.endTime
      ? new Date(parsed.data.endTime)
      : new Date(start.getTime() + 30 * 60 * 1000);
    if (start.getTime() < Date.now() - 60 * 1000) {
      return NextResponse.json({ error: "Cannot book a past slot" }, { status: 400 });
    }
    if (end <= start) {
      return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
    }

    const entry = await prisma.waitlistEntry.findFirst({
      where: { id, organizationId: orgId },
      include: { patient: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (!entry) return NextResponse.json({ error: "Waitlist entry not found" }, { status: 404 });
    if (!["waiting", "offered"].includes(entry.status)) {
      return NextResponse.json(
        { error: `Entry is ${entry.status} and cannot be booked` },
        { status: 409 },
      );
    }
    const provider = await prisma.user.findFirst({
      where: { id: parsed.data.providerId, organizationId: orgId, active: true },
      select: { id: true },
    });
    if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });

    const booked = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (await hasAppointmentConflict(tx, provider.id, start, end)) {
        throw new Error("SLOT_CONFLICT");
      }
      const appointment = await tx.appointment.create({
        data: {
          organizationId: orgId,
          patientId: entry.patientId,
          providerId: provider.id,
          roomId: parsed.data.roomId ?? null,
          startTime: start,
          endTime: end,
          status: "scheduled",
        },
      });
      const updatedEntry = await tx.waitlistEntry.update({
        where: { id },
        data: { status: "booked" },
      });
      return { appointment, updatedEntry };
    }).catch((txError: unknown) => {
      if (txError instanceof Error && txError.message === "SLOT_CONFLICT") return null;
      throw txError;
    });
    if (!booked) {
      return NextResponse.json({ error: "Slot conflicts with an existing booking" }, { status: 409 });
    }

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "CREATE",
      entityType: "Appointment",
      entityId: booked.appointment.id,
      afterState: JSON.stringify({ waitlistEntryId: id, startTime: start.toISOString() }),
    });
    return NextResponse.json(
      {
        appointmentId: booked.appointment.id,
        waitlistId: id,
        status: booked.updatedEntry.status,
        patientName: `${entry.patient.firstName} ${entry.patient.lastName}`,
      },
      { status: 201 },
    );
  } catch (error) {
    logServerError("Error booking from waitlist", error);
    return NextResponse.json({ error: "Failed to book appointment" }, { status: 500 });
  }
}
