import { describe, expect, it, vi } from "vitest";
import {
  findActivePatientSession,
  isPatientOrganizationActive,
} from "../../src/lib/patient-auth";

// Tenant-lifecycle gating for the patient portal: only organizations with
// status "active" can log in and keep live sessions. Expired/revoked sessions
// are rejected regardless of org status.

describe("patient organization status gate", () => {
  it("allows only active organizations", () => {
    expect(isPatientOrganizationActive("active")).toBe(true);
    expect(isPatientOrganizationActive("pending")).toBe(false);
    expect(isPatientOrganizationActive("suspended")).toBe(false);
    expect(isPatientOrganizationActive(undefined)).toBe(false);
    expect(isPatientOrganizationActive(null)).toBe(false);
  });
});

describe("patient session resolution", () => {
  it("requires an un-revoked, unexpired session from an active organization", async () => {
    const session = { id: "session-1", patient: { id: "patient-1" } };
    const findFirst = vi.fn().mockResolvedValue(session);
    const db = {
      patientSession: { findFirst },
    } as unknown as Parameters<typeof findActivePatientSession>[0];
    const now = new Date("2026-09-09T00:00:00Z");

    await expect(
      findActivePatientSession(db, "token-hash", now),
    ).resolves.toEqual(session);

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tokenHash: "token-hash",
          revokedAt: null,
          expiresAt: { gt: now },
          patient: { organization: { status: "active" } },
        }),
      }),
    );
  });

  it("returns null when the session is revoked, expired, or org is not active", async () => {
    const db = {
      patientSession: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    } as unknown as Parameters<typeof findActivePatientSession>[0];

    await expect(
      findActivePatientSession(db, "token-hash"),
    ).resolves.toBeNull();
  });
});