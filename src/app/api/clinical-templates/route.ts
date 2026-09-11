import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import { clinicalTemplateCreateSchema } from "@/lib/validations";

export async function GET(request: Request) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "encounters");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(orgId, [
      { action: "encounters:read", resource: "encounters" },
    ]);
    if (authz.response) return authz.response;

    const specialty = new URL(request.url).searchParams.get("specialty");
    const templates = await prisma.clinicalTemplate.findMany({
      where: {
        organizationId: orgId,
        ...(specialty ? { specialty } : {}),
      },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });
    return NextResponse.json(templates);
  } catch (error) {
    logServerError("Error fetching clinical templates", error);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "encounters");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(orgId, [
      { action: "encounters:write", resource: "encounters" },
    ]);
    if (authz.response) return authz.response;
    const { userId } = authz;

    const parsed = clinicalTemplateCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const template = await prisma.clinicalTemplate.create({
      data: {
        organizationId: orgId,
        name: parsed.data.name,
        specialty: parsed.data.specialty || null,
        noteType: parsed.data.noteType ?? "soap",
        subjective: parsed.data.subjective || null,
        objective: parsed.data.objective || null,
        assessment: parsed.data.assessment || null,
        plan: parsed.data.plan || null,
        isDefault: parsed.data.isDefault ?? false,
      },
    });
    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "CREATE",
      entityType: "ClinicalTemplate",
      entityId: template.id,
      afterState: JSON.stringify({ name: template.name, specialty: template.specialty }),
    });
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    logServerError("Error creating clinical template", error);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}
