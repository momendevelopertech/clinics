import { describe, expect, it } from "vitest";
import { renderPrescriptionMessage } from "@/lib/communications";

describe("renderPrescriptionMessage", () => {
  const lines = [
    {
      medicationName: "Paracetamol",
      dosage: "500mg",
      frequency: "3x daily",
      duration: "5 days",
      instructions: "after meals",
    },
    {
      medicationName: "Ibuprofen",
      dosage: "200mg",
      frequency: "as needed",
    },
  ];

  it("lists main medication and every structured item", () => {
    const { sms } = renderPrescriptionMessage("Ahmed Ali", "Smile Clinic", lines);
    expect(sms).toContain("Ahmed Ali");
    expect(sms).toContain("Smile Clinic");
    expect(sms).toContain("Paracetamol (500mg) 3x daily for 5 days - after meals");
    expect(sms).toContain("Ibuprofen (200mg) as needed");
  });

  it("handles empty item arrays without crashing", () => {
    expect(renderPrescriptionMessage("P", "C", []).sms).toContain("your prescription from C");
  });
});