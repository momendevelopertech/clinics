import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { buildPatientSummaryPayload } from "@/lib/patient-summary";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { organizationId } = await requireOrgContext();
    const { id } = await params;

    const moduleAuthz = await requireModulePermission(organizationId, "patients");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(organizationId, [
      { action: "patients:read", resource: "patients" },
      { action: "patients:write", resource: "patients" },
    ]);
    if (authz.response) return authz.response;

    const patient = await prisma.patient.findFirst({
      where: { id, organizationId },
      include: {
        diagnoses: { orderBy: { createdAt: "desc" }, take: 5 },
        prescriptions: { orderBy: { createdAt: "desc" }, take: 5 },
        vitals: { orderBy: { recordedAt: "desc" }, take: 1 },
        appointments: { orderBy: { startTime: "desc" }, take: 1 },
      },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const summary = buildPatientSummaryPayload({
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      mrn: patient.mrn,
      dateOfBirth: patient.dateOfBirth,
      phone: patient.phone,
      email: patient.email,
      diagnoses: patient.diagnoses.map((diagnosis) => ({
        name: diagnosis.name,
        status: diagnosis.status,
        createdAt: diagnosis.createdAt,
      })),
      medications: patient.prescriptions.map((prescription) => ({
        medicationName: prescription.medicationName,
        dosage: prescription.dosage,
        frequency: prescription.frequency,
        createdAt: prescription.createdAt,
      })),
      latestVitals: patient.vitals[0]
        ? {
            bloodPressureSystolic: patient.vitals[0].bloodPressureSystolic,
            bloodPressureDiastolic: patient.vitals[0].bloodPressureDiastolic,
            heartRate: patient.vitals[0].heartRate,
            weightKg: patient.vitals[0].weightKg,
            recordedAt: patient.vitals[0].recordedAt,
          }
        : null,
      lastVisit: patient.appointments[0]?.startTime ? new Date(patient.appointments[0].startTime).toISOString() : null,
    });

    return NextResponse.json(summary);
  } catch {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
}
