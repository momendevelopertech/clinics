import { describe, expect, it } from "vitest";
import {
  approvedCampaignTemplates,
  renderApprovedCampaignTemplate,
  resolveApprovedCampaignTemplate,
} from "@/lib/communications";

describe("campaign templates", () => {
  it("returns an approved WhatsApp template for post-visit triggers", () => {
    const template = resolveApprovedCampaignTemplate("post_visit", "Follow-up");
    expect(template.key).toBe("post_visit");
    expect(template.channel).toBe("whatsapp");
    expect(template.name).toBe("Follow-up");
    expect(approvedCampaignTemplates.post_visit.body).toContain("{clinicName}");
  });

  it("renders patient and clinic placeholders in message content", () => {
    const rendered = renderApprovedCampaignTemplate(
      "chronic_care",
      "Sara Ali",
      "Al Noor Clinic",
      "Chronic care",
    );
    expect(rendered).toContain("Sara Ali");
    expect(rendered).toContain("Al Noor Clinic");
    expect(rendered).not.toContain("{patientName}");
    expect(rendered).not.toContain("{clinicName}");
  });
});
