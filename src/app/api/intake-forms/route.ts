import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/org";
import { requireOwner } from "@/lib/roles";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import { intakeFormCreateSchema } from "@/lib/validations";

export async function GET(request: Request) {
  try {
    const { organizationId } = await requireOrgContext();
    const activeOnly = new URL(request.url).searchParams.get("active") === "true";
    const forms = await prisma.intakeForm.findMany({
      where: { organizationId, ...(activeOnly ? { active: true } : {}) },
      include: { fields: { orderBy: { position: "asc" } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(forms);
  } catch {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
}

/** Owner-only: define a visit intake form. */
export async function POST(request: Request) {
  try {
    const context = await requireOrgContext();
    const owner = await requireOwner({ json: true });
    if (!owner.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const parsed = intakeFormCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const form = await prisma.intakeForm.create({
      data: {
        organizationId: context.organizationId,
        name: parsed.data.name,
        description: parsed.data.description || null,
      },
    });
    await createAuditLog({
      organizationId: context.organizationId,
      userId: context.userId,
      action: "CREATE",
      entityType: "IntakeForm",
      entityId: form.id,
      afterState: JSON.stringify({ name: form.name }),
    });
    return NextResponse.json(form, { status: 201 });
  } catch (error) {
    logServerError("Error creating intake form", error);
    return NextResponse.json({ error: "Failed to create form" }, { status: 500 });
  }
}
