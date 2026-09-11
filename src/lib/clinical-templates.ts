/** Prefills empty SOAP composer fields from a clinical template.
 * Doctor-written content always wins — only blank fields are filled. */

export interface SoapFields {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface SoapTemplate {
  subjective?: string | null;
  objective?: string | null;
  assessment?: string | null;
  plan?: string | null;
}

const KEYS: Array<keyof SoapFields> = ["subjective", "objective", "assessment", "plan"];

export function prefillSoap(current: SoapFields, template: SoapTemplate): SoapFields {
  const out = { ...current };
  for (const key of KEYS) {
    if (!out[key].trim() && template[key]?.trim()) {
      out[key] = template[key]!.trim();
    }
  }
  return out;
}

export function isSoapEmpty(fields: SoapFields): boolean {
  return KEYS.every((key) => !fields[key].trim());
}
