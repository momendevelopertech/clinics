import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/roles";
import { requireOrgContext } from "@/lib/org";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";

/** POST /api/api-keys/[id]/revoke (Owner) — soft-revokes a machine key. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const owner = await requireOwner({ json: true }).catch(() => null);
    if (!owner?.ok) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const context = await requireOrgContext();
    const { id } = await params;
    const key = await prisma.apiKey.findFirst({
      where: { id, organizationId: context.organizationId },
    });
    if (!key) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }
    await prisma.apiKey.update({
      where: { id },
      data: { active: false },
    });
    await createAuditLog({
      organizationId: context.organizationId,
      userId: context.userId,
      action: "UPDATE",
      entityType: "ApiKey",
      entityId: id,
      afterState: JSON.stringify({ active: false }),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logServerError("Failed to revoke API key", error);
    return NextResponse.json({ error: "Failed to revoke API key" }, { status: 500 });
  }
}