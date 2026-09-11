/**
 * Insurance workflow rules (P5): policy → eligibility → claim → invoice.
 * Pure decision logic — API routes persist, this module decides.
 */

export type ClaimStatus = "submitted" | "pending" | "paid" | "denied" | "appeal";

const CLAIM_TRANSITIONS: Record<ClaimStatus, readonly ClaimStatus[]> = {
  submitted: ["pending", "denied"],
  pending: ["paid", "denied"],
  denied: ["appeal"],
  appeal: ["pending", "paid", "denied"],
  paid: [],
};

export function canTransitionClaim(from: string, to: string): boolean {
  const allowed = (CLAIM_TRANSITIONS as Record<string, readonly string[]>)[from];
  return allowed?.includes(to) ?? false;
}

export type EligibilityInput = {
  patientStatus: string | null | undefined;
  organizationStatus: string | null | undefined;
  hasPolicy: boolean;
  policyType?: string | null;
};

export type EligibilityResult = {
  eligible: boolean;
  reasons: string[];
};

export function checkEligibility(input: EligibilityInput): EligibilityResult {
  const reasons: string[] = [];
  if (input.organizationStatus !== "active") {
    reasons.push("organization-not-active");
  }
  if (!input.hasPolicy) {
    reasons.push("no-policy-on-file");
  }
  if (input.patientStatus === "Archived") {
    reasons.push("patient-archived");
  }
  return { eligible: reasons.length === 0, reasons };
}

/** Cap a claim payout credit at the invoice outstanding balance. */
export function claimCreditAmount(outstanding: number, amountPaid: number): number {
  if (!Number.isFinite(outstanding) || !Number.isFinite(amountPaid)) return 0;
  return Math.min(Math.max(amountPaid, 0), Math.max(outstanding, 0));
}
