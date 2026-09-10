import { NextResponse } from "next/server";
import { getOrgId, assertOrgScope, isAuthContextError, requireOrgContext } from "@/lib/org";
import { requireAnyPermission } from "@/lib/authorization";
import { createAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-logger";
import {
  getCloudinaryConfigStatus,
  uploadBufferToCloudinary,
} from "@/lib/cloudinary";
import {
  MAX_UPLOAD_BYTES,
  uploadPurposeSchema,
} from "@/lib/validations/uploads";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const config = getCloudinaryConfigStatus();
    if (!config.configured) {
      return NextResponse.json(
        {
          error: "File upload is not configured",
          missing: config.missing,
        },
        { status: 503 },
      );
    }

    const orgId = await getOrgId();
    assertOrgScope(orgId);

    const form = await request.formData();
    const file = form.get("file");
    const purposeRaw = form.get("purpose");
    const purposeParsed = uploadPurposeSchema.safeParse(
      typeof purposeRaw === "string" ? purposeRaw : undefined,
    );
    if (!purposeParsed.success) {
      return NextResponse.json({ error: "Invalid upload purpose" }, { status: 400 });
    }
    const purpose = purposeParsed.data;

    // Avatars are self-service: any authenticated staff member may upload
    // their own photo. All other purposes touch patient/clinic data and
    // require patients:write.
    let userId: string;
    if (purpose === "avatar") {
      ({ userId } = await requireOrgContext());
    } else {
      const authz = await requireAnyPermission(orgId, [
        { action: "patients:write", resource: "patients" },
      ]);
      if (authz.response) return authz.response;
      userId = authz.userId;
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `File exceeds ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB limit` },
        { status: 400 },
      );
    }

    const mimeType = file.type || "application/octet-stream";
    const buffer = Buffer.from(await file.arrayBuffer());

    const uploaded = await uploadBufferToCloudinary({
      buffer,
      mimeType,
      organizationId: orgId,
      purpose,
      fileName: file.name,
    });

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: "CREATE",
      entityType: "CloudinaryUpload",
      entityId: uploaded.publicId,
      afterState: JSON.stringify({
        purpose,
        bytes: uploaded.bytes,
        mimeType: uploaded.mimeType,
        resourceType: uploaded.resourceType,
      }),
    });

    return NextResponse.json(
      {
        url: uploaded.secureUrl,
        publicId: uploaded.publicId,
        bytes: uploaded.bytes,
        mimeType: uploaded.mimeType,
        format: uploaded.format,
        resourceType: uploaded.resourceType,
        purpose,
      },
      { status: 201 },
    );
  } catch (error) {
    if (isAuthContextError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Upload failed";
    if (
      message.includes("not allowed") ||
      message.includes("maximum size") ||
      message.includes("Empty file")
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    logServerError("Cloudinary upload failed", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
