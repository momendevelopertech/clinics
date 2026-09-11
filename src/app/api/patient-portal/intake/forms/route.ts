import { NextResponse } from "next/server";
import { getPatientSessionFromRequest } from "@/lib/patient-auth";
import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/safe-logger";

/** Active intake forms for the patient's org (portal copy). */
export async function GET(request: Request) {
  try {
    const session = await getPatientSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const forms = await prisma.intakeForm.findMany({
      where: { organizationId: session.patient.organizationId, active: true },
      include: { fields: { orderBy: { position: "asc" } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(forms);
  } catch (error) {
    logServerError("Patient intake forms failed", error);
    return NextResponse.json({ error: "Failed to load forms" }, { status: 500 });
  }
}
