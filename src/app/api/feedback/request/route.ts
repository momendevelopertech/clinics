import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import { sendEmail, sendSMS, sendWhatsApp } from "@/lib/communications";
import { z } from "zod";

const requestSchema = z.object({ appointmentId: z.string().min(1).max(100) });

/**
 * POST /api/feedback/request { appointmentId } — staff asks a patient to
 * rate a completed visit. Sends a survey message over the patient's best
 * available channel (WhatsApp → SMS → email) and records it as a
 * Communication so delivery status stays observable. One request per visit
 * (dedupe tag); already-rated visits are rejected.
 */
export async function POST(request: Request) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "communications");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(orgId, [
      { action: "appointments:write", resource: "appointments" },
    ]);
    if (authz.response) return authz.response;
    const { userId } = authz;

    const parsed = requestSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    const appointment = await prisma.appointment.findFirst({
      where: { id: parsed.data.appointmentId, organizationId: orgId, status: "completed" },
      include: { patient: true },
    });
    if (!appointment) {
      return NextResponse.json({ error: "Completed appointment not found" }, { status: 404 });
    }
    const rated = await prisma.feedback.findFirst({
      where: { appointmentId: appointment.id },
      select: { id: true },
    });
    if (rated) {
      return NextResponse.json({ error: "Visit already rated", alreadyRated: true }, { status: 200 });
    }
    const tag = `[APPOINTMENT_ID: ${appointment.id}][TYPE: rating-request]`;
    const dup = await prisma.communication.findFirst({
      where: { patientId: appointment.patientId, type: "survey", content: { contains: tag } },
      select: { id: true },
    });
    if (dup) {
      return NextResponse.json({ error: "Request already sent", alreadySent: true }, { status: 200 });
    }

    const body =
      `How was your visit on ${appointment.startTime.toISOString().split("T")[0]}? ` +
      `Rate us 1–5 in your patient portal to help us improve.`;
    let status: "sent" | "failed" = "sent";
    try {
      if (appointment.patient.phone) {
        await sendWhatsApp(appointment.patient.phone, body).catch(() =>
          sendSMS(appointment.patient.phone!, body),
        );
      } else if (appointment.patient.email) {
        await sendEmail(appointment.patient.email, "Rate your visit", body);
      } else {
        throw new Error("No recipient address");
      }
    } catch (error) {
      logServerError("Rating request send failed", error);
      status = "failed";
    }
    const record = await prisma.communication.create({
      data: {
        organizationId: orgId,
        patientId: appointment.patientId,
        channel: appointment.patient.phone ? "whatsapp" : "email",
        type: "survey",
        status,
        content: `${tag}\n\n${body}`,
        sentAt: status === "sent" ? new Date() : null,
      },
    });
    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "CREATE",
      entityType: "Communication",
      entityId: record.id,
      afterState: JSON.stringify({ appointmentId: appointment.id, type: "survey", status }),
    });
    return NextResponse.json({ ok: true, status }, { status: 201 });
  } catch (error) {
    logServerError("Rating request failed", error);
    return NextResponse.json({ error: "Failed to send request" }, { status: 500 });
  }
}
