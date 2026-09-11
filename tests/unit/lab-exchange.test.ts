import { describe, expect, it } from "vitest";
import { buildDiagnosticRequest, mintExternalRef } from "@/lib/lab-exchange";

const order = {
  id: "o1",
  externalRef: "EXT-1",
  orderType: "lab",
  testName: "CBC",
  priority: "urgent",
  indication: "anemia workup",
  orderedAt: new Date("2026-09-01"),
};
const patient = { id: "p1", firstName: "Sara", lastName: "Ali", mrn: "MRN-1" };

describe("lab exchange", () => {
  it("builds a FHIR-shaped DiagnosticRequest", () => {
    const payload = buildDiagnosticRequest(order, patient, "org1");
    expect(payload.resourceType).toBe("DiagnosticRequest");
    expect(payload.identifier[0].value).toBe("EXT-1");
    expect(payload.code).toMatchObject({ text: "CBC" });
    expect(payload.subject.display).toBe("Sara Ali");
    expect(payload.priority).toBe("urgent");
    expect(payload.category).toBe("laboratory");
  });

  it("maps imaging category and stat priority", () => {
    const payload = buildDiagnosticRequest(
      { ...order, orderType: "imaging", priority: "stat" },
      patient,
      "org1",
    );
    expect(payload.category).toBe("imaging");
    expect(payload.priority).toBe("stat");
  });

  it("mints unique external refs", () => {
    const a = mintExternalRef();
    const b = mintExternalRef();
    expect(a.startsWith("EXT-")).toBe(true);
    expect(a).not.toBe(b);
  });
});
