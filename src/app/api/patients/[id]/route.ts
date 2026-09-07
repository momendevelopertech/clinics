import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { getCurrentUserId, hasPermission } from "@/lib/auth";
import { patientUpdateSchema } from "@/lib/validations";
import { logServerError } from "@/lib/safe-logger";
import {
  buildEncryptedEmergencyContactFields,
  buildEncryptedPatientFields,
  readEmergencyContactFields,
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
  familyHistory?: string | null;
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
    mrn: p.mrn ?? `MRN-${p.id.substring(0, 8).toUpperCase()}`,
    familyHistory: sensitive.familyHistory ?? "",
    status: p.status ?? "Active",
    lastVisit: p.updatedAt.toISOString().split("T")[0],
    regDate: p.createdAt.toISOString().split("T")[0],
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const orgId = await getOrgId();
    assertOrgScope(orgId);

    const patient = await prisma.patient.findFirst({
      where: { id, organizationId: orgId },
      include: { emergencyContact: true },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...mapPatientToResponse(patient),
      emergencyContact: patient.emergencyContact
        ? readEmergencyContactFields(patient.emergencyContact)
        : null,
    });
  } catch (error) {
    logServerError("Error fetching patient", error);
    return NextResponse.json(
      { error: "Failed to fetch patient" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
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

    const existing = await prisma.patient.findFirst({
      where: { id, organizationId: orgId },
      include: { emergencyContact: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = patientUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const existingSensitive = readPatientSensitiveFields(existing);
    const nextSensitive = buildEncryptedPatientFields({
      dateOfBirth:
        data.dateOfBirth !== undefined
          ? data.dateOfBirth
          : existingSensitive.dateOfBirth?.toISOString().split("T")[0] ?? null,
      phoneSecondary:
        data.phoneSecondary !== undefined
          ? data.phoneSecondary
          : existingSensitive.phoneSecondary,
      address: data.address !== undefined ? data.address : existingSensitive.address,
      city: data.city !== undefined ? data.city : existingSensitive.city,
      state: data.state !== undefined ? data.state : existingSensitive.state,
      zip: data.zip !== undefined ? data.zip : existingSensitive.zip,
      country:
        data.country !== undefined ? data.country : existingSensitive.country,
      familyHistory:
        data.familyHistory !== undefined
          ? data.familyHistory
          : existingSensitive.familyHistory,
    });

    const updated = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
      const patient = await tx.patient.update({
        where: { id },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          mrn: data.mrn !== undefined
            ? data.mrn?.trim().toUpperCase() || null
            : existing.mrn,
          dateOfBirth: nextSensitive.dateOfBirth,
          gender: data.gender ?? existing.gender,
          email: data.email ?? existing.email,
          phone: data.phone ?? existing.phone,
          phoneSecondary: nextSensitive.phoneSecondary,
          address: nextSensitive.address,
          city: nextSensitive.city,
          state: nextSensitive.state,
          zip: nextSensitive.zip,
          country: nextSensitive.country,
          bloodType: data.bloodType ?? existing.bloodType,
          allergies: data.allergies ?? existing.allergies,
          primaryCareProvider:
            data.primaryCareProvider ?? existing.primaryCareProvider,
          familyHistory: nextSensitive.familyHistory,
          sensitiveDataEncrypted: nextSensitive.sensitiveDataEncrypted,
          status: data.status ? (data.status as string) : existing.status,
        },
      });

      if (
        data.emergencyContactName !== undefined ||
        data.emergencyContactPhone !== undefined
      ) {
        if (existing.emergencyContact) {
          const existingContact = readEmergencyContactFields(existing.emergencyContact);
          const encryptedContact = buildEncryptedEmergencyContactFields({
            name:
              data.emergencyContactName !== undefined
                ? data.emergencyContactName
                : existingContact.name,
            phone:
              data.emergencyContactPhone !== undefined
                ? data.emergencyContactPhone
                : existingContact.phone,
            relationship:
              data.emergencyContactRelationship !== undefined
                ? data.emergencyContactRelationship
                : existingContact.relationship,
          });
          await tx.emergencyContact.update({
            where: { patientId: id },
            data: encryptedContact,
          });
        } else if (data.emergencyContactName || data.emergencyContactPhone) {
          const encryptedContact = buildEncryptedEmergencyContactFields({
            name: data.emergencyContactName ?? "Unknown",
            phone: data.emergencyContactPhone ?? "",
            relationship: data.emergencyContactRelationship ?? null,
          });
          await tx.emergencyContact.create({
            data: {
              patientId: id,
              ...encryptedContact,
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          userId,
          action: "UPDATE",
          entityType: "Patient",
          entityId: id,
          beforeState: JSON.stringify(existing),
          afterState: JSON.stringify(patient),
        },
      });

      return patient;
      },
    );

    const withContact = await prisma.patient.findUnique({
      where: { id: updated.id },
      include: { emergencyContact: true },
    });

    return NextResponse.json(
      withContact
        ? {
            ...mapPatientToResponse(withContact),
            emergencyContact: withContact.emergencyContact
              ? readEmergencyContactFields(withContact.emergencyContact)
              : null,
          }
        : mapPatientToResponse(updated),
    );
  } catch (error) {
    logServerError("Error updating patient", error);
    return NextResponse.json(
      { error: "Failed to update patient" },
      { status: 500 },
    );
  }
}
