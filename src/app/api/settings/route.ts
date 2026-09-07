import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/org";
import { requireOwner } from "@/lib/roles";
import { createAuditLog } from "@/lib/audit";
import { organizationSettingsSchema } from "@/lib/validations";
import { parseOrgSettings } from "@/lib/org-settings";
import { logServerError } from "@/lib/safe-logger";

export async function GET() {
  try {
    const { organizationId } = await requireOrgContext();
    const organization = await prisma.organization.findUnique({ where: { id: organizationId }, select: { settingsJson: true, currency: true } });
    return NextResponse.json({ ...parseOrgSettings(organization?.settingsJson), currency: organization?.currency ?? "USD" });
  } catch (error) {
    logServerError("Error fetching organization settings", error);
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await requireOrgContext();
    const owner = await requireOwner({ json: true });
    if (!owner.ok) return owner.response ?? NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const parsed = organizationSettingsSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    const existing = await prisma.organization.findUnique({ where: { id: context.organizationId }, select: { settingsJson: true, currency: true } });
    const updated = await prisma.organization.update({ where: { id: context.organizationId }, data: { settingsJson: JSON.stringify(parsed.data), currency: parsed.data.currency } });
    await createAuditLog({ organizationId: context.organizationId, userId: context.userId, action: "UPDATE", entityType: "OrganizationSettings", entityId: context.organizationId, beforeState: JSON.stringify(existing), afterState: JSON.stringify(parsed.data), request });
    return NextResponse.json({ ...parsed.data, updatedAt: updated.updatedAt });
  } catch (error) {
    logServerError("Error updating organization settings", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
