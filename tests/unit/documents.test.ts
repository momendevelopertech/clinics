import { describe, expect, it } from "vitest";
import {
  filterDocuments,
  isExternalUrl,
  formatTypeLabel,
  getDocumentTypeColor,
  type DocumentItem,
} from "@/lib/documents";

const document = (overrides: Partial<DocumentItem>): DocumentItem => ({
  id: "doc-1",
  patientId: "pat-1",
  patientName: "Ahmed Hassan",
  name: "chest-xray.pdf",
  type: "imaging",
  storageKey: "https://storage.example.com/xray.pdf",
  mimeType: "application/pdf",
  createdAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const docs: DocumentItem[] = [
  document({ id: "1", patientName: "Ahmed Hassan", name: "chest-xray.pdf", type: "imaging" }),
  document({ id: "2", patientName: "Sara Ali", name: "cbc-lab-result.pdf", type: "lab_report" }),
  document({ id: "3", patientName: "Ahmed Hassan", name: "consent-form.pdf", type: "consent" }),
];

describe("filterDocuments", () => {
  it("returns everything without a query or filter", () => {
    expect(filterDocuments(docs, "", null)).toHaveLength(docs.length);
  });

  it("searches by patient name case-insensitively", () => {
    expect(filterDocuments(docs, "sara", null)).toHaveLength(1);
    expect(filterDocuments(docs, "ahmed", null)).toHaveLength(2);
  });

  it("searches by file name", () => {
    expect(filterDocuments(docs, "cbc", null)).toHaveLength(1);
    expect(filterDocuments(docs, "consent", null)).toHaveLength(1);
  });

  it("trims and ignores empty queries", () => {
    expect(filterDocuments(docs, "   ", null)).toHaveLength(docs.length);
  });

  it("filters by document type", () => {
    const result = filterDocuments(docs, "", "consent");
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("consent");
  });

  it("combines search and type filter", () => {
    const result = filterDocuments(docs, "ahmed", "imaging");
    expect(result.map((d) => d.id)).toEqual(["1"]);
  });
});

describe("isExternalUrl", () => {
  it("accepts http and https URLs", () => {
    expect(isExternalUrl("https://cdn.example.com/a.pdf")).toBe(true);
    expect(isExternalUrl("http://cdn.example.com/a.pdf")).toBe(true);
  });

  it("rejects plain storage keys and invalid values", () => {
    expect(isExternalUrl("uploads/a.pdf")).toBe(false);
    expect(isExternalUrl("s3://bucket/a.pdf")).toBe(false);
    expect(isExternalUrl("")).toBe(false);
  });
});

describe("formatTypeLabel", () => {
  it("formats snake_case labels to title case", () => {
    expect(formatTypeLabel("lab_report")).toBe("Lab Report");
    expect(formatTypeLabel("medical_record")).toBe("Medical Record");
    expect(formatTypeLabel("imaging")).toBe("Imaging");
  });
});

describe("getDocumentTypeColor", () => {
  it("maps known types and falls back to other", () => {
    expect(getDocumentTypeColor("imaging")).toBe("bg-purple-100 text-purple-800");
    expect(getDocumentTypeColor("unknown_type")).toBe("bg-gray-100 text-gray-800");
  });
});