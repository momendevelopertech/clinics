import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/safe-logger";
import { getPatientSessionFromRequest } from "@/lib/patient-auth";
import {
  hasAppointmentConflict,
  isDoctorAvailable,
} from "@/lib/appointments";
import { parseOrgSettings } from "@/lib/org-settings";
import { createAuditLog } from "@/lib/audit";

const selfBookingSchema = z.object({
  providerId: z.string().min(1),
  startTime: z.string().datetime(),
  idempotencyKey: z.string().max(100).optional().nullable(),
  depositAmount: z.number().finite().positive().max(1000000).optional().nullable(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  try {
    const { orgSlug } = await params;
    const session = await getPatientSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Patient login required" }, { status: 401 });
    }

    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      select: { id: true, status: true, settingsJson: true },
    });
    if (!org || org.status !== "active") {
      return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
    }
    if (session.patient.organizationId !== org.id) {
      return NextResponse.json({ error: "Patient not registered at this clinic" }, { status: 403 });
    }
    if (session.patient.status === "Archived") {
      return NextResponse.json({ error: "Archived patients cannot book" }, { status: 400 });
    }

    const parsed = selfBookingSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid booking payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { providerId, startTime, idempotencyKey, depositAmount } = parsed.data;

    if (idempotencyKey) {
      const existing = await prisma.appointment.findUnique({
        where: { idempotencyKey },
        select: { id: true, startTime: true, status: true, providerId: true },
      });
      if (existing) {
        return NextResponse.json(existing, { status: 200 });
      }
    }

    const provider = await prisma.user.findFirst({
      where: { id: providerId, organizationId: org.id, active: true },
      select: {
        id: true,
        name: true,
        availabilityType: true,
        availableDays: true,
        availableFrom: true,
        availableTo: true,
      },
    });
    if (!provider) {
      return NextResponse.json({ error: "Provider not available" }, { status: 404 });
    }

    const durationMins = parseOrgSettings(org.settingsJson).appointmentDurationMins ?? 30;
    const start = new Date(startTime);
    const end = new Date(start.getTime() + durationMins * 60000);
    if (!Number.isFinite(start.getTime()) || end <= new Date()) {
      return NextResponse.json({ error: "Slot must be in the future" }, { status: 400 });
    }
    if (!isDoctorAvailable(provider, start).available) {
      return NextResponse.json({ error: "Provider is not available at this time" }, { status: 400 });
    }

    const created = await prisma.$transaction(async (tx) => {
      const conflict = await hasAppointmentConflict(tx, provider.id, start, end);
      if (conflict) return null;
      const appointment = await tx.appointment.create({
        data: {
          organizationId: org.id,
          patientId: session.patient.id,
          providerId: provider.id,
          startTime: start,
          endTime: end,
          status: "scheduled",
          idempotencyKey: idempotencyKey ?? null,
        },
        select: { id: true, startTime: true, endTime: true, status: true, providerId: true },
      });

      // Optional booking deposit: a draft invoice the patient settles via
      // the portal pay endpoint (same transaction — no orphan invoices).
      let depositDue: { invoiceId: string; amount: number } | null = null;
      if (depositAmount != null) {
        const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const invoice = await tx.invoice.create({
          data: {
            organizationId: org.id,
            patientId: session.patient.id,
            invoiceNumber,
            totalAmount: depositAmount.toFixed(2),
            amountPaid: "0",
            status: "sent",
            lineItems: {
              create: {
                description: "Booking deposit",
                quantity: 1,
                unitPrice: depositAmount.toFixed(2),
                amount: depositAmount.toFixed(2),
                discountAmount: "0",
                taxAmount: "0",
              },
            },
          },
          select: { id: true },
        });
        depositDue = { invoiceId: invoice.id, amount: depositAmount };
      }
      return { appointment, depositDue };
    });
    if (!created) {
      return NextResponse.json({ error: "This slot was just taken" }, { status: 409 });
    }

    await createAuditLog({
      organizationId: org.id,
      action: "CREATE",
      entityType: "Appointment",
      entityId: created.appointment.id,
      actorType: "patient",
      actorIdentifier: session.patient.id,
      afterState: JSON.stringify({
        providerId,
        startTime: created.appointment.startTime,
        selfBooked: true,
        depositDue: created.depositDue,
      }),
    });

    return NextResponse.json(
      { ...created.appointment, depositDue: created.depositDue },
      { status: 201 },
    );
  } catch (error) {
    logServerError("Patient self-booking failed", error);
    return NextResponse.json({ error: "Booking failed" }, { status: 500 });
  }
}
