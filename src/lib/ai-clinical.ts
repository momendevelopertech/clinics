/**
 * Pure clinical-AI helpers: prompt builders and response parsers are kept
 * deterministic and unit-tested so the AI surface degrades gracefully when
 * the provider is unconfigured.
 */

export type SoapNote = {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
};

export const EMPTY_SOAP: SoapNote = {
  subjective: "",
  objective: "",
  assessment: "",
  plan: "",
};

export function buildScribePrompt(transcript: string): string {
  return [
    "You are a clinical scribe. Convert the following raw clinical dictation into a",
    "structured SOAP note. Respond with ONLY JSON matching:",
    '{"subjective": "...", "objective": "...", "assessment": "...", "plan": "..."}',
    "Use the original language of the dictation, keep phrases clinically sober,",
    "do not invent findings not supported by the text.",
    "",
    "DICTATION:",
    transcript.trim(),
  ].join("\n");
}

function stripCodeFence(text: string): string {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text.trim());
  return (fenced?.[1] ?? text.trim()).trim();
}

function extractJsonObject(text: string): Record<string, string> | null {
  const candidate = stripCodeFence(text);
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(candidate.slice(start, end + 1)) as Record<string, string>;
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

function extractByHeaders(text: string): SoapNote {
  const result: SoapNote = { ...EMPTY_SOAP };
  const sections: Array<[keyof SoapNote, RegExp]> = [
    ["subjective", /subjective\s*:([\s\S]*?)(?=\n\s*(?:objective|assessment|plan)\s*:)/i],
    ["objective", /objective\s*:([\s\S]*?)(?=\n\s*(?:assessment|plan|subjective)\s*:)/i],
    ["assessment", /assessment\s*:([\s\S]*?)(?=\n\s*(?:plan|subjective|objective)\s*:)/i],
    ["plan", /plan\s*:([\s\S]*)$/i],
  ];
  for (const [key, pattern] of sections) {
    const match = pattern.exec(text);
    if (match?.[1]) {
      result[key] = match[1].trim();
    }
  }
  return result;
}

export function parseScribeResponse(text: string): SoapNote {
  const json = extractJsonObject(text);
  if (json) {
    return {
      subjective: String(json.subjective ?? "").trim(),
      objective: String(json.objective ?? "").trim(),
      assessment: String(json.assessment ?? "").trim(),
      plan: String(json.plan ?? "").trim(),
    };
  }
  return extractByHeaders(text);
}

// ---------- deterministic (non-AI) structured visit summary ----------

export type VisitSummaryData = {
  patientName: string;
  reason?: string | null;
  startTime?: Date | string | null;
  vitals?: {
    temperature?: number | null;
    bloodPressureSystolic?: number | null;
    bloodPressureDiastolic?: number | null;
    heartRate?: number | null;
    spO2?: number | null;
  } | null;
  diagnoses?: string[];
  medications?: string[];
  notes?: string | null;
};

export function buildStructuredVisitSummary(data: VisitSummaryData): string {
  const lines: string[] = [];
  const date = data.startTime
    ? new Date(data.startTime).toLocaleString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
  lines.push(`Visit: ${data.patientName} (${date})`);
  if (data.reason) lines.push(`Reason: ${data.reason}`);

  const v = data.vitals;
  if (v) {
    const vitals = [
      v.temperature ? `Temp ${v.temperature}°C` : null,
      v.bloodPressureSystolic && v.bloodPressureDiastolic
        ? `BP ${v.bloodPressureSystolic}/${v.bloodPressureDiastolic}`
        : null,
      v.heartRate ? `HR ${v.heartRate}` : null,
      v.spO2 ? `SpO2 ${v.spO2}%` : null,
    ].filter(Boolean);
    if (vitals.length) lines.push(`Vitals: ${vitals.join(", ")}`);
  }

  if (data.diagnoses?.length) {
    lines.push(`Diagnoses: ${data.diagnoses.join(", ")}`);
  }
  if (data.medications?.length) {
    lines.push(`Medications: ${data.medications.join(", ")}`);
  }
  if (data.notes) {
    lines.push(`Notes: ${data.notes}`);
  }
  return lines.join("\n") || "No clinical data for this visit.";
}

export function buildSummaryPrompt(input: {
  patientName: string;
  structured: string;
}): string {
  return [
    `Summarize this clinic visit for ${input.patientName} in 2–3 tight, informative`,
    "sentences for a patient-readable handoff. Do not add facts beyond the input.",
    "",
    input.structured,
  ].join("\n");
}