import { describe, expect, it } from "vitest";
import { inferResourceType } from "@/lib/cloudinary";

describe("inferResourceType (signed download URLs)", () => {
  it("maps PDFs to raw (matches upload-time resource type)", () => {
    expect(inferResourceType("application/pdf")).toBe("raw");
  });

  it("maps Word documents to raw", () => {
    expect(inferResourceType("application/msword")).toBe("raw");
    expect(
      inferResourceType(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
    ).toBe("raw");
  });

  it("maps images (and unknown/empty) to image", () => {
    expect(inferResourceType("image/jpeg")).toBe("image");
    expect(inferResourceType("image/png")).toBe("image");
    expect(inferResourceType(null)).toBe("image");
    expect(inferResourceType(undefined)).toBe("image");
  });
});
