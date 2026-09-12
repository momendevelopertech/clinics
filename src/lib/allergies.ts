/** Med-aspect allergy screening (pure). */

export interface AllergyLike {
  allergen: string;
  severity?: string | null;
  reaction?: string | null;
  active?: boolean;
}

export interface MedAllergyWarning {
  allergen: string;
  severity: string | null;
  reaction: string | null;
}

/**
 * Returns active allergies that clash with the proposed medication name.
 * Matching is exact (case-insensitive) or full-token containment — e.g. an
 * "Amoxicillin" prescription trips an "amoxicillin" allergy. Cross-class
 * cross-reactivity (penicillin -> cephalosporins) needs a real drug
 * knowledge base and is intentionally out of scope here.
 */
export function findMedicationAllergyWarnings(
  allergies: AllergyLike[],
  medicationName: string,
): MedAllergyWarning[] {
  const target = medicationName.trim().toLowerCase();
  if (!target) return [];

  return allergies
    .filter((a) => a.active !== false)
    .filter((a) => {
      const allergen = a.allergen.trim().toLowerCase();
      if (!allergen) return false;
      return (
        allergen === target ||
        target.startsWith(`${allergen} `) ||
        target.includes(allergen) ||
        allergen.includes(target)
      );
    })
    .map((a) => ({
      allergen: a.allergen,
      severity: a.severity ?? null,
      reaction: a.reaction ?? null,
    }));
}