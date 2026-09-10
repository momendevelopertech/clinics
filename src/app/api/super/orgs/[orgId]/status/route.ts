import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/roles";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const statusBodySchema = z.object({
  status: z.enum(["pending", "active", "suspended"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) {
    return NextResponse.json(guard.error, { status: guard.status });
  }

  const orgId = (await params).orgId;
  const parsed = statusBodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const existing = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { status: true, name: true, slug: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }
  if (existing.slug === "platform-admin") {
    return NextResponse.json({ error: "Platform organization is not a clinic" }, { status: 400 });
  }

  const updated = await prisma.organization.update({
    where: { id: orgId },
    data: { status: parsed.data.status },
    select: { id: true, status: true },
  });

  await createAuditLog({
    organizationId: orgId,
    userId: guard.userId,
    action: "UPDATE",
    entityType: "platform_organization_status",
    entityId: orgId,
    beforeState: JSON.stringify({ status: existing.status }),
    afterState: JSON.stringify({ status: updated.status }),
  });

  return NextResponse.json({ ok: true, org: updated });
}