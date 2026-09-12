import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/org";
import { requireOwner } from "@/lib/roles";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import { intakeFormUpdateSchema } from "@/lib/validations";

/** Owner-only: rename / annotate / activate-deactivate an intake form. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const context = await requireOrgContext();
    const owner = await requireOwner({ json: true });
    if (!owner.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const parsed = intakeFormUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const form = await prisma.intakeForm.findFirst({
      where: { id, organizationId: context.organizationId },
    });
    if (!form) return NextResponse.json({ error: "Form not found" }, { status: 404 });

    const updated = await prisma.intakeForm.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.description !== undefined
          ? { description: parsed.data.description || null }
          : {}),
        ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
      },
    });
    await createAuditLog({
      organizationId: context.organizationId,
      userId: context.userId,
      action: "UPDATE",
      entityType: "IntakeForm",
      entityId: id,
      beforeState: JSON.stringify({ name: form.name, active: form.active }),
      afterState: JSON.stringify({ name: updated.name, active: updated.active }),
    });
    return NextResponse.json(updated);
  } catch (error) {
    logServerError("Error updating intake form", error);
    return NextResponse.json({ error: "Failed to update form" }, { status: 500 });
  }
}

/** Owner-only: delete a form that collected no responses yet. Records are
 * immutable once patients answer them — deactivate instead. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const context = await requireOrgContext();
    const owner = await requireOwner({ json: true });
    if (!owner.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const form = await prisma.intakeForm.findFirst({
      where: { id, organizationId: context.organizationId },
      select: { id: true, _count: { select: { responses: true } } },
    });
    if (!form) return NextResponse.json({ error: "Form not found" }, { status: 404 });
    if (form._count.responses > 0) {
      return NextResponse.json(
        { error: "Form already collected responses — deactivate instead of deleting" },
        { status: 409 },
      );
    }

    await prisma.intakeForm.delete({ where: { id } });
    await createAuditLog({
      organizationId: context.organizationId,
      userId: context.userId,
      action: "DELETE",
      entityType: "IntakeForm",
      entityId: id,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logServerError("Error deleting intake form", error);
    return NextResponse.json({ error: "Failed to delete form" }, { status: 500 });
  }
}