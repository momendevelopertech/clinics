import { describe, expect, it } from "vitest";
import {
  buildPrescriptionDraftFromExisting,
  buildFavoriteSeeds,
  splitDraftIntoPrescriptionPayload,
} from "@/lib/prescriptions";

describe("buildPrescriptionDraftFromExisting", () => {
  it("reconstructs the main line and additional items from an Rx", () => {
    const draft = buildPrescriptionDraftFromExisting({
      medicationName: "Amoxicillin",
      dosage: "500mg",
      frequency: "3x/day",
      duration: "7 days",
      instructions: "After meals",
      items: [
        { id: "i1", medicationName: "Paracetamol", dosage: "1000mg", frequency: "1-0-1" },
        { id: "i2", medicationName: "Omeprazole", duration: "4 weeks" },
      ],
    });

    expect(draft).toHaveLength(3);
    expect(draft[0]).toEqual({
      medicationName: "Amoxicillin",
      dosage: "500mg",
      frequency: "3x/day",
      duration: "7 days",
      instructions: "After meals",
    });
    expect(draft[1]).toEqual({
      medicationName: "Paracetamol",
      dosage: "1000mg",
      frequency: "1-0-1",
      duration: null,
      instructions: null,
    });
    expect(draft[2]).toEqual({
      medicationName: "Omeprazole",
      dosage: null,
      frequency: null,
      duration: "4 weeks",
      instructions: null,
    });
  });

  it("returns a single-line draft when the Rx has no items", () => {
    const draft = buildPrescriptionDraftFromExisting({
      medicationName: "Aspirin",
      dosage: "75mg",
    });

    expect(draft).toHaveLength(1);
    expect(draft[0]).toEqual({
      medicationName: "Aspirin",
      dosage: "75mg",
      frequency: null,
      duration: null,
      instructions: null,
    });
  });

  it("never mutates the source prescription (immutability invariant)", () => {
    const source = {
      medicationName: "X",
      dosage: "1",
      frequency: "2x/day",
      items: [{ medicationName: "Y", dosage: "2" }],
    };
    const draft = buildPrescriptionDraftFromExisting(source);

    draft[0].dosage = "CHANGED";
    draft[1].medicationName = "Z";

    expect(source.dosage).toBe("1");
    expect(source.frequency).toBe("2x/day");
    expect(source.items[0].medicationName).toBe("Y");
  });

  it("handles null/undefined inputs gracefully", () => {
    expect(buildPrescriptionDraftFromExisting(null)).toEqual([{ medicationName: "" }]);
    expect(buildPrescriptionDraftFromExisting(undefined)).toEqual([{ medicationName: "" }]);
  });
});

describe("buildFavoriteSeeds", () => {
  it("collects main + item medications, deduped by normalized name", () => {
    const seeds = buildFavoriteSeeds(
      { medicationName: "Amoxicillin", dosage: "500mg", frequency: "3x/day", duration: "7 days" },
      [
        { medicationName: "Paracetamol", dosage: "1000mg" },
        { medicationName: "  paracetamol", dosage: "500mg" }, // duplicate (case + whitespace insensitive)
        { medicationName: "Omeprazole", dosage: "20mg" },
      ],
    );

    expect(seeds.map((s) => s.medicationName)).toEqual([
      "Amoxicillin",
      "Paracetamol",
      "Omeprazole",
    ]);
    expect(seeds[1]).toEqual({
      medicationName: "Paracetamol",
      dosage: "1000mg",
      frequency: null,
      duration: null,
    });
  });

  it("skips empty medication names and returns an empty list", () => {
    expect(buildFavoriteSeeds({ medicationName: "   " }, [])).toEqual([]);
    expect(
      buildFavoriteSeeds(
        { medicationName: "Metformin", dosage: "500mg" },
        [{ medicationName: "" }, { medicationName: "   " }],
      ),
    ).toEqual([{ medicationName: "Metformin", dosage: "500mg", frequency: null, duration: null }]);
  });
});

describe("splitDraftIntoPrescriptionPayload", () => {
  it("maps the first line to top-level fields and the rest to items, dropping empties", () => {
    const payload = splitDraftIntoPrescriptionPayload([
      { medicationName: "Metformin", dosage: "500mg" },
      { medicationName: "" },
      { medicationName: "Glibenclamide", dosage: "5mg", frequency: "2x/day" },
    ]);

    expect(payload).toEqual({
      medicationName: "Metformin",
      dosage: "500mg",
      frequency: null,
      duration: null,
      instructions: null,
      items: [
        {
          medicationName: "Glibenclamide",
          dosage: "5mg",
          frequency: "2x/day",
          duration: null,
          instructions: null,
        },
      ],
    });
  });

  it("handles an empty draft without crashing", () => {
    const payload = splitDraftIntoPrescriptionPayload([{ medicationName: "" }]);
    expect(payload.medicationName).toBe("");
    expect(payload.items).toEqual([]);
  });
});