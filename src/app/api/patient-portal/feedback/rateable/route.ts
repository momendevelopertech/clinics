import { NextResponse } from "next/server";
import { getPatientSessionFromRequest } from "@/lib/patient-auth";
import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/safe-logger";

/** Completed visits from the last 90 days the patient hasn't rated yet. */
export async function GET(request: Request) {
  try {
    const session = await getPatientSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const [visits, rated] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          patientId: session.patient.id,
          organizationId: session.patient.organizationId,
          status: "completed",
          startTime: { gte: since },
        },
        include: { provider: { select: { name: true } } },
        orderBy: { startTime: "desc" },
        take: 10,
      }),
      prisma.feedback.findMany({
        where: { patientId: session.patient.id, appointmentId: { not: null } },
        select: { appointmentId: true },
      }),
    ]);
    const ratedIds = new Set(rated.map((r) => r.appointmentId));
    return NextResponse.json(
      visits
        .filter((v) => !ratedIds.has(v.id))
        .map((v) => ({
          id: v.id,
          type: v.appointmentType ?? "General Checkup",
          provider: v.provider?.name ?? "",
          startTime: v.startTime.toISOString(),
        })),
    );
  } catch (error) {
    logServerError("Rateable visits failed", error);
    return NextResponse.json({ error: "Failed to load visits" }, { status: 500 });
  }
}
