import { afterEach, describe, expect, it } from "vitest";
import {
  __resetCloudinaryConfigForTests,
  destroyCloudinaryAssetSafe,
  getCloudinaryConfigStatus,
  validateUploadBuffer,
} from "../../src/lib/cloudinary";
import {
  documentCreateSchema,
  folderForPurpose,
  isMimeAllowedForPurpose,
  MAX_UPLOAD_BYTES,
  uploadPurposeSchema,
} from "../../src/lib/validations/uploads";

describe("uploadPurposeSchema", () => {
  it("accepts known purposes", () => {
    expect(uploadPurposeSchema.parse("patient_photo")).toBe("patient_photo");
    expect(uploadPurposeSchema.parse("imaging")).toBe("imaging");
    expect(uploadPurposeSchema.parse("avatar")).toBe("avatar");
  });

  it("rejects unknown purposes", () => {
    expect(uploadPurposeSchema.safeParse("malware").success).toBe(false);
  });
});

describe("isMimeAllowedForPurpose", () => {
  it("allows jpeg for patient photos and rejects pdf", () => {
    expect(isMimeAllowedForPurpose("patient_photo", "image/jpeg")).toBe(true);
    expect(isMimeAllowedForPurpose("patient_photo", "application/pdf")).toBe(
      false,
    );
  });

  it("allows pdf for imaging and documents", () => {
    expect(isMimeAllowedForPurpose("imaging", "application/pdf")).toBe(true);
    expect(isMimeAllowedForPurpose("document", "application/pdf")).toBe(true);
  });
});

describe("folderForPurpose", () => {
  it("scopes folders by organization and purpose", () => {
    expect(folderForPurpose("org_abc-123", "imaging")).toBe(
      "clinics/org_abc-123/imaging",
    );
  });

  it("strips unsafe characters from organization id", () => {
    expect(folderForPurpose("../evil org!", "avatar")).toBe(
      "clinics/evilorg/avatar",
    );
  });
});

describe("validateUploadBuffer", () => {
  it("rejects empty and oversized files", () => {
    expect(
      validateUploadBuffer({
        purpose: "document",
        mimeType: "application/pdf",
        byteLength: 0,
      }).ok,
    ).toBe(false);

    expect(
      validateUploadBuffer({
        purpose: "document",
        mimeType: "application/pdf",
        byteLength: MAX_UPLOAD_BYTES + 1,
      }).ok,
    ).toBe(false);
  });

  it("rejects disallowed mime types", () => {
    const result = validateUploadBuffer({
      purpose: "avatar",
      mimeType: "application/pdf",
      byteLength: 100,
    });
    expect(result.ok).toBe(false);
  });

  it("accepts valid image avatars", () => {
    expect(
      validateUploadBuffer({
        purpose: "avatar",
        mimeType: "image/png",
        byteLength: 2048,
      }),
    ).toEqual({ ok: true });
  });
});

describe("documentCreateSchema", () => {
  it("requires https storage URLs", () => {
    const bad = documentCreateSchema.safeParse({
      patientId: "p1",
      type: "imaging",
      name: "xray.pdf",
      storageKey: "http://insecure.example/xray.pdf",
    });
    expect(bad.success).toBe(false);

    const good = documentCreateSchema.safeParse({
      patientId: "p1",
      type: "imaging",
      name: "xray.pdf",
      storageKey: "https://res.cloudinary.com/demo/image/upload/xray.pdf",
      mimeType: "application/pdf",
    });
    expect(good.success).toBe(true);
  });

  it("rejects unknown document types", () => {
    const result = documentCreateSchema.safeParse({
      patientId: "p1",
      type: "not-a-type",
      name: "a.pdf",
      storageKey: "https://res.cloudinary.com/demo/a.pdf",
    });
    expect(result.success).toBe(false);
  });

  it("rejects client-supplied non-Cloudinary storage URLs", () => {
    const base = {
      patientId: "p1",
      type: "imaging",
      name: "xray.pdf",
    } as const;
    for (const storageKey of [
      "https://storage.example.com/xray.pdf",
      "https://res.cloudinary.com.evil.com/demo/image/upload/xray.pdf",
      "https://res.cloudinary.com/demo/xray.pdf",
      "documents/patient-1/xray.pdf",
    ]) {
      expect(
        documentCreateSchema.safeParse({ ...base, storageKey }).success,
      ).toBe(false);
    }
  });
});

describe("destroyCloudinaryAssetSafe", () => {
  it("skips empty public ids without throwing", async () => {
    await expect(destroyCloudinaryAssetSafe(null)).resolves.toBe(false);
    await expect(destroyCloudinaryAssetSafe("")).resolves.toBe(false);
    await expect(destroyCloudinaryAssetSafe(undefined)).resolves.toBe(false);
  });

  it("fails gracefully when Cloudinary is not configured", async () => {
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;
    __resetCloudinaryConfigForTests();
    await expect(
      destroyCloudinaryAssetSafe("clinics/org/avatar"),
    ).resolves.toBe(false);
  });
});

describe("getCloudinaryConfigStatus", () => {
  const original = {
    name: process.env.CLOUDINARY_CLOUD_NAME,
    key: process.env.CLOUDINARY_API_KEY,
    secret: process.env.CLOUDINARY_API_SECRET,
  };

  afterEach(() => {
    process.env.CLOUDINARY_CLOUD_NAME = original.name;
    process.env.CLOUDINARY_API_KEY = original.key;
    process.env.CLOUDINARY_API_SECRET = original.secret;
    __resetCloudinaryConfigForTests();
  });

  it("reports missing env vars", () => {
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;
    __resetCloudinaryConfigForTests();

    const status = getCloudinaryConfigStatus();
    expect(status.configured).toBe(false);
    if (!status.configured) {
      expect(status.missing).toEqual([
        "CLOUDINARY_CLOUD_NAME",
        "CLOUDINARY_API_KEY",
        "CLOUDINARY_API_SECRET",
      ]);
    }
  });

  it("reports configured when all vars present", () => {
    process.env.CLOUDINARY_CLOUD_NAME = "demo";
    process.env.CLOUDINARY_API_KEY = "key";
    process.env.CLOUDINARY_API_SECRET = "secret";
    __resetCloudinaryConfigForTests();

    expect(getCloudinaryConfigStatus()).toEqual({ configured: true });
  });
});
