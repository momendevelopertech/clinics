import { describe, expect, it } from "vitest";
import {
  DEMO_PASSWORD,
  DEMO_PATIENT_PASSWORD,
  DEMO_TENANTS,
} from "../../src/lib/demo-accounts";

// The patient quick-login button posts the exact email/mrn/password below to
// /api/patient-auth/login. If these fixtures drift from the demo seed or from
// scripts/check-auth-readiness.mjs, the button silently breaks, so they are
// pinned here as an explicit guard.

const EXPECTED_PORTAL_PATIENTS = [
  {
    email: "patient@alexandria.demo.openhealthcrm.test",
    mrn: "DM-demo-alexandria-family-clinic-001",
  },
  {
    email: "patient@smouha.demo.openhealthcrm.test",
    mrn: "DM-demo-smouha-pediatrics-center-001",
  },
];

describe("demo patient quick-login fixtures", () => {
  it("defines one portal patient per demo tenant", () => {
    expect(DEMO_TENANTS).toHaveLength(2);

    for (const tenant of DEMO_TENANTS) {
      expect(tenant.patient).toBeDefined();
      expect(tenant.patient.email).toContain("@");
      expect(tenant.patient.mrn).toMatch(/^DM-demo-/);
    }
  });

  it("matches the seeded portal patient credentials and demo passwords", () => {
    expect(DEMO_PASSWORD).toBe("DemoClinic!2026");
    expect(DEMO_PATIENT_PASSWORD).toBe("PatientDemo!2026");

    const actual = DEMO_TENANTS.map((tenant) => ({
      email: tenant.patient.email,
      mrn: tenant.patient.mrn,
    }));
    expect(actual).toEqual(EXPECTED_PORTAL_PATIENTS);
  });
});