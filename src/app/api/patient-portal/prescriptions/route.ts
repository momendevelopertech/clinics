import { NextResponse } from "next/server";
import { getPatientSessionFromRequest } from "@/lib/patient-auth";
import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/safe-logger";

/**
 * G10: Patient's own prescriptions (read-only).
 * Scoped strictly to the session patient — no cross-patient access.
 */
export async function GET(request: Request) {
  try {
    const session = await getPatientSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const prescriptions = await prisma.prescription.findMany({
      where: { patientId: session.patient.id },
      include: {
        prescriber: { select: { name: true } },
        items: {
          select: { medicationName: true, dosage: true, frequency: true, duration: true, instructions: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return NextResponse.json({
      prescriptions: prescriptions.map((rx) => ({
        id: rx.id,
        medicationName: rx.medicationName,
        dosage: rx.dosage,
        frequency: rx.frequency,
        duration: rx.duration,
        instructions: rx.instructions,
        status: rx.status,
        prescriber: rx.prescriber?.name ?? null,
        createdAt: rx.createdAt.toISOString(),
        items: rx.items,
      })),
    });
  } catch (error) {
    logServerError("Patient portal prescriptions error", error);
    return NextResponse.json({ error: "Failed to fetch prescriptions" }, { status: 500 });
  }
}
