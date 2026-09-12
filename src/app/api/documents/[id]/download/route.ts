import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { prisma } from "@/lib/prisma";
import { getCloudinaryConfigStatus } from "@/lib/cloudinary";
import { verifyDocumentDownloadToken } from "@/lib/signed-urls";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";

/**
 * GET /api/documents/[id]/download?token=…
 *
 * Explicit access control on top of the provider bucket: the token is an
 * HMAC-signed, expiring capability (see src/lib/signed-urls.ts). This route
 * validates it, then redirects to a 10-minute Cloudinary signed URL (or the
 * stored provider URL when no publicId exists) and records an audit row.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const token = new URL(request.url).searchParams.get("token");
    if (!token) {
      return NextResponse.json({ error: "Missing download token" }, { status: 401 });
    }
    const verified = verifyDocumentDownloadToken(decodeURIComponent(token));
    if (!verified.ok) {
      return NextResponse.json(
        { error: verified.reason === "expired" ? "Download link expired" : "Invalid download link" },
        { status: verified.reason === "expired" ? 410 : 401 },
      );
    }
    if (verified.documentId !== id) {
      return NextResponse.json({ error: "Token does not match document" }, { status: 401 });
    }

    const document = await prisma.document.findFirst({
      where: { id, organizationId: verified.orgId },
      select: { id: true, patientId: true, storageKey: true, publicId: true, organizationId: true },
    });
    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    let targetUrl = document.storageKey;
    if (document.publicId) {
      const status = getCloudinaryConfigStatus();
      if (!status.configured) {
        return NextResponse.json({ error: "File storage is not configured" }, { status: 503 });
      }
      targetUrl = cloudinary.url(document.publicId, {
        secure: true,
        sign_url: true,
        expires_at: Math.floor(Date.now() / 1000) + 600,
      });
    }

    await createAuditLog({
      organizationId: document.organizationId,
      userId: null,
      action: "READ",
      entityType: "Document",
      entityId: document.id,
      actorType: "system",
      afterState: JSON.stringify({ via: "signed-token" }),
    });

    return NextResponse.redirect(targetUrl, 302);
  } catch (error) {
    logServerError("Signed document download failed", error);
    return NextResponse.json({ error: "Failed to open document" }, { status: 500 });
  }
}