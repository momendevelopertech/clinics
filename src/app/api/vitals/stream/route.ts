import { NextResponse } from "next/server";
import { getPatientSessionFromRequest } from "@/lib/patient-auth";
import { getLatestVitalSnapshot } from "@/lib/vitals";
import { logServerError } from "@/lib/safe-logger";
import { prisma } from "@/lib/prisma";
import { requireOrgContext, isAuthContextError } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const POLL_INTERVAL_MS = 5_000;

function formatEvent(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

async function resolveVitalsStreamAccess(request: Request, patientId: string) {
  const patientSession = await getPatientSessionFromRequest(request);

  if (patientSession) {
    if (patientSession.patient.id !== patientId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return {
      patientId,
      organizationId: patientSession.patient.organizationId,
    };
  }

  try {
    const { organizationId } = await requireOrgContext();
    const moduleAuthz = await requireModulePermission(organizationId, "encounters");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(organizationId, [
      { action: "patients:read", resource: "patients" },
      { action: "encounters:read", resource: "encounters" },
    ]);
    if (authz.response) {
      return authz.response;
    }
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, organizationId },
      select: { id: true },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    return {
      patientId,
      organizationId,
    };
  } catch (error) {
    if (isAuthContextError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    throw error;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");

    if (!patientId) {
      return NextResponse.json(
        { error: "Patient ID is required" },
        { status: 400 },
      );
    }

    const access = await resolveVitalsStreamAccess(request, patientId);
    if (access instanceof NextResponse) {
      return access;
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let closed = false;
        let lastVitalId: string | null = null;
        let interval: ReturnType<typeof setInterval> | null = null;

        const close = () => {
          if (closed) return;
          closed = true;
          if (interval) clearInterval(interval);
          controller.close();
        };

        const sendLatestVital = async (eventName: "snapshot" | "vital") => {
          const latestVital = await getLatestVitalSnapshot(access.patientId);

          if (!latestVital) {
            if (eventName === "snapshot") {
              controller.enqueue(
                encoder.encode(
                  formatEvent("snapshot", {
                    patientId: access.patientId,
                    vital: null,
                  }),
                ),
              );
            }
            return;
          }

          if (eventName === "snapshot" || latestVital.id !== lastVitalId) {
            lastVitalId = latestVital.id;
            controller.enqueue(
              encoder.encode(
                formatEvent(eventName, {
                  patientId: access.patientId,
                  vital: latestVital,
                }),
              ),
            );
          }
        };

        request.signal.addEventListener("abort", close);

        controller.enqueue(
          encoder.encode(
            formatEvent("connected", {
              patientId: access.patientId,
              organizationId: access.organizationId,
            }),
          ),
        );

        await sendLatestVital("snapshot");

        interval = setInterval(async () => {
          if (closed) return;

          try {
            await sendLatestVital("vital");
            controller.enqueue(
              encoder.encode(
                formatEvent("ping", { timestamp: new Date().toISOString() }),
              ),
            );
          } catch (error) {
            logServerError("Vitals stream polling failed", error, {
              patientId: access.patientId,
            });
            close();
          }
        }, POLL_INTERVAL_MS);
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    logServerError("Vitals stream error", error);
    return NextResponse.json(
      { error: "Failed to open vitals stream" },
      { status: 500 },
    );
  }
}
