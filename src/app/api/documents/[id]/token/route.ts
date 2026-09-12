import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgId, assertOrgScope } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { requireModulePermission } from "@/lib/permissions";
import { mintDocumentDownloadToken } from "@/lib/signed-urls";
import { logServerError } from "@/lib/safe-logger";

/**
 * GET /api/documents/[id]/token — issues a short-lived signed download link
 * for the document. The raw provider storage URL is never handed to callers;
 * viewers must hold this bearer-style token (see /download).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const orgId = await getOrgId();
    assertOrgScope(orgId);
    const moduleAuthz = await requireModulePermission(orgId, "documents");
    if (moduleAuthz.response) return moduleAuthz.response;
    const authz = await requireAnyPermission(orgId, [
      { action: "patients:read", resource: "patients" },
    ]);
    if (authz.response) return authz.response;

    const { id } = await params;
    const document = await prisma.document.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true },
    });
    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const token = mintDocumentDownloadToken({ orgId, documentId: id });
    return NextResponse.json({
      downloadUrl: `/api/documents/${id}/download?token=${encodeURIComponent(token)}`,
      expiresInSeconds: Number(process.env.DOCUMENT_TOKEN_TTL_MS ?? 300) / 1000,
    });
  } catch (error) {
    logServerError("Failed to mint document token", error);
    return NextResponse.json({ error: "Failed to mint document token" }, { status: 500 });
  }
}