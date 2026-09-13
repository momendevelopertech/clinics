import { describe, expect, it } from "vitest";
import { CLINIC_MODULES, ROLE_MODULE_ACCESS } from "@/lib/permissions";
import { ROLES_GUIDE, getRoleModules } from "@/lib/roles-guide-data";

const EXPECTED_TASK_COUNTS: Record<string, number> = {
  owner: 8,
  "super-admin": 4,
  doctor: 14,
  nurse: 10,
  receptionist: 12,
  biller: 10,
  pharmacist: 4,
  patient: 8,
};

const nonEmpty = (s: string) => typeof s === "string" && s.trim().length > 0;

describe("roles guide data integrity (mirrors user-stories-by-role.md)", () => {
  it("covers 8 roles with unique ids, owner first", () => {
    expect(ROLES_GUIDE).toHaveLength(8);
    expect(new Set(ROLES_GUIDE.map((r) => r.id)).size).toBe(8);
    expect(ROLES_GUIDE[0].id).toBe("owner");
  });

  it("every task has bilingual title/where/steps/backend/result", () => {
    for (const role of ROLES_GUIDE) {
      expect(nonEmpty(role.name.ar) && nonEmpty(role.name.en)).toBe(true);
      expect(nonEmpty(role.profile.ar) && nonEmpty(role.profile.en)).toBe(true);
      expect(nonEmpty(role.landing.ar) && nonEmpty(role.landing.en)).toBe(true);
      expect(role.tasks.length).toBeGreaterThan(0);
      expect(role.boundaries.length).toBeGreaterThan(0);
      const taskIds = new Set(role.tasks.map((x) => x.id));
      expect(taskIds.size).toBe(role.tasks.length);
      for (const task of role.tasks) {
        expect(nonEmpty(task.title.ar) && nonEmpty(task.title.en)).toBe(true);
        expect(nonEmpty(task.where.ar) && nonEmpty(task.where.en)).toBe(true);
        expect(task.steps.length).toBeGreaterThanOrEqual(1);
        for (const s of task.steps) {
          expect(nonEmpty(s.ar) && nonEmpty(s.en)).toBe(true);
        }
        expect(nonEmpty(task.backend.ar) && nonEmpty(task.backend.en)).toBe(true);
        expect(nonEmpty(task.result.ar) && nonEmpty(task.result.en)).toBe(true);
        for (const b of role.boundaries) {
          expect(nonEmpty(b.ar) && nonEmpty(b.en)).toBe(true);
        }
      }
    }
  });

  it("task counts match the comparison table in user-stories-by-role.md", () => {
    for (const role of ROLES_GUIDE) {
      expect(role.tasks).toHaveLength(EXPECTED_TASK_COUNTS[role.id]);
    }
  });

  it("frozen client-safe mirror matches src/lib/permissions.ts exactly (server import would break the browser build)", () => {
    for (const role of ROLES_GUIDE) {
      if (role.moduleSource !== "rbac" || !role.roleKey) continue;
      const expected = new Set<string>(ROLE_MODULE_ACCESS[role.roleKey] ?? []);
      const modules = getRoleModules(role);
      expect(modules.map((m) => m.key)).toEqual([...CLINIC_MODULES]);
      for (const m of modules) {
        expect(m.available).toBe(expected.has(m.key));
      }
    }
  });

  it("matrix spot-checks: owner all, doctor clinical-not-inventory, reception campaigns-blocked note", () => {
    const byId = Object.fromEntries(ROLES_GUIDE.map((r) => [r.id, r]));
    const ownerMods = getRoleModules(byId.owner);
    expect(ownerMods.every((m) => m.available)).toBe(true);
    const doctorMods = Object.fromEntries(
      getRoleModules(byId.doctor).map((m) => [m.key, m.available]),
    );
    expect(doctorMods.encounters).toBe(true);
    expect(doctorMods.inventory).toBe(false);
    expect(doctorMods.billing).toBe(false);
    const recep = byId.receptionist;
    expect(recep.roleKey).toBe("Care Coordinator");
    expect(recep.tasks.some((x) => x.id === "recep-campaigns-blocked")).toBe(true);
    expect(byId.patient.moduleSource).toBe("custom");
    expect(byId["super-admin"].moduleSource).toBe("custom");
  });
});
