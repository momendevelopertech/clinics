import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPasswordHash } from "@/lib/password";
import { createPatientSession, isPatientOrganizationActive } from "@/lib/patient-auth";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const mrn = typeof body.mrn === "string" ? body.mrn.trim() : "";

    if (!email || !password || !mrn) {
      return NextResponse.json(
        { error: "Email, password, and MRN are required" },
        { status: 400 },
      );
    }

    // Find patient by email and MRN
    const patient = await prisma.patient.findFirst({
      where: { email, mrn },
      include: { organization: true },
    });

    if (!patient) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    if (!verifyPasswordHash(patient.passwordHash, password)) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    if (!isPatientOrganizationActive(patient.organization.status)) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    const { sessionId, rawToken, expiresAt } = await createPatientSession({
      patientId: patient.id,
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    const response = NextResponse.json(
      {
        success: true,
        patient: {
          id: patient.id,
          firstName: patient.firstName,
          lastName: patient.lastName,
          email: patient.email,
          mrn: patient.mrn,
          organizationId: patient.organizationId,
        },
      },
      { status: 200 },
    );

    response.cookies.set("patient_session", rawToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: expiresAt,
    });

    await createAuditLog({
      organizationId: patient.organizationId,
      action: "CREATE",
      entityType: "PatientSession",
      entityId: sessionId,
      actorType: "patient",
      actorIdentifier: patient.id,
      afterState: JSON.stringify({ status: "created" }),
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return response;
  } catch (error) {
    logServerError("Patient auth error", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 },
    );
  }
}
