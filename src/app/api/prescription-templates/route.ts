import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import { prescriptionItemSchema } from "@/lib/validations";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  specialty: z.string().trim().max(80).nullish(),
  isShared: z.boolean().default(false),
  items: z.array(prescriptionItemSchema).min(1).max(30),
});

/**
 * Prescription templates CRUD. Every template is org-scoped; personal ones
 * are only visible to their author, plus any op-shared organization templates.
 */
export async function GET(request: Request) {
  try {
    const context = await requireOrgContext();
    const orgId = context.organizationId;
    const moduleAuthz = await requireModulePermission(orgId, "labs");
    if (moduleAuthz.response) return moduleAuthz.response;

    const { searchParams } = new URL(request.url);
    const specialty = searchParams.get("specialty")?.trim() ?? "";
    const mineOnly = searchParams.get("mine") === "true";

    const templates = await prisma.prescriptionTemplate.findMany({
      where: {
        organizationId: orgId,
        ...(mineOnly ? { createdById: context.userId } : {}),
        ...(specialty ? { specialty: { equals: specialty, mode: "insensitive" as const } } : {}),
      },
      select: {
        id: true,
        name: true,
        specialty: true,
        isShared: true,
        items: true,
        usageCount: true,
        createdAt: true,
        updatedAt: true,
        createdById: true,
      },
      orderBy: [{ usageCount: "desc" }, { updatedAt: "desc" }],
      take: 100,
    });

    return NextResponse.json({
      templates: templates.map((tpl) => ({
        ...tpl,
        isOwn: tpl.createdById === context.userId,
      })),
    });
  } catch (error) {
    logServerError("Failed to list prescription templates", error);
    return NextResponse.json({ error: "Failed to list prescription templates" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireOrgContext();
    const orgId = context.organizationId;
    const { userId } = context;
    const moduleAuthz = await requireModulePermission(orgId, "labs");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(orgId, [
      { action: "encounters:write", resource: "encounters" },
      { action: "patients:write", resource: "patients" },
    ]);
    if (authz.response) return authz.response;

    const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const template = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const created = await tx.prescriptionTemplate.create({
        data: {
          organizationId: orgId,
          createdById: userId,
          name: parsed.data.name,
          specialty: parsed.data.specialty || null,
          isShared: parsed.data.isShared,
          items: parsed.data.items as Prisma.InputJsonValue,
        },
      });
      await createAuditLog(
        {
          organizationId: orgId,
          userId,
          action: "CREATE",
          entityType: "PrescriptionTemplate",
          entityId: created.id,
          afterState: JSON.stringify(created),
          request,
          db: tx,
        },
      );
      return created;
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    logServerError("Failed to create prescription template", error);
    return NextResponse.json({ error: "Failed to create prescription template" }, { status: 500 });
  }
}