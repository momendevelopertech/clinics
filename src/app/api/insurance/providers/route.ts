import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireOrgContext } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { requireOwner } from "@/lib/roles";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import { insuranceProviderSchema } from "@/lib/validations/billing";

/**
 * G23: Owner-managed canonical insurance provider list (org-level).
 * Read: billing staff (policy form dropdown). Write: Owner only.
 */
export async function GET() {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "billing");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(orgId, [
      { action: "billing:read", resource: "billing" },
    ]);
    if (authz.response) return authz.response;

    const providers = await prisma.insuranceProvider.findMany({
      where: { organizationId: orgId },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ providers });
  } catch (error) {
    logServerError("List insurance providers error", error);
    return NextResponse.json({ error: "Failed to fetch providers" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireOrgContext();
    const owner = await requireOwner({ json: true });
    if (!owner.ok) return owner.response ?? NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const parsed = insuranceProviderSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid provider", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const existing = await prisma.insuranceProvider.findFirst({
      where: { organizationId: context.organizationId, name: parsed.data.name },
    });
    if (existing) {
      return NextResponse.json({ error: "Provider already exists" }, { status: 409 });
    }

    const provider = await prisma.insuranceProvider.create({
      data: {
        organizationId: context.organizationId,
        name: parsed.data.name,
        contactPhone: parsed.data.contactPhone ?? null,
        contactEmail: parsed.data.contactEmail ?? null,
        active: parsed.data.active ?? true,
      },
    });
    await createAuditLog({
      organizationId: context.organizationId,
      userId: context.userId,
      action: "CREATE",
      entityType: "InsuranceProvider",
      entityId: provider.id,
      afterState: JSON.stringify({ name: provider.name }),
    });
    return NextResponse.json(provider, { status: 201 });
  } catch (error) {
    logServerError("Create insurance provider error", error);
    return NextResponse.json({ error: "Failed to create provider" }, { status: 500 });
  }
}
