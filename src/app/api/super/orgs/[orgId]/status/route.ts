import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/roles";
import { createAuditLog } from "@/lib/audit";

const VALID_STATUSES = ["pending", "active", "suspended"] as const;

type Body = { status?: string };

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) {
    return NextResponse.json(guard.error, { status: guard.status });
  }

  const orgId = (await params).orgId;
  const body = (await request.json().catch(() => ({}))) as Body;

  if (!body.status || !(VALID_STATUSES as readonly string[]).includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const existing = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { status: true, name: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const updated = await prisma.organization.update({
    where: { id: orgId },
    data: { status: body.status },
    select: { id: true, status: true },
  });

  await createAuditLog({
    organizationId: orgId,
    userId: guard.userId,
    action: "UPDATE",
    entityType: "organization",
    entityId: orgId,
    beforeState: JSON.stringify({ status: existing.status }),
    afterState: JSON.stringify({ status: updated.status }),
  });

  return NextResponse.json({ ok: true, org: updated });
}