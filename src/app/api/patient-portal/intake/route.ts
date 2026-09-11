import { NextResponse } from "next/server";
import { getPatientSessionFromRequest } from "@/lib/patient-auth";
import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/safe-logger";
import { intakeResponseSchema } from "@/lib/validations";
import { missingRequiredAnswers } from "@/lib/intake";

/** Patient's submitted intake forms (used to hide completed ones). */
export async function GET(request: Request) {
  try {
    const session = await getPatientSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const rows = await prisma.intakeResponse.findMany({
      where: { patientId: session.patient.id, organizationId: session.patient.organizationId },
      select: { id: true, formId: true, appointmentId: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(rows);
  } catch (error) {
    logServerError("Patient intake list failed", error);
    return NextResponse.json({ error: "Failed to load forms" }, { status: 500 });
  }
}

/** Patient submits an active form; required answers enforced server-side. */
export async function POST(request: Request) {
  try {
    const session = await getPatientSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = intakeResponseSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const form = await prisma.intakeForm.findFirst({
      where: {
        id: parsed.data.formId,
        organizationId: session.patient.organizationId,
        active: true,
      },
      include: { fields: true },
    });
    if (!form) return NextResponse.json({ error: "Form not available" }, { status: 404 });

    const missing = missingRequiredAnswers(form.fields, parsed.data.answers);
    if (missing.length > 0) {
      return NextResponse.json({ error: "Missing required answers", missing }, { status: 400 });
    }
    if (parsed.data.appointmentId) {
      const appointment = await prisma.appointment.findFirst({
        where: {
          id: parsed.data.appointmentId,
          organizationId: session.patient.organizationId,
          patientId: session.patient.id,
        },
        select: { id: true },
      });
      if (!appointment) {
        return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
      }
    }

    const created = await prisma.intakeResponse.create({
      data: {
        organizationId: session.patient.organizationId,
        formId: form.id,
        patientId: session.patient.id,
        appointmentId: parsed.data.appointmentId ?? null,
        answers: JSON.stringify(parsed.data.answers),
      },
    });
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (error) {
    logServerError("Patient intake submit failed", error);
    return NextResponse.json({ error: "Failed to submit form" }, { status: 500 });
  }
}
