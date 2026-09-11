import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/org";
import { requireOwner } from "@/lib/roles";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import { intakeFieldCreateSchema } from "@/lib/validations";
import { slugifyFieldKey } from "@/lib/intake";

/** Owner-only: append a field to a form (key auto-slugged from the label). */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: formId } = await params;
    const context = await requireOrgContext();
    const owner = await requireOwner({ json: true });
    if (!owner.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const parsed = intakeFieldCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const form = await prisma.intakeForm.findFirst({
      where: { id: formId, organizationId: context.organizationId },
      include: { fields: { select: { position: true } } },
    });
    if (!form) return NextResponse.json({ error: "Form not found" }, { status: 404 });
    if (parsed.data.kind === "choice" && (!parsed.data.options || parsed.data.options.length < 2)) {
      return NextResponse.json({ error: "Choice fields need at least 2 options" }, { status: 400 });
    }
    const position = form.fields.reduce((max, f) => Math.max(max, f.position), -1) + 1;
    const field = await prisma.intakeField.create({
      data: {
        formId,
        key: slugifyFieldKey(parsed.data.label, `field-${position}`),
        label: parsed.data.label,
        labelAr: parsed.data.labelAr || null,
        kind: parsed.data.kind,
        required: parsed.data.required,
        options: parsed.data.options ? JSON.stringify(parsed.data.options) : null,
        position,
      },
    });
    await createAuditLog({
      organizationId: context.organizationId,
      userId: context.userId,
      action: "CREATE",
      entityType: "IntakeField",
      entityId: field.id,
      afterState: JSON.stringify({ formId, key: field.key }),
    });
    return NextResponse.json(field, { status: 201 });
  } catch (error) {
    logServerError("Error creating intake field", error);
    return NextResponse.json({ error: "Failed to create field" }, { status: 500 });
  }
}
