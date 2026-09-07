import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { logServerError } from "@/lib/safe-logger";
import {
  hasAppointmentConflict,
  isDoctorAvailable,
  nextWalkInToken,
} from "@/lib/appointments";
import { checkPlanLimit } from "@/lib/plans";
import { appointmentUpdateSchema } from "@/lib/validations/appointment";
import { isAppointmentTransitionAllowed } from "@/lib/appointments";

const ACTIVE_STATUSES = ["scheduled", "confirmed", "arrived", "in_progress"];

export async function GET() {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);

    const appointments = await prisma.appointment.findMany({
      where: { organizationId: orgId },
      include: {
        provider: true,
        patient: { select: { firstName: true, lastName: true } },
        room: true,
      },
      orderBy: { startTime: "asc" },
    });

    const mapped = appointments.map(
      (
        a: Prisma.AppointmentGetPayload<{
          include: {
            provider: true;
            patient: { select: { firstName: true; lastName: true } };
            room: true;
          };
        }>,
      ) => {
      const timeString = a.startTime.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const durationMs = a.endTime.getTime() - a.startTime.getTime();
      const durationMins = Math.round(durationMs / 60000);
      return {
        id: a.id,
        patientId: a.patientId,
        patient: a.patient
          ? `${a.patient.firstName} ${a.patient.lastName}`
          : null,
        providerId: a.providerId,
        provider: a.provider?.name ?? "Unknown Provider",
        roomId: a.roomId,
        room: a.room?.name ?? null,
        date: a.startTime.toISOString().split("T")[0],
        time: timeString,
        startTime: a.startTime.toISOString(),
        endTime: a.endTime.toISOString(),
        duration: `${durationMins} min`,
        type: a.appointmentType ?? a.notes ?? "Standard",
        status: a.status,
        tokenNumber: a.tokenNumber,
        isWalkIn: a.isWalkIn,
      };
    });

    return NextResponse.json(mapped);
  } catch (error) {
    logServerError("Error fetching appointments", error);
    return NextResponse.json(
      { error: "Failed to fetch appointments" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const authz = await requireAnyPermission(orgId, [
      { action: "appointments:write", resource: "appointments" },
    ]);
    if (authz.response) return authz.response;
    const { userId } = authz;

    const body = await request.json();
    const {
      patientId,
      providerId,
      roomId,
      date,
      time,
      startTime,
      endTime,
      status,
      type,
      idempotencyKey,
      isWalkIn,
    } = body;

    if (!patientId) {
      return NextResponse.json(
        { error: "Patient ID is required" },
        { status: 400 },
      );
    }

    if (idempotencyKey) {
      const existing = await prisma.appointment.findUnique({
        where: { idempotencyKey },
        include: { provider: true, patient: true },
      });
      if (existing) {
        return NextResponse.json(
          {
            id: existing.id,
            patientId: existing.patientId,
            provider: existing.provider?.name,
            date: existing.startTime.toISOString().split("T")[0],
            time: existing.startTime.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            duration: "30 min",
            type: existing.appointmentType ?? existing.notes ?? "Standard",
            status: existing.status,
            tokenNumber: existing.tokenNumber,
            isWalkIn: existing.isWalkIn,
          },
          { status: 200 },
        );
      }
    }

    // SaaS plan limiting: appointments are a metered resource.
    const limitCheck = await checkPlanLimit(orgId, "appointments");
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.reason }, { status: 403 });
    }

    let provider = providerId
      ? await prisma.user.findFirst({
          where: { id: providerId, organizationId: orgId },
        })
      : null;
    if (!provider) {
      provider = await prisma.user.findFirst({
        where: { organizationId: orgId },
      });
    }
    if (!provider) {
      return NextResponse.json(
        { error: "No provider available" },
        { status: 400 },
      );
    }

    let startDateTime: Date;
    let endDateTime: Date;
    if (startTime && endTime) {
      startDateTime = new Date(startTime);
      endDateTime = new Date(endTime);
    } else if (date && time) {
      startDateTime = new Date(`${date}T${time}`);
      endDateTime = new Date(startDateTime.getTime() + 30 * 60000);
    } else {
      return NextResponse.json(
        { error: "Either (date + time) or (startTime + endTime) required" },
        { status: 400 },
      );
    }

    if (
      !Number.isFinite(startDateTime.getTime()) ||
      !Number.isFinite(endDateTime.getTime()) ||
      endDateTime <= startDateTime
    ) {
      return NextResponse.json(
        { error: "Invalid appointment time range" },
        { status: 400 },
      );
    }

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, organizationId: orgId },
    });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }
    if (patient.status === "Archived") {
      return NextResponse.json({ error: "Archived patients cannot be scheduled" }, { status: 400 });
    }
    if (roomId) {
      const room = await prisma.room.findFirst({ where: { id: roomId, organizationId: orgId } });
      if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Doctor availability windows (regular schedule pattern).
    const availability = isDoctorAvailable(provider, startDateTime);
    if (!availability.available) {
      return NextResponse.json(
        { error: "Doctor is not available at this time." },
        { status: 400 },
      );
    }

    const isWalkInFlag = isWalkIn === true;
    const appointmentStatus = status ?? (isWalkInFlag ? "arrived" : "scheduled");

    // Transactional double-booking protection: the conflict check runs inside
    // the request transaction, backstopped by the partial unique index
    // `appointment_active_slot_unique` on (providerId, startTime).
    const newAppointment = await prisma.$transaction(async (tx) => {
      const conflict = await hasAppointmentConflict(tx, provider.id, startDateTime, endDateTime);
      if (conflict) {
        return { conflict: true as const };
      }

      const tokenNumber = isWalkInFlag
        ? await nextWalkInToken(tx, orgId, startDateTime)
        : null;

      const created = await tx.appointment.create({
        data: {
          organizationId: orgId,
          patientId,
          providerId: provider.id,
          roomId: roomId || null,
          startTime: startDateTime,
          endTime: endDateTime,
          status: appointmentStatus,
          appointmentType: type ?? null,
          notes: type ?? null,
          idempotencyKey: idempotencyKey ?? null,
          isWalkIn: isWalkInFlag,
          tokenNumber,
        },
        include: { provider: true },
      });

      return { conflict: false as const, created };
    });

    if (newAppointment.conflict) {
      return NextResponse.json(
        {
          error:
            "This time slot conflicts with an existing appointment for this doctor.",
        },
        { status: 409 },
      );
    }

    const appointment = newAppointment.created!;

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "CREATE",
      entityType: "Appointment",
      entityId: appointment.id,
      afterState: JSON.stringify({
        patientId: appointment.patientId,
        providerId: appointment.providerId,
        roomId: appointment.roomId,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        status: appointment.status,
        appointmentType: appointment.appointmentType,
        isWalkIn: appointment.isWalkIn,
        tokenNumber: appointment.tokenNumber,
      }),
    });

    return NextResponse.json(
      {
        id: appointment.id,
        patientId: appointment.patientId,
        provider: appointment.provider?.name ?? "Unknown Provider",
        date: appointment.startTime.toISOString().split("T")[0],
        time: appointment.startTime.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        duration: `${Math.round((appointment.endTime.getTime() - appointment.startTime.getTime()) / 60000)} min`,
        type:
          appointment.appointmentType ?? appointment.notes ?? "Standard",
        status: appointment.status,
        tokenNumber: appointment.tokenNumber,
        isWalkIn: appointment.isWalkIn,
      },
      { status: 201 },
    );
  } catch (error) {
    logServerError("Error creating appointment", error);
    return NextResponse.json(
      { error: "Failed to create appointment" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const authz = await requireAnyPermission(orgId, [
      { action: "appointments:write", resource: "appointments" },
    ]);
    if (authz.response) return authz.response;
    const { userId } = authz;

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Appointment ID required" },
        { status: 400 },
      );
    }

    const existing = await prisma.appointment.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 },
      );
    }

    const normalizedStatus = typeof updates.status === "string"
      ? (updates.status.toLowerCase().replace("in waiting room", "arrived") === "pending"
        ? "scheduled"
        : updates.status.toLowerCase().replace("in waiting room", "arrived"))
      : undefined;
    const parsedUpdates = appointmentUpdateSchema.safeParse({
      ...(normalizedStatus ? { status: normalizedStatus } : {}),
      ...(updates.roomId !== undefined ? { roomId: updates.roomId } : {}),
      ...(updates.isWalkIn !== undefined ? { isWalkIn: updates.isWalkIn } : {}),
    });
    if (!parsedUpdates.success) {
      return NextResponse.json({ error: "Invalid appointment update", details: parsedUpdates.error.flatten() }, { status: 400 });
    }
    if (normalizedStatus && !isAppointmentTransitionAllowed(existing.status, normalizedStatus)) {
      return NextResponse.json({ error: `Cannot change appointment from ${existing.status} to ${normalizedStatus}` }, { status: 409 });
    }

    const isCancellation = normalizedStatus === "cancelled" || normalizedStatus === "no_show";

    const updateData: Record<string, unknown> = {};
    if (normalizedStatus) updateData.status = normalizedStatus;
    if (updates.cancellationReason) updateData.cancellationReason = updates.cancellationReason;
    if (updates.roomId !== undefined) updateData.roomId = updates.roomId || null;
    if (updates.isWalkIn !== undefined) updateData.isWalkIn = updates.isWalkIn === true;

    let nextStart = existing.startTime;
    let nextEnd = existing.endTime;
    let rescheduling = false;
    if (updates.date || updates.time) {
      const dateStr =
        updates.date ?? existing.startTime.toISOString().split("T")[0];
      const timeStr =
        updates.time ?? existing.startTime.toTimeString().substring(0, 5);
      nextStart = new Date(`${dateStr}T${timeStr}`);
      nextEnd = new Date(nextStart.getTime() + 30 * 60000);
      updateData.startTime = nextStart;
      updateData.endTime = nextEnd;
      rescheduling = true;
    }

    if (rescheduling && !isCancellation) {
      const conflict = await prisma.$transaction(async (tx) => {
        return hasAppointmentConflict(tx, existing.providerId, nextStart, nextEnd, existing.id);
      });
      if (conflict) {
        return NextResponse.json(
          {
            error:
              "This time slot conflicts with an existing appointment for this doctor.",
          },
          { status: 409 },
        );
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (updates.isWalkIn === true && !existing.isWalkIn) {
        updateData.tokenNumber = await nextWalkInToken(tx, orgId, nextStart);
        updateData.status = normalizedStatus ?? "arrived";
      }
      return tx.appointment.update({
        where: { id },
        data: updateData,
        include: { provider: true },
      });
    });

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "UPDATE",
      entityType: "Appointment",
      entityId: updated.id,
      beforeState: JSON.stringify({
        startTime: existing.startTime,
        endTime: existing.endTime,
        status: existing.status,
      }),
      afterState: JSON.stringify({
        startTime: updated.startTime,
        endTime: updated.endTime,
        status: updated.status,
        cancellationReason: updated.cancellationReason,
      }),
    });

    return NextResponse.json({
      id: updated.id,
      patientId: updated.patientId,
      provider: updated.provider?.name,
      date: updated.startTime.toISOString().split("T")[0],
      time: updated.startTime.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      duration: "30 min",
      type: updated.appointmentType ?? updated.notes ?? "Standard",
      status: updated.status,
      tokenNumber: updated.tokenNumber,
      isWalkIn: updated.isWalkIn,
    });
  } catch (error) {
    logServerError("Error updating appointment", error);
    return NextResponse.json(
      { error: "Failed to update appointment" },
      { status: 500 },
    );
  }
}

export const ACTIVE_APPOINTMENT_STATUSES = ACTIVE_STATUSES;