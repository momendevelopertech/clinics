import { NextResponse } from "next/server";
import { getPatientSessionFromRequest } from "@/lib/patient-auth";
import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/safe-logger";
import { createAuditLog } from "@/lib/audit";
import { canPatientCancelAppointment } from "@/lib/appointments";
import { autoOfferFreedSlot } from "@/lib/waitlist";

/** Patient cancels their own upcoming appointment. */
export async function POST(
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
      select: { id: true, patientId: true, providerId: true, status: true, startTime: true, endTime: true },
    });
    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }
    if (!canPatientCancelAppointment(appointment, session.patient.id)) {
      return NextResponse.json(
        { error: "This appointment can no longer be cancelled" },
        { status: 400 },
      );
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: { status: "cancelled", cancellationReason: "patient-requested" },
      select: { id: true, status: true },
    });

    // Freed future slot goes to the waitlist (best-effort, never fails cancel).
    let waitlistOffers: Array<{ entryId: string; patientId: string; notified: boolean }> = [];
    if (appointment.providerId) {
      waitlistOffers = await autoOfferFreedSlot({
        organizationId: session.patient.organizationId,
        slot: {
          providerId: appointment.providerId,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
        },
        actor: { type: "patient", identifier: session.patient.id },
      });
    }

    await createAuditLog({
      organizationId: session.patient.organizationId,
      action: "UPDATE",
      entityType: "Appointment",
      entityId: id,
      actorType: "patient",
      actorIdentifier: session.patient.id,
      beforeState: JSON.stringify({ status: appointment.status }),
      afterState: JSON.stringify({ status: "cancelled", reason: "patient-requested" }),
    });

    return NextResponse.json({ ...updated, waitlistOffers });
  } catch (error) {
    logServerError("Patient cancel appointment error", error);
    return NextResponse.json({ error: "Cancellation failed" }, { status: 500 });
  }
}
