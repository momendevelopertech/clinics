import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { requireModuleEntitlement } from "@/lib/entitlements/access";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import { expenseCreateSchema } from "@/lib/validations";

export async function GET(request: Request) {
  try {
    const orgId = await getOrgId();
    const moduleAuthz = await requireModulePermission(orgId, "billing");
    if (moduleAuthz.response) return moduleAuthz.response;
    assertOrgScope(orgId);
    const authz = await requireAnyPermission(orgId, [
      { action: "billing:read", resource: "billing" },
    ]);
    if (authz.response) return authz.response;

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const branchId = searchParams.get("branchId");

    const expenses = await prisma.expense.findMany({
      where: {
        organizationId: orgId,
        ...(category ? { category } : {}),
        ...(branchId ? { branchId } : {}),
        ...(from || to
          ? {
              spentAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lt: new Date(to) } : {}),
              },
            }
          : {}),
      },
      include: { branch: { select: { id: true, name: true } } },
      orderBy: { spentAt: "desc" },
      take: 500,
    });
    const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    return NextResponse.json({ expenses, total });
  } catch (error) {
    logServerError("Error fetching expenses", error);
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const orgId = await getOrgId();
    const moduleAuthz = await requireModulePermission(orgId, "billing");
    if (moduleAuthz.response) return moduleAuthz.response;
    const planAuthz = await requireModuleEntitlement(orgId, "billing");
    if (!planAuthz.ok) return planAuthz.response;
    assertOrgScope(orgId);
    const authz = await requireAnyPermission(orgId, [
      { action: "billing:write", resource: "billing" },
    ]);
    if (authz.response) return authz.response;
    const { userId } = authz;

    const parsed = expenseCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    if (parsed.data.branchId) {
      const branch = await prisma.branch.findFirst({
        where: { id: parsed.data.branchId, organizationId: orgId },
        select: { id: true },
      });
      if (!branch) return NextResponse.json({ error: "Branch not found" }, { status: 400 });
    }

    const expense = await prisma.expense.create({
      data: {
        organizationId: orgId,
        category: parsed.data.category,
        amount: parsed.data.amount,
        spentAt: parsed.data.spentAt ? new Date(parsed.data.spentAt) : new Date(),
        branchId: parsed.data.branchId ?? null,
        notes: parsed.data.notes || null,
      },
    });
    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "CREATE",
      entityType: "Expense",
      entityId: expense.id,
      afterState: JSON.stringify({ category: expense.category, amount: expense.amount }),
    });
    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    logServerError("Error creating expense", error);
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  }
}
