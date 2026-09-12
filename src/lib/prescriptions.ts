/**
 * Prescription drafting helpers (pure). Shared by "Repeat last Rx" (patient
 * timeline) and "Clone" (print/list) so neither duplicates the reconstruction
 * logic. Input is the Prisma prescription shape (top-level main med + items[]);
 * output is the dialog's flat medication-line list.
 */

export type RxMedLine = {
  medicationName: string;
  dosage?: string | null;
  frequency?: string | null;
  duration?: string | null;
  instructions?: string | null;
};

export type PrescriptionLike = RxMedLine & {
  items?: Array<RxMedLine & { id?: string }>;
};

/**
 * Rebuilds the dialog lines from an existing prescription. The top-level
 * fields always form the first line; any PrescriptionItem rows (additional
 * meds) follow — so the draft round-trips exactly what was originally written.
 * Immutability: the draft is a brand-new object; nothing touches the source.
 */
export function buildPrescriptionDraftFromExisting(
  rx: PrescriptionLike | null | undefined,
): RxMedLine[] {
  if (!rx) return [{ medicationName: "" }];

  const main: RxMedLine = {
    medicationName: rx.medicationName ?? "",
    dosage: rx.dosage ?? null,
    frequency: rx.frequency ?? null,
    duration: rx.duration ?? null,
    instructions: rx.instructions ?? null,
  };

  const items = Array.isArray(rx.items)
    ? rx.items.map((item) => ({
        medicationName: item.medicationName ?? "",
        dosage: item.dosage ?? null,
        frequency: item.frequency ?? null,
        duration: item.duration ?? null,
        instructions: item.instructions ?? null,
      }))
    : [];

  return items.length ? [main, ...items] : [main];
}

/**
 * Flattens a draft back to the two-part shape the POST route expects:
 * the first line becomes the top-level fields and the rest become items[].
 */
export function splitDraftIntoPrescriptionPayload(lines: RxMedLine[]) {
  const filled = lines.filter((line) => line.medicationName.trim().length > 0);
  const [main, ...items] = filled;

  return {
    medicationName: main?.medicationName ?? "",
    dosage: main?.dosage || null,
    frequency: main?.frequency || null,
    duration: main?.duration || null,
    instructions: main?.instructions || null,
    items: items.map((line) => ({
      medicationName: line.medicationName,
      dosage: line.dosage || null,
      frequency: line.frequency || null,
      duration: line.duration || null,
      instructions: line.instructions || null,
    })),
  };
}