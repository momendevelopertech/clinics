import { NextResponse } from "next/server";
import { getPatientSessionFromRequest } from "@/lib/patient-auth";
import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/safe-logger";

/** Patient-scoped document list — only the logged-in patient's own files. */
export async function GET(request: Request) {
  try {
    const session = await getPatientSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const documents = await prisma.document.findMany({
      where: { patientId: session.patient.id },
      select: {
        id: true,
        name: true,
        type: true,
        storageKey: true,
        mimeType: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      documents: documents.map((d) => ({
        id: d.id,
        name: d.name,
        type: d.type,
        url: d.storageKey,
        mimeType: d.mimeType,
        createdAt: d.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    logServerError("Patient portal documents error", error);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}
