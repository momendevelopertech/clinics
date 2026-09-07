import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/org";
import { requireOwner } from "@/lib/roles";
import { createAuditLog } from "@/lib/audit";
import { branchUpdateSchema } from "@/lib/validations/location";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const context = await requireOrgContext();
    const owner = await requireOwner({ json: true });
    if (!owner.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await params;
    const existing = await prisma.branch.findFirst({ where: { id, organizationId: context.organizationId } });
    if (!existing) return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    const parsed = branchUpdateSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid branch" }, { status: 400 });
    const branch = await prisma.branch.update({ where: { id }, data: parsed.data });
    await createAuditLog({
      organizationId: context.organizationId, userId: context.userId, action: "UPDATE",
      entityType: "branch", entityId: id,
      beforeState: JSON.stringify(existing), afterState: JSON.stringify(branch),
    });
    return NextResponse.json(branch);
  } catch {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
}
