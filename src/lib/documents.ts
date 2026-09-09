export interface DocumentItem {
  id: string;
  patientId: string;
  patientName: string;
  name: string;
  type: string;
  storageKey: string;
  mimeType: string | null;
  createdAt: string;
}

export function filterDocuments<T extends DocumentItem>(
  documents: readonly T[],
  query: string,
  typeFilter: string | null | undefined,
): T[] {
  const normalizedQuery = (query ?? "").trim().toLowerCase();
  return documents.filter((document) => {
    const matchesSearch =
      !normalizedQuery ||
      document.patientName.toLowerCase().includes(normalizedQuery) ||
      document.name.toLowerCase().includes(normalizedQuery);

    const matchesType = !typeFilter || document.type === typeFilter;

    return matchesSearch && matchesType;
  });
}

export function isExternalUrl(storageKey: string): boolean {
  return /^https?:\/\//i.test(storageKey);
}

const DOCUMENT_TYPE_COLORS: Record<string, string> = {
  imaging: "bg-purple-100 text-purple-800",
  lab: "bg-blue-100 text-blue-800",
  lab_report: "bg-blue-100 text-blue-800",
  pathology: "bg-pink-100 text-pink-800",
  consent: "bg-green-100 text-green-800",
  medical_record: "bg-orange-100 text-orange-800",
  prescription: "bg-cyan-100 text-cyan-800",
  other: "bg-gray-100 text-gray-800",
};

export function getDocumentTypeColor(type: string): string {
  return DOCUMENT_TYPE_COLORS[type] || DOCUMENT_TYPE_COLORS["other"];
}

export function formatTypeLabel(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}