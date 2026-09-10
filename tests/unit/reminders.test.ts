import { describe, expect, it } from "vitest";
import { renderAppointmentReminder } from "@/lib/communications";

describe("renderAppointmentReminder", () => {
  it("renders sms, whatsapp, and email bodies with provider and time", () => {
    const messages = renderAppointmentReminder(
      "Mona",
      new Date(2026, 8, 8, 10, 0),
      "Dr. Ahmed",
    );
    for (const body of [messages.sms, messages.whatsapp, messages.email]) {
      expect(body).toContain("Mona");
      expect(body).toContain("Dr. Ahmed");
    }
    // WhatsApp is plain text like SMS (no HTML).
    expect(messages.whatsapp).not.toContain("<");
    expect(messages.email).toContain("<h2>");
  });
});
