import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { getCurrentUserId, hasPermission } from "@/lib/auth";
import { patientCreateSchema } from "@/lib/validations";
import { logServerError } from "@/lib/safe-logger";
import { checkPlanLimit } from "@/lib/plans";
import {
  buildEncryptedEmergencyContactFields,
  buildEncryptedPatientFields,
  readPatientSensitiveFields,
} from "@/lib/patient-sensitive";

function mapPatientToResponse(p: {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date | null;
  gender: string | null;
  email: string | null;
  phone: string | null;
  phoneSecondary: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  bloodType: string | null;
  allergies: string | null;
  primaryCareProvider: string | null;
  status: string;
  mrn: string | null;
  createdAt: Date;
  updatedAt: Date;
  sensitiveDataEncrypted?: string | null;
}) {
  const sensitive = readPatientSensitiveFields(p);

  return {
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    dob: sensitive.dateOfBirth?.toISOString().split("T")[0] ?? "",
    gender: p.gender ?? "Unknown",
    email: p.email ?? "",
    phone: p.phone ?? "",
    phoneSecondary: sensitive.phoneSecondary ?? "",
    address: sensitive.address ?? "",
    city: sensitive.city ?? "",
    state: sensitive.state ?? "",
    zip: sensitive.zip ?? "",
    country: sensitive.country ?? "",
    bloodType: p.bloodType ?? "Unknown",
    allergies: p.allergies ?? "None",
    primaryCareProvider: p.primaryCareProvider ?? "Unassigned",
    mrn: p.mrn ?? `PT-${p.id.substring(0, 5).toUpperCase()}`,
    status: p.status ?? "Active",
    lastVisit: p.updatedAt.toISOString().split("T")[0],
    regDate: p.createdAt.toISOString().split("T")[0],
  };
}

export async function GET() {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);

    const patients = await prisma.patient.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(patients.map(mapPatientToResponse));
  } catch (error) {
    logServerError("Error fetching patients", error);
    return NextResponse.json(
      { error: "Failed to fetch patients" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const userId = await getCurrentUserId(orgId);
    const canWritePatients = await hasPermission(
      userId,
      orgId,
      "patients:write",
      "patients",
    );

    if (!canWritePatients) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = patientCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // SaaS plan limiting: patients are a metered resource.
    const limitCheck = await checkPlanLimit(orgId, "patients");
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.reason }, { status: 403 });
    }

    const data = parsed.data;
    const sensitiveData = buildEncryptedPatientFields({
      dateOfBirth: data.dateOfBirth ?? null,
      phoneSecondary: data.phoneSecondary || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      zip: data.zip || null,
      country: data.country || null,
      familyHistory: data.familyHistory || null,
    });

    const newPatient = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
      const patient = await tx.patient.create({
        data: {
          organizationId: orgId,
          firstName: data.firstName,
          lastName: data.lastName,
          dateOfBirth: sensitiveData.dateOfBirth,
          gender: data.gender ?? null,
          email: data.email || null,
          phone: data.phone || null,
          phoneSecondary: sensitiveData.phoneSecondary,
          address: sensitiveData.address,
          city: sensitiveData.city,
          state: sensitiveData.state,
          zip: sensitiveData.zip,
          country: sensitiveData.country,
          bloodType: data.bloodType || null,
          allergies: data.allergies || null,
          primaryCareProvider: data.primaryCareProvider || null,
          familyHistory: sensitiveData.familyHistory,
          sensitiveDataEncrypted: sensitiveData.sensitiveDataEncrypted,
        },
      });

      if (data.emergencyContactName || data.emergencyContactPhone) {
        const encryptedContact = buildEncryptedEmergencyContactFields({
          name: data.emergencyContactName ?? "Unknown",
          phone: data.emergencyContactPhone ?? "",
          relationship: data.emergencyContactRelationship ?? null,
        });
        await tx.emergencyContact.create({
          data: {
            patientId: patient.id,
            ...encryptedContact,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          userId,
          action: "CREATE",
          entityType: "Patient",
          entityId: patient.id,
          afterState: JSON.stringify(patient),
        },
      });

      return patient;
      },
    );

    return NextResponse.json(mapPatientToResponse(newPatient), { status: 201 });
  } catch (error) {
    logServerError("Error creating patient", error);
    return NextResponse.json(
      { error: "Failed to create patient" },
      { status: 500 },
    );
  }
}
