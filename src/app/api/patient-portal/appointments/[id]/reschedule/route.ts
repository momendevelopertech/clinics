import { NextResponse } from "next/server";
import { z } from "zod";
import { getPatientSessionFromRequest } from "@/lib/patient-auth";
import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/safe-logger";
import { createAuditLog } from "@/lib/audit";
import {
  canPatientRescheduleAppointment,
  hasAppointmentConflict,
  isDoctorAvailable,
} from "@/lib/appointments";
import { autoOfferFreedSlot } from "@/lib/waitlist";
import { parseOrgSettings } from "@/lib/org-settings";

const rescheduleSchema = z.object({
  startTime: z.string().datetime(),
});

/** Patient moves their own upcoming appointment to a free future slot. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getPatientSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const appointment = await prisma.appointment.findFirst({
      where: { id, organizationId: session.patient.organizationId },
      select: {
        id: true,
        patientId: true,
        providerId: true,
        status: true,
        startTime: true,
        endTime: true,
      },
    });
    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }
    if (!canPatientRescheduleAppointment(appointment, session.patient.id)) {
      return NextResponse.json(
        { error: "This appointment can no longer be rescheduled" },
        { status: 400 },
      );
    }

    const parsed = rescheduleSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid time" }, { status: 400 });
    }

    const provider = await prisma.user.findFirst({
      where: { id: appointment.providerId, organizationId: session.patient.organizationId },
      select: { id: true, availabilityType: true, availableDays: true, availableFrom: true, availableTo: true },
    });
    const org = await prisma.organization.findUnique({
      where: { id: session.patient.organizationId },
      select: { settingsJson: true },
    });
    const durationMins = parseOrgSettings(org?.settingsJson).appointmentDurationMins ?? 30;
    const start = new Date(parsed.data.startTime);
    const end = new Date(start.getTime() + durationMins * 60000);
    if (!Number.isFinite(start.getTime()) || end <= new Date()) {
      return NextResponse.json({ error: "Slot must be in the future" }, { status: 400 });
    }
    if (provider && !isDoctorAvailable(provider, start).available) {
      return NextResponse.json({ error: "Provider is not available at this time" }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const conflict = await hasAppointmentConflict(
        tx,
        appointment.providerId,
        start,
        end,
        appointment.id,
      );
      if (conflict) return null;
      return tx.appointment.update({
        where: { id },
        data: { startTime: start, endTime: end },
        select: { id: true, startTime: true, endTime: true, status: true },
      });
    });
    if (!updated) {
      return NextResponse.json({ error: "This slot was just taken" }, { status: 409 });
    }

    // The old slot is freed — offer it to the waitlist (best-effort).
    await autoOfferFreedSlot({
      organizationId: session.patient.organizationId,
      slot: {
        providerId: appointment.providerId,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
      },
      actor: { type: "patient", identifier: session.patient.id },
    });

    await createAuditLog({
      organizationId: session.patient.organizationId,
      action: "UPDATE",
      entityType: "Appointment",
      entityId: id,
      actorType: "patient",
      actorIdentifier: session.patient.id,
      beforeState: JSON.stringify({ startTime: appointment.startTime }),
      afterState: JSON.stringify({ startTime: updated.startTime, selfRescheduled: true }),
    });

    return NextResponse.json(updated);
  } catch (error) {
    logServerError("Patient reschedule appointment error", error);
    return NextResponse.json({ error: "Reschedule failed" }, { status: 500 });
  }
}
