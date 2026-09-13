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
  imaging: "bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-300",
  lab: "bg-accent-blue-bg text-accent-blue-text",
  lab_report: "bg-accent-blue-bg text-accent-blue-text",
  pathology: "bg-pink-100 text-pink-800 dark:bg-pink-500/15 dark:text-pink-300",
  consent: "bg-success-bg text-success-text",
  medical_record: "bg-warning-bg text-warning-text",
  prescription: "bg-accent-blue-bg text-accent-blue-text",
  other: "bg-muted-bg text-muted-foreground",
};

export function getDocumentTypeColor(type: string): string {
  return DOCUMENT_TYPE_COLORS[type] || DOCUMENT_TYPE_COLORS["other"];
}

export function formatTypeLabel(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}