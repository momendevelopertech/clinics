import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import {
  renderPrescriptionMessage,
  sendSMS,
  sendWhatsApp,
} from "@/lib/communications";
import { z } from "zod";

const sendSchema = z.object({
  channel: z.enum(["sms", "whatsapp"]).default("whatsapp"),
});

/**
 * POST /api/prescriptions/[id]/send — sends the prescription summary to the
 * patient's phone over SMS or WhatsApp, and records a Communication row so
 * delivery is trackable in the UI.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "labs");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(orgId, [
      { action: "encounters:write", resource: "encounters" },
      { action: "patients:write", resource: "patients" },
    ]);
    if (authz.response) return authz.response;
    const { userId } = authz;

    const parsed = sendSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
    }

    const prescription = await prisma.prescription.findFirst({
      where: { id, organizationId: orgId },
      include: {
        items: true,
        patient: { select: { firstName: true, lastName: true, phone: true } },
        organization: { select: { name: true } },
      },
    });
    if (!prescription) {
      return NextResponse.json({ error: "Prescription not found" }, { status: 404 });
    }
    const phone = prescription.patient.phone;
    if (!phone || phone.trim() === "") {
      return NextResponse.json(
        { error: "Patient has no phone number on file" },
        { status: 400 },
      );
    }

    const lines = [
      {
        medicationName: prescription.medicationName,
        dosage: prescription.dosage,
        frequency: prescription.frequency,
        duration: prescription.duration,
        instructions: prescription.instructions,
      },
      ...prescription.items.map((item: Prisma.PrescriptionItemGetPayload<Record<string, never>>) => ({
        medicationName: item.medicationName,
        dosage: item.dosage,
        frequency: item.frequency,
        duration: item.duration,
        instructions: item.instructions,
      })),
    ];
    const rendered = renderPrescriptionMessage(
      `${prescription.patient.firstName} ${prescription.patient.lastName}`.trim() || "Patient",
      prescription.organization.name,
      lines,
    );
    const content = parsed.data.channel === "sms" ? rendered.sms : rendered.whatsapp;

    const result =
      parsed.data.channel === "sms"
        ? await sendSMS(phone, content)
        : await sendWhatsApp(phone, content);

    const status = result?.success === true ? "sent" : "failed";
    const communication = await prisma.communication.create({
      data: {
        organizationId: orgId,
        patientId: prescription.patientId,
        channel: parsed.data.channel,
        type: "notification",
        content,
        status,
        sentAt: status === "sent" ? new Date() : null,
      },
    });

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "UPDATE",
      entityType: "Prescription",
      entityId: id,
      afterState: JSON.stringify({
        sent: status === "sent",
        channel: parsed.data.channel,
        communicationId: communication.id,
      }),
    });

    return NextResponse.json({ ok: true, status, communicationId: communication.id });
  } catch (error) {
    logServerError("Error sending prescription", error);
    return NextResponse.json({ error: "Failed to send prescription" }, { status: 500 });
  }
}