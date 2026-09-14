import { NextResponse } from "next/server";
import { getPatientSessionFromRequest } from "@/lib/patient-auth";
import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/safe-logger";

/**
 * G10: Patient's visit history — completed encounters with provider,
 * diagnoses, follow-ups (suggested next visit), and linked counts.
 * Read-only, strictly own-patient scoped.
 */
export async function GET(request: Request) {
  try {
    const session = await getPatientSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const visits = await prisma.encounter.findMany({
      where: { patientId: session.patient.id, status: "completed" },
      include: {
        appointment: { include: { provider: { select: { name: true } } } },
        diagnoses: { select: { code: true, name: true } },
        followUps: { select: { dueDate: true, reason: true, status: true } },
        _count: { select: { prescriptions: true } },
      },
      orderBy: { startTime: "desc" },
      take: 10,
    });
    return NextResponse.json({
      visits: visits.map((v) => ({
        id: v.id,
        date: v.startTime.toISOString(),
        provider: v.appointment?.provider?.name ?? null,
        diagnoses: v.diagnoses,
        followUps: v.followUps.map((f) => ({
          dueDate: f.dueDate.toISOString(),
          reason: f.reason,
          status: f.status,
        })),
        prescriptionsCount: v._count.prescriptions,
      })),
    });
  } catch (error) {
    logServerError("Patient portal visits error", error);
    return NextResponse.json({ error: "Failed to fetch visits" }, { status: 500 });
  }
}
