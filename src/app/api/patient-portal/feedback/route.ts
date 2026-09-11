import { NextResponse } from "next/server";
import { getPatientSessionFromRequest } from "@/lib/patient-auth";
import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/safe-logger";
import { feedbackCreateSchema } from "@/lib/validations";

/** Patient's own feedback list (used to hide already-rated visits). */
export async function GET(request: Request) {
  try {
    const session = await getPatientSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const rows = await prisma.feedback.findMany({
      where: {
        patientId: session.patient.id,
        organizationId: session.patient.organizationId,
      },
      select: { id: true, appointmentId: true, rating: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(rows);
  } catch (error) {
    logServerError("Patient feedback list failed", error);
    return NextResponse.json({ error: "Failed to load feedback" }, { status: 500 });
  }
}

/** Patient rates one of their own COMPLETED visits (one feedback per visit). */
export async function POST(request: Request) {
  try {
    const session = await getPatientSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = feedbackCreateSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    let appointmentId: string | null = null;
    let providerId: string | null = null;
    if (parsed.data.appointmentId) {
      const appointment = await prisma.appointment.findFirst({
        where: {
          id: parsed.data.appointmentId,
          organizationId: session.patient.organizationId,
          patientId: session.patient.id,
          status: "completed",
        },
        select: { id: true, providerId: true },
      });
      if (!appointment) {
        return NextResponse.json(
          { error: "Only your completed visits can be rated" },
          { status: 400 },
        );
      }
      const dup = await prisma.feedback.findFirst({
        where: { appointmentId: appointment.id, patientId: session.patient.id },
        select: { id: true },
      });
      if (dup) {
        return NextResponse.json({ error: "Visit already rated", alreadyRated: true }, { status: 200 });
      }
      appointmentId = appointment.id;
      providerId = appointment.providerId;
    }

    const created = await prisma.feedback.create({
      data: {
        organizationId: session.patient.organizationId,
        patientId: session.patient.id,
        appointmentId,
        providerId,
        rating: parsed.data.rating,
        comment: parsed.data.comment || null,
        source: "portal",
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    logServerError("Patient feedback submit failed", error);
    return NextResponse.json({ error: "Failed to submit rating" }, { status: 500 });
  }
}
