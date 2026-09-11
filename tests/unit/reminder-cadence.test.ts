import { describe, expect, it } from "vitest";
import {
  enabledReminderChannels,
  isCadenceDue,
  isQuietHour,
  reminderTag,
} from "@/lib/reminders";
import { parseOrgSettings } from "@/lib/org-settings";

const NOW = new Date("2026-09-11T10:00:00Z");
const hoursFromNow = (h: number) => new Date(NOW.getTime() + h * 3_600_000);

describe("reminder cadence windows", () => {
  it("fires the 24h heads-up inside 23-25h", () => {
    expect(isCadenceDue(hoursFromNow(24), NOW, "24h")).toBe(true);
    expect(isCadenceDue(hoursFromNow(22), NOW, "24h")).toBe(false);
    expect(isCadenceDue(hoursFromNow(26), NOW, "24h")).toBe(false);
    expect(isCadenceDue(hoursFromNow(-1), NOW, "24h")).toBe(false);
  });

  it("fires the 1h last-call inside 50-70 minutes", () => {
    expect(isCadenceDue(hoursFromNow(1), NOW, "1h")).toBe(true);
    expect(isCadenceDue(hoursFromNow(0.5), NOW, "1h")).toBe(false);
    expect(isCadenceDue(hoursFromNow(2), NOW, "1h")).toBe(false);
  });

  it("tags each cadence separately", () => {
    expect(reminderTag("a1", "24h")).not.toBe(reminderTag("a1", "1h"));
    expect(reminderTag("a1", "24h")).toContain("a1");
  });
});

describe("quiet hours", () => {
  const noon = new Date("2026-09-11T12:00:00");
  const night = new Date("2026-09-11T23:30:00");
  it("matches same-day and overnight windows", () => {
    expect(isQuietHour(noon, "22:00", "07:00")).toBe(false);
    expect(isQuietHour(night, "22:00", "07:00")).toBe(true);
    expect(isQuietHour(new Date("2026-09-11T06:30:00"), "22:00", "07:00")).toBe(true);
    expect(isQuietHour(noon, "12:00", "13:00")).toBe(true);
  });

  it("treats missing/invalid bounds as no quiet hours", () => {
    expect(isQuietHour(night, null, null)).toBe(false);
    expect(isQuietHour(night, "25:00", "07:00")).toBe(false);
    expect(isQuietHour(night, "22:00", "22:00")).toBe(false);
  });
});

describe("reminder channel config", () => {
  it("defaults all channels on, honors opt-outs", () => {
    expect(enabledReminderChannels(undefined)).toEqual(["sms", "whatsapp", "email"]);
    expect(enabledReminderChannels({ sms: false })).toEqual(["whatsapp", "email"]);
    expect(enabledReminderChannels({ sms: false, whatsapp: false, email: false })).toEqual([]);
  });

  it("parses reminder config defaults from org settings", () => {
    const s = parseOrgSettings(null);
    expect(s.reminderConfig?.enabled24h).toBe(true);
    expect(s.reminderConfig?.enabled1h).toBe(true);
    expect(s.reminderConfig?.channels).toMatchObject({ sms: true, whatsapp: true, email: true });
    const custom = parseOrgSettings(
      JSON.stringify({ reminderConfig: { enabled1h: false, quietStart: "22:00", quietEnd: "07:00" } }),
    );
    expect(custom.reminderConfig?.enabled1h).toBe(false);
    expect(custom.reminderConfig?.enabled24h).toBe(true);
    expect(custom.reminderConfig?.quietStart).toBe("22:00");
  });
});
