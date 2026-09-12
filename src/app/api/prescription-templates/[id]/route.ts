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

const updateSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    specialty: z.string().trim().max(80).nullish(),
    isShared: z.boolean().optional(),
    items: z.array(prescriptionItemSchema).min(1).max(30).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field to update is required",
  });

const OWNER_ROLES = new Set(["owner", "superAdmin"]);

/**
 * PATCH/DELETE a single template. Authorized for the template author,
 * or any user holding an owner/superAdmin role in the same organization.
 */
async function resolveTemplateAuthorization(request: Request, id: string) {
  const context = await requireOrgContext();
  const orgId = context.organizationId;

  const moduleAuthz = await requireModulePermission(orgId, "labs");
  if (moduleAuthz.response) return { context, orgId, response: moduleAuthz.response };
  const authz = await requireAnyPermission(orgId, [
    { action: "encounters:write", resource: "encounters" },
    { action: "patients:write", resource: "patients" },
  ]);
  if (authz.response) return { context, orgId, response: authz.response };

  const template = await prisma.prescriptionTemplate.findFirst({
    where: { id, organizationId: orgId },
    select: { id: true, createdById: true },
  });
  if (!template) {
    return {
      context,
      orgId,
      response: NextResponse.json({ error: "Template not found" }, { status: 404 }),
    };
  }

  const isOwner =
    context.roles.some((role) => OWNER_ROLES.has(role.toLowerCase())) ||
    context.userId === template.createdById;
  if (!isOwner) {
    return {
      context,
      orgId,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { context, orgId, template, response: null };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await resolveTemplateAuthorization(request, id);
    if (result.response) return result.response;
    if (!result.template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

    const parsed = updateSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const updated = await prisma.prescriptionTemplate.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.specialty !== undefined
          ? { specialty: parsed.data.specialty || null }
          : {}),
        ...(parsed.data.isShared !== undefined ? { isShared: parsed.data.isShared } : {}),
        ...(parsed.data.items !== undefined
          ? { items: parsed.data.items as Prisma.InputJsonValue }
          : {}),
      },
    });

    await createAuditLog({
      organizationId: result.orgId,
      userId: result.context.userId,
      action: "UPDATE",
      entityType: "PrescriptionTemplate",
      entityId: id,
      afterState: JSON.stringify(updated),
    });

    return NextResponse.json(updated);
  } catch (error) {
    logServerError("Failed to update prescription template", error);
    return NextResponse.json({ error: "Failed to update prescription template" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await resolveTemplateAuthorization(_request, id);
    if (result.response) return result.response;
    if (!result.template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.prescriptionTemplate.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          organizationId: result.orgId,
          userId: result.context.userId,
          action: "DELETE",
          entityType: "PrescriptionTemplate",
          entityId: id,
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logServerError("Failed to delete prescription template", error);
    return NextResponse.json({ error: "Failed to delete prescription template" }, { status: 500 });
  }
}