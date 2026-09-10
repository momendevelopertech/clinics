import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import { consentUpdateSchema } from "@/lib/validations/ops";

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const orgId = await getOrgId();
        assertOrgScope(orgId);
        const moduleAuthz = await requireModulePermission(orgId, "consents");
        if (moduleAuthz.response) return moduleAuthz.response;
        const authz = await requireAnyPermission(orgId, [
            { action: "patients:write", resource: "patients" },
        ]);
        if (authz.response) return authz.response;
        const { userId } = authz;

        const { id } = await params;
        const parsed = consentUpdateSchema.safeParse(await request.json().catch(() => ({})));
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid consent update", details: parsed.error.flatten() },
                { status: 400 },
            );
        }
        const { consentType, isGranted, signedAt, documentUrl } = parsed.data;

        const existing = await prisma.consent.findFirst({
            where: { id, organizationId: orgId },
        });
        if (!existing) {
            return NextResponse.json({ error: "Consent not found" }, { status: 404 });
        }

        const updated = await prisma.consent.update({
            where: { id },
            data: {
                ...(consentType ? { consentType } : {}),
                ...(isGranted !== undefined ? { isGranted } : {}),
                ...(signedAt ? { signedAt: new Date(signedAt) } : {}),
                ...(documentUrl !== undefined ? { documentUrl } : {}),
            },
            include: { patient: { select: { firstName: true, lastName: true } } },
        });

        await createAuditLog({
            organizationId: orgId,
            userId,
            action: "UPDATE",
            entityType: "Consent",
            entityId: id,
            beforeState: JSON.stringify({ isGranted: existing.isGranted }),
            afterState: JSON.stringify({ isGranted: updated.isGranted }),
        });

        return NextResponse.json({
            id: updated.id,
            patientId: updated.patientId,
            patientName: `${updated.patient.firstName} ${updated.patient.lastName}`,
            consentType: updated.consentType,
            isGranted: updated.isGranted,
            signedAt: updated.signedAt?.toISOString() ?? null,
        });
    } catch (error) {
        logServerError("Error updating consent", error);
        return NextResponse.json({ error: "Failed to update consent" }, { status: 500 });
    }
}
