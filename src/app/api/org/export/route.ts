import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgContext } from "@/lib/org";
import { requireOwner } from "@/lib/roles";
import { logServerError } from "@/lib/safe-logger";
import { buildOrgSnapshot } from "@/lib/org-export";

/**
 * GET /api/org/export — Owner-only JSON backup snapshot of the organization's
 * clinical + billing data (capped per table, sha256 integrity checksum).
 * Binary blobs are never embedded (documents travel as metadata URLs).
 * Automated live-DB restore is intentionally NOT offered here — restores run
 * from database-level backups (Neon PITR); this export is portability +
 * disaster-review material. Audited per download.
 */
export async function GET() {
  try {
    const ctx = await requireOrgContext().catch(() => null);
    if (!ctx) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const owner = await requireOwner({ json: true });
    if (!owner.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const snapshot = await buildOrgSnapshot(
      prisma as unknown as Parameters<typeof buildOrgSnapshot>[0],
      ctx.organizationId,
    );
    await prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        action: "EXPORT",
        entityType: "Organization",
        entityId: ctx.organizationId,
        afterState: JSON.stringify({ counts: snapshot.counts, sha256: snapshot.sha256 }),
      },
    });
    return NextResponse.json(snapshot);
  } catch (error) {
    logServerError("Org export failed", error);
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
  }
}
