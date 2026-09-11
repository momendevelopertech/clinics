import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import {
  insuranceClaimSchema,
} from "@/lib/validations/billing";

/** List claims, optionally filtered by patient or status. */
export async function GET(request: Request) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "billing");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(orgId, [
      { action: "billing:read", resource: "billing" },
    ]);
    if (authz.response) return authz.response;

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");
    const status = searchParams.get("status");
    const claims = await prisma.insuranceClaim.findMany({
      where: {
        organizationId: orgId,
        ...(patientId ? { patientId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        invoice: { select: { invoiceNumber: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ claims });
  } catch (error) {
    logServerError("List insurance claims error", error);
    return NextResponse.json({ error: "Failed to fetch claims" }, { status: 500 });
  }
}

/** File a claim against a patient invoice. */
export async function POST(request: Request) {
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

    const parsed = insuranceClaimSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid claim", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const patient = await prisma.patient.findFirst({
      where: { id: parsed.data.patientId, organizationId: orgId },
      select: { id: true },
    });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    let invoiceId: string | null = null;
    if (parsed.data.invoiceId) {
      const invoice = await prisma.invoice.findFirst({
        where: { id: parsed.data.invoiceId, organizationId: orgId, patientId: patient.id },
        select: { id: true },
      });
      if (!invoice) {
        return NextResponse.json({ error: "Invoice not found for patient" }, { status: 404 });
      }
      invoiceId = invoice.id;
    }

    const claim = await prisma.insuranceClaim.create({
      data: {
        organizationId: orgId,
        patientId: patient.id,
        invoiceId,
        amountClaimed: parsed.data.amountClaimed,
        status: "submitted",
        submittedAt: new Date(),
      },
    });

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "CREATE",
      entityType: "InsuranceClaim",
      entityId: claim.id,
      afterState: JSON.stringify({
        patientId: patient.id,
        invoiceId,
        amountClaimed: parsed.data.amountClaimed,
      }),
    });

    return NextResponse.json(claim, { status: 201 });
  } catch (error) {
    logServerError("Create insurance claim error", error);
    return NextResponse.json({ error: "Failed to file claim" }, { status: 500 });
  }
}
