import { describe, expect, it } from "vitest";
import { CLINIC_MODULES, ROLE_MODULE_ACCESS } from "@/lib/permissions";

const EXPECTED_ROLES = [
  "Owner",
  "Doctor",
  "Care Coordinator",
  "Nurse",
  "Biller",
  "Pharmacist",
] as const;

const ALL_MODULES = CLINIC_MODULES as readonly string[];

describe("ROLE_MODULE_ACCESS", () => {
  it("has entries for all expected roles", () => {
    for (const role of EXPECTED_ROLES) {
      expect(ROLE_MODULE_ACCESS, `missing role: ${role}`).toHaveProperty(role);
    }
  });

  it("Owner has access to every module", () => {
    const ownerModules = ROLE_MODULE_ACCESS["Owner"] as readonly string[];
    expect(new Set(ownerModules)).toEqual(new Set(ALL_MODULES));
  });

  it("every non-Owner role is a strict subset of CLINIC_MODULES", () => {
    const allModuleSet = new Set(ALL_MODULES);

    for (const [role, modules] of Object.entries(ROLE_MODULE_ACCESS)) {
      if (role === "Owner") continue;

      const moduleArray = modules as readonly string[];
      for (const mod of moduleArray) {
        expect(allModuleSet.has(mod)).toBe(true);
      }
      expect(new Set(moduleArray).size).toBe(moduleArray.length);
    }
  });

  it("every module is accessible by at least one role", () => {
    const allAccessible = new Set<string>();

    for (const modules of Object.values(ROLE_MODULE_ACCESS)) {
      for (const mod of modules as readonly string[]) {
        allAccessible.add(mod);
      }
    }

    for (const mod of ALL_MODULES) {
      expect(allAccessible.has(mod)).toBe(true);
    }
  });

  it("every role has dashboard access", () => {
    for (const [role, modules] of Object.entries(ROLE_MODULE_ACCESS)) {
      expect(
        (modules as readonly string[]).includes("dashboard"),
        `${role} should have dashboard access`,
      ).toBe(true);
    }
  });

  it("every role has help access", () => {
    for (const [role, modules] of Object.entries(ROLE_MODULE_ACCESS)) {
      expect(
        (modules as readonly string[]).includes("help"),
        `${role} should have help access`,
      ).toBe(true);
    }
  });
});