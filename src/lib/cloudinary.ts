import { v2 as cloudinary } from "cloudinary";
import {
  folderForPurpose,
  isMimeAllowedForPurpose,
  MAX_UPLOAD_BYTES,
  type UploadPurpose,
} from "@/lib/validations/uploads";
import { logServerError } from "@/lib/safe-logger";

export type CloudinaryUploadResult = {
  url: string;
  secureUrl: string;
  publicId: string;
  bytes: number;
  format: string | undefined;
  resourceType: string;
  mimeType: string;
};

export type CloudinaryConfigStatus =
  | { configured: true }
  | { configured: false; missing: string[] };

let configured = false;

export function getCloudinaryConfigStatus(): CloudinaryConfigStatus {
  const missing: string[] = [];
  if (!process.env.CLOUDINARY_CLOUD_NAME?.trim()) missing.push("CLOUDINARY_CLOUD_NAME");
  if (!process.env.CLOUDINARY_API_KEY?.trim()) missing.push("CLOUDINARY_API_KEY");
  if (!process.env.CLOUDINARY_API_SECRET?.trim()) missing.push("CLOUDINARY_API_SECRET");
  if (missing.length) return { configured: false, missing };
  return { configured: true };
}

export function ensureCloudinaryConfigured(): void {
  const status = getCloudinaryConfigStatus();
  if (!status.configured) {
    throw new Error(
      `Cloudinary is not configured. Missing: ${status.missing.join(", ")}`,
    );
  }

  if (!configured) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
  }
}

/** Reset module config flag — used by unit tests only. */
export function __resetCloudinaryConfigForTests(): void {
  configured = false;
}

export function validateUploadBuffer(params: {
  purpose: UploadPurpose;
  mimeType: string;
  byteLength: number;
}): { ok: true } | { ok: false; error: string } {
  if (params.byteLength <= 0) {
    return { ok: false, error: "Empty file" };
  }
  if (params.byteLength > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: `File exceeds maximum size of ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB`,
    };
  }
  if (!isMimeAllowedForPurpose(params.purpose, params.mimeType)) {
    return {
      ok: false,
      error: `MIME type ${params.mimeType} is not allowed for ${params.purpose}`,
    };
  }
  return { ok: true };
}

function dataUriFromBuffer(buffer: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

export async function uploadBufferToCloudinary(params: {
  buffer: Buffer;
  mimeType: string;
  organizationId: string;
  purpose: UploadPurpose;
  fileName?: string;
}): Promise<CloudinaryUploadResult> {
  ensureCloudinaryConfigured();

  const validation = validateUploadBuffer({
    purpose: params.purpose,
    mimeType: params.mimeType,
    byteLength: params.buffer.byteLength,
  });
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const folder = folderForPurpose(params.organizationId, params.purpose);
  const resourceType =
    params.mimeType === "application/pdf" ||
    params.mimeType.includes("word")
      ? "raw"
      : "image";

  const result = await cloudinary.uploader.upload(
    dataUriFromBuffer(params.buffer, params.mimeType),
    {
      folder,
      resource_type: resourceType,
      use_filename: Boolean(params.fileName),
      unique_filename: true,
      overwrite: false,
      filename_override: params.fileName,
    },
  );

  return {
    url: result.url,
    secureUrl: result.secure_url,
    publicId: result.public_id,
    bytes: result.bytes,
    format: result.format,
    resourceType: result.resource_type,
    mimeType: params.mimeType,
  };
}

export async function destroyCloudinaryAsset(
  publicId: string,
  resourceType: "image" | "raw" | "auto" = "image",
): Promise<void> {
  ensureCloudinaryConfigured();
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

/**
 * Best-effort cleanup for replaced/removed assets (avatar/logo rotation).
 * Never throws: a failed cleanup must not fail the user's request — the
 * orphan is logged for later reconciliation.
 */
export async function destroyCloudinaryAssetSafe(
  publicId: string | null | undefined,
  resourceType: "image" | "raw" | "auto" = "image",
): Promise<boolean> {
  if (!publicId) return false;
  try {
    await destroyCloudinaryAsset(publicId, resourceType);
    return true;
  } catch (error) {
    logServerError("Cloudinary asset cleanup failed", error, { publicId });
    return false;
  }
}
