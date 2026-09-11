import { z } from "zod";

/** Max upload size (bytes). Keep in sync with Cloudinary free/paid plan limits. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export const UPLOAD_PURPOSES = [
  "patient_photo",
  "document",
  "imaging",
  "lab_report",
  "avatar",
  "clinic_logo",
] as const;

export type UploadPurpose = (typeof UPLOAD_PURPOSES)[number];

export const ALLOWED_MIME_BY_PURPOSE: Record<UploadPurpose, readonly string[]> = {
  patient_photo: ["image/jpeg", "image/png", "image/webp"],
  avatar: ["image/jpeg", "image/png", "image/webp"],
  clinic_logo: ["image/jpeg", "image/png", "image/webp", "image/svg+xml"],
  imaging: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  lab_report: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  document: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
};

/**
 * Storage keys persisted for documents must be server-issued Cloudinary
 * delivery URLs — never client-supplied paths. All uploads flow through
 * POST /api/uploads, which returns `secure_url`; the upload dialog posts
 * that URL back here. Enforce the Cloudinary delivery shape
 * (`https://res.cloudinary.com/.../upload/...`) so arbitrary external URLs
 * (open-redirect / XSS vectors) are rejected.
 */
export function isServerIssuedStorageUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return (
    parsed.protocol === "https:" &&
    parsed.hostname === "res.cloudinary.com" &&
    parsed.pathname.includes("/upload/")
  );
}

export const uploadPurposeSchema = z.enum(UPLOAD_PURPOSES);

export const documentCreateSchema = z.object({
  patientId: z.string().min(1),
  type: z.enum([
    "imaging",
    "lab",
    "lab_report",
    "pathology",
    "consent",
    "medical_record",
    "prescription",
    "referral",
    "medical_report",
    "lab_request",
    "imaging_request",
    "discharge_summary",
    "sick_leave",
    "treatment_plan",
    "other",
  ]),
  name: z.string().trim().min(1).max(255),
  storageKey: z
    .string()
    .url()
    .refine(
      isServerIssuedStorageUrl,
      "Document URL must be a server-issued Cloudinary URL",
    ),
  mimeType: z.string().max(120).optional().nullable(),
  procedureOrderId: z.string().min(1).optional().nullable(),
  publicId: z.string().max(500).optional().nullable(),
});

export type DocumentCreateInput = z.infer<typeof documentCreateSchema>;

export const documentTemplateSchema = z.enum([
  "referral",
  "medical_report",
  "lab_request",
  "imaging_request",
  "discharge_summary",
  "sick_leave",
  "treatment_plan",
]);

export const documentGenerateSchema = z.object({
  template: documentTemplateSchema,
  patientId: z.string().min(1),
  encounterId: z.string().min(1).optional().nullable(),
  labOrderId: z.string().min(1).optional().nullable(),
  planId: z.string().min(1).optional().nullable(),
  fields: z.record(z.string(), z.string().max(2000)).optional().nullable(),
});

export function isMimeAllowedForPurpose(
  purpose: UploadPurpose,
  mimeType: string,
): boolean {
  const allowed = ALLOWED_MIME_BY_PURPOSE[purpose];
  return allowed.includes(mimeType);
}

export function folderForPurpose(
  organizationId: string,
  purpose: UploadPurpose,
): string {
  const safeOrg = organizationId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "org";
  return `clinics/${safeOrg}/${purpose}`;
}
