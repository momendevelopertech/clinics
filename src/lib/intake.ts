/** Server-side intake answer validation (pure). */

export interface IntakeFieldLike {
  key: string;
  required: boolean;
}

/** Every required field must be present and non-blank. */
export function missingRequiredAnswers(
  fields: IntakeFieldLike[],
  answers: Record<string, unknown>,
): string[] {
  return fields
    .filter((f) => f.required)
    .filter((f) => {
      const v = answers[f.key];
      return v === undefined || v === null || String(v).trim() === "";
    })
    .map((f) => f.key);
}

export function slugifyFieldKey(label: string, fallback: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || fallback;
}
