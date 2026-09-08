import { NextResponse } from "next/server";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { soapNoteSchema } from "@/lib/validations";
import { logServerError } from "@/lib/safe-logger";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: encounterId } = await params;
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "encounters");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(orgId, [
      { action: "encounters:write", resource: "encounters" },
    ]);
    if (authz.response) return authz.response;
    const { userId } = authz;

    const encounter = await prisma.encounter.findFirst({
      where: { id: encounterId, organizationId: orgId },
    });
    if (!encounter) {
      return NextResponse.json({ error: "Encounter not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = soapNoteSchema
      .extend({
        noteType: z.string().optional(),
        text: z.string().optional(),
      })
      .safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const note = await prisma.encounterNote.create({
      data: {
        encounterId,
        authorId: userId,
        noteType: data.noteType ?? "SOAP",
        subjective: data.subjective ?? null,
        objective: data.objective ?? null,
        assessment: data.assessment ?? null,
        plan: data.plan ?? null,
        text: data.text ?? null,
      },
    });

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "CREATE",
      entityType: "EncounterNote",
      entityId: note.id,
      afterState: JSON.stringify(note),
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    logServerError("Error creating encounter note", error);
    return NextResponse.json(
      { error: "Failed to create encounter note" },
      { status: 500 }
    );
  }
}
