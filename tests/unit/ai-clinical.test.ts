import { describe, expect, it } from "vitest";
import {
  buildScribePrompt,
  parseScribeResponse,
  buildStructuredVisitSummary,
  buildSummaryPrompt,
  EMPTY_SOAP,
} from "@/lib/ai-clinical";

describe("buildScribePrompt", () => {
  it("embeds the transcript and demands a SOAP JSON schema", () => {
    const prompt = buildScribePrompt("Cough for 5 days, no fever");
    expect(prompt).toContain("Cough for 5 days, no fever");
    expect(prompt).toContain('"subjective"');
    expect(prompt).toContain('"plan"');
  });
});

describe("parseScribeResponse", () => {
  it("parses a plain JSON object", () => {
    const soap = parseScribeResponse(
      '{"subjective":"A","objective":"B","assessment":"C","plan":"D"}',
    );
    expect(soap).toEqual({ subjective: "A", objective: "B", assessment: "C", plan: "D" });
  });

  it("parses JSON wrapped in a code fence", () => {
    const soap = parseScribeResponse(
      '```json\n{"subjective":"S","objective":"O","assessment":"A","plan":"P"}\n```',
    );
    expect(soap).toEqual({ subjective: "S", objective: "O", assessment: "A", plan: "P" });
  });

  it("falls back to header-style text when JSON is not present", () => {
    const soap = parseScribeResponse(
      "Subjective: Feels tired\nObjective: normal\nAssessment: flu\nPlan: rest",
    );
    expect(soap.subjective).toContain("Feels tired");
    expect(soap.plan).toBe("rest");
  });

  it("returns an empty SOAP for empty input", () => {
    expect(parseScribeResponse("")).toEqual(EMPTY_SOAP);
  });
});

describe("buildStructuredVisitSummary", () => {
  it("renders a visit summary with vitals, diagnoses and meds", () => {
    const summary = buildStructuredVisitSummary({
      patientName: "Anna Smith",
      reason: "Cough",
      startTime: new Date("2026-09-12T09:30:00"),
      vitals: {
        temperature: 37.8,
        bloodPressureSystolic: 120,
        bloodPressureDiastolic: 80,
        heartRate: 76,
        spO2: 98,
      },
      diagnoses: ["Acute bronchitis"],
      medications: ["Amoxicillin 500mg"],
    });
    expect(summary).toContain("Anna Smith");
    expect(summary).toContain("BP 120/80");
    expect(summary).toContain("HR 76");
    expect(summary).toContain("SpO2 98%");
    expect(summary).toContain("Acute bronchitis");
    expect(summary).toContain("Amoxicillin 500mg");
  });

  it("handles a visit with no vitals by omitting sections", () => {
    const summary = buildStructuredVisitSummary({ patientName: "Anna Smith" });
    expect(summary).toContain("Anna Smith");
    expect(summary).not.toContain("Vitals:");
    expect(summary).not.toContain("Diagnoses:");
  });
});

describe("buildSummaryPrompt", () => {
  it("wraps the structured summary in a patient-readable framing", () => {
    const prompt = buildSummaryPrompt({ patientName: "Bob", structured: "Visit: Bob" });
    expect(prompt).toContain("Bob");
    expect(prompt).toContain("Visit: Bob");
  });
});