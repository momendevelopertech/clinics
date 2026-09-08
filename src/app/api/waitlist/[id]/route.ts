import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const orgId = await getOrgId();
        const moduleAuthz = await requireModulePermission(orgId, "waitlist");
        if (moduleAuthz.response) return moduleAuthz.response;
        assertOrgScope(orgId);
        const authz = await requireAnyPermission(orgId, [
            { action: "patients:write", resource: "patients" },
            { action: "appointments:write", resource: "appointments" },
        ]);
        if (authz.response) return authz.response;
        const { userId } = authz;

        const { id } = await params;
        const body = await request.json();
        const { status, notes, preferredDate } = body;

        const existing = await prisma.waitlistEntry.findFirst({
            where: { id, organizationId: orgId },
        });
        if (!existing) {
            return NextResponse.json({ error: "Waitlist entry not found" }, { status: 404 });
        }

        const updated = await prisma.waitlistEntry.update({
            where: { id },
            data: {
                ...(status ? { status } : {}),
                ...(notes !== undefined ? { notes } : {}),
                ...(preferredDate ? { preferredDate: new Date(preferredDate) } : {}),
            },
            include: { patient: { select: { firstName: true, lastName: true } } },
        });

        await createAuditLog({
            organizationId: orgId,
            userId,
            action: "UPDATE",
            entityType: "WaitlistEntry",
            entityId: id,
            beforeState: JSON.stringify({ status: existing.status }),
            afterState: JSON.stringify({ status: updated.status }),
        });

        return NextResponse.json({
            id: updated.id,
            patientId: updated.patientId,
            patientName: `${updated.patient.firstName} ${updated.patient.lastName}`,
            status: updated.status,
            notes: updated.notes,
            preferredDate: updated.preferredDate?.toISOString() ?? null,
        });
    } catch (error) {
        logServerError("Error updating waitlist entry", error);
        return NextResponse.json({ error: "Failed to update waitlist entry" }, { status: 500 });
    }
}
