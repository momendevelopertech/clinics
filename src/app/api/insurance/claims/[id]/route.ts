import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import {
  canTransitionClaim,
  claimCreditAmount,
  type ClaimStatus,
} from "@/lib/insurance";
import { insuranceClaimUpdateSchema } from "@/lib/validations/billing";

/** Advance a claim through submitted → pending → paid/denied → appeal. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "billing");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(orgId, [
      { action: "billing:write", resource: "billing" },
    ]);
    if (authz.response) return authz.response;
    const { userId } = authz;

    const { id } = await params;
    const parsed = insuranceClaimUpdateSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid claim update", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const existing = await prisma.insuranceClaim.findFirst({
      where: { id, organizationId: orgId },
      include: { invoice: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }
    if (!canTransitionClaim(existing.status, parsed.data.status)) {
      return NextResponse.json(
        { error: `Cannot move claim from ${existing.status} to ${parsed.data.status}` },
        { status: 409 },
      );
    }

    const nextStatus = parsed.data.status as ClaimStatus;
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.insuranceClaim.update({
        where: { id },
        data: {
          status: nextStatus,
          amountPaid:
            nextStatus === "paid" && parsed.data.amountPaid != null
              ? parsed.data.amountPaid
              : existing.amountPaid,
          denialReason:
            nextStatus === "denied" ? (parsed.data.denialReason ?? existing.denialReason) : null,
          paidAt: nextStatus === "paid" ? new Date() : existing.paidAt,
        },
      });

      // A paid claim credits its invoice, capped at the outstanding balance.
      let creditedInvoice = null;
      if (nextStatus === "paid" && existing.invoiceId && parsed.data.amountPaid != null) {
        const invoice = await tx.invoice.findUnique({ where: { id: existing.invoiceId } });
        if (invoice) {
          const outstanding = Number(invoice.totalAmount) - Number(invoice.amountPaid);
          const credit = claimCreditAmount(outstanding, parsed.data.amountPaid);
          const paid = Number(invoice.amountPaid) + credit;
          const total = Number(invoice.totalAmount);
          creditedInvoice = await tx.invoice.update({
            where: { id: invoice.id },
            data: {
              amountPaid: paid.toFixed(2),
              status: paid >= total ? "paid" : "partially_paid",
            },
            select: { id: true, status: true, amountPaid: true },
          });
        }
      }
      return { updated, creditedInvoice };
    });

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "UPDATE",
      entityType: "InsuranceClaim",
      entityId: id,
      beforeState: JSON.stringify({ status: existing.status }),
      afterState: JSON.stringify({ status: nextStatus }),
    });

    return NextResponse.json(result);
  } catch (error) {
    logServerError("Update insurance claim error", error);
    return NextResponse.json({ error: "Failed to update claim" }, { status: 500 });
  }
}
