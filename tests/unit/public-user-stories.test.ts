import { describe, expect, it } from "vitest";
import { en } from "@/lib/i18n/dictionaries/en";
import { ar } from "@/lib/i18n/dictionaries/ar";
import { ROLES_GUIDE } from "@/lib/roles-guide-data";
import {
  PUBLIC_EXCLUDED_ROLE_IDS,
  containsTechnicalLeak,
  parseEntitlementsResponse,
  sanitizeHumanText,
  toPublicStories,
} from "@/lib/user-stories-public";

function routeLabel(route: string, lang: "ar" | "en"): string {
  const dict = lang === "ar" ? ar : en;
  const value = (dict as Record<string, string>)[`nav_${route}`];
  return typeof value === "string" && value.length > 0 ? value : route;
}

describe("containsTechnicalLeak", () => {
  it("flags backend jargon and accepts human language", () => {
    const leaks = [
      "Opens /plan via GET /api/plan/entitlements.",
      "Clicks Save, firing PATCH /api/settings.",
      "See src/app/(dashboard)/dashboard/page.tsx.",
      "Checked by requireOwner then Zod.",
      "Button staff_assignRole opens the dialog.",
      "Payload {userId, roleId} is sent.",
      "Fails with 403 and toast settings_saved.",
      "PlanDashboard loads the data.",
      "Response …/override confirmed.",
    ];
    for (const text of leaks) {
      expect(containsTechnicalLeak(text), text).toBe(true);
    }
    const clean = [
      "Opens the Settings page and picks a section.",
      "يفتح صفحة الإعدادات ويختار القسم.",
      "The price list updates immediately.",
      "يتحدث الجدول فورًا بعد الحفظ.",
    ];
    for (const text of clean) {
      expect(containsTechnicalLeak(text), text).toBe(false);
    }
  });
});

describe("sanitizeHumanText", () => {
  it("removes the reported GET /api/plan/entitlements case", () => {
    const out = sanitizeHumanText(
      "Opens /plan to see the current plan and entitlements (PlanDashboard via GET /api/plan/entitlements).",
      "en",
      routeLabel,
    );
    expect(out).not.toContain("/api/");
    expect(out).not.toContain("GET");
    expect(out).not.toContain("PlanDashboard");
    expect(containsTechnicalLeak(out)).toBe(false);
  });

  it("humanizes routes with localized page names", () => {
    expect(sanitizeHumanText("Opens /settings and saves.", "en", routeLabel)).toContain(
      "Settings",
    );
    expect(sanitizeHumanText("يفتح /settings ويحفظ.", "ar", routeLabel)).toContain(
      "الإعدادات",
    );
  });

  it("never mixes languages in word replacements", () => {
    const arabic = sanitizeHumanText("مفاتيح API والتنبيهات webhook.", "ar", routeLabel);
    expect(arabic).not.toContain("API");
    expect(arabic).not.toMatch(/[A-Za-z]{3,}/);
  });
});

describe("toPublicStories", () => {
  const stories = toPublicStories(routeLabel);

  it("covers every guide role except platform-internal ones", () => {
    const expected = ROLES_GUIDE.map((role) => role.id).filter(
      (id) => !(PUBLIC_EXCLUDED_ROLE_IDS as readonly string[]).includes(id),
    );
    expect(stories.map((story) => story.id).sort()).toEqual(expected.sort());
    expect(stories.length).toBeGreaterThanOrEqual(6);
  });

  it("keeps at least two everyday tasks per role", () => {
    for (const story of stories) {
      expect(story.tasks.length, story.id).toBeGreaterThanOrEqual(2);
      for (const task of story.tasks) {
        expect(
          task.steps.length > 0 || task.result.ar.length > 0 || task.result.en.length > 0,
          `${story.id}/${task.id}`,
        ).toBe(true);
      }
    }
  });

  it("exposes zero technical leaks in any language", () => {
    const texts: string[] = [];
    for (const story of stories) {
      texts.push(story.profile.ar, story.profile.en, story.landing.ar, story.landing.en);
      for (const task of story.tasks) {
        texts.push(
          task.title.ar,
          task.title.en,
          task.where.ar,
          task.where.en,
          task.result.ar,
          task.result.en,
          ...task.steps.flatMap((step) => [step.ar, step.en]),
        );
      }
      for (const boundary of story.boundaries) {
        texts.push(boundary.ar, boundary.en);
      }
    }
    expect(texts.length).toBeGreaterThan(50);
    for (const text of texts) {
      expect(containsTechnicalLeak(text), text).toBe(false);
    }
  });
});

describe("parseEntitlementsResponse", () => {
  it("parses the real backend shape from GET /api/plan/entitlements", () => {
    const payload = {
      orgId: "org_1",
      plan: { code: "clinic", nameEn: "Clinic", upgradeTargetCode: "plus" },
      modules: { dashboard: true, patients: true, billing: false },
      features: {},
      overrides: [],
      source: "plan",
      usage: { patients: 3 },
      limitUsage: [],
    };
    expect(parseEntitlementsResponse(payload)).toEqual({
      planCode: "clinic",
      planName: "Clinic",
      enabledModules: 2,
    });
  });

  it("rejects 401 bodies, garbage, and shape drift", () => {
    expect(parseEntitlementsResponse({ error: "Unauthorized" })).toBeNull();
    expect(parseEntitlementsResponse(null)).toBeNull();
    expect(parseEntitlementsResponse("oops")).toBeNull();
    expect(parseEntitlementsResponse({ plan: { nameEn: "X" }, modules: {} })).toBeNull();
    expect(parseEntitlementsResponse({ plan: null })).toBeNull();
  });
});
