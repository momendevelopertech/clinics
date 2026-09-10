import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { logServerError } from "@/lib/safe-logger";
import { parseOrgSettings } from "@/lib/org-settings";
import {
  DEFAULT_CANCELLATION_POLICY,
  summarizeAttendance,
} from "@/lib/appointments";

/** Staff view of a patient's no-show / late-cancel record under the org policy. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const authz = await requireAnyPermission(orgId, [
      { action: "patients:read", resource: "patients" },
    ]);
    if (authz.response) return authz.response;

    const { id } = await params;
    const patient = await prisma.patient.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true },
    });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const [org, appointments] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: orgId },
        select: { settingsJson: true },
      }),
      prisma.appointment.findMany({
        where: { patientId: id, organizationId: orgId },
        select: { status: true, startTime: true, updatedAt: true },
      }),
    ]);

    const settings = parseOrgSettings(org?.settingsJson);
    const policy = {
      lateCancelHoursBefore:
        settings.cancellationPolicy?.lateCancelHoursBefore ??
        DEFAULT_CANCELLATION_POLICY.lateCancelHoursBefore,
      maxNoShows:
        settings.cancellationPolicy?.maxNoShows ?? DEFAULT_CANCELLATION_POLICY.maxNoShows,
      noShowFee:
        settings.cancellationPolicy?.noShowFee ?? DEFAULT_CANCELLATION_POLICY.noShowFee,
    };

    return NextResponse.json({
      policy,
      summary: summarizeAttendance(appointments, policy),
    });
  } catch (error) {
    logServerError("Patient attendance error", error);
    return NextResponse.json({ error: "Failed to fetch attendance" }, { status: 500 });
  }
}
