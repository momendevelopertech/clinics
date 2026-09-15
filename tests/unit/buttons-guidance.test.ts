import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { en } from "@/lib/i18n/dictionaries/en";
import { ar } from "@/lib/i18n/dictionaries/ar";

const EXPECTED_ACTIONS = [
  "medicine_added",
  "inventory_item_added",
  "waitlist_added",
  "waitlist_converted",
  "appointment_booked",
  "appointment_updated",
  "appointment_cancelled",
  "patient_created",
  "patient_updated",
  "prescription_created",
  "prescription_dispensed",
  "invoice_created",
  "payment_recorded",
  "equipment_added",
  "equipment_log_added",
  "staff_added",
  "staff_role_assigned",
  "shift_added",
  "consent_added",
  "branch_added",
  "room_added",
  "queue_status_updated",
  "task_created",
  "lab_order_created",
  "lab_result_added",
  "document_uploaded",
  "document_generated",
  "communication_sent",
  "campaign_created",
  "campaign_launched",
  "insurance_policy_created",
  "insurance_claim_filed",
  "catalog_updated",
  "settings_saved",
  "vitals_recorded",
  "encounter_saved",
  "telehealth_link_saved",
  "report_scheduled",
  "export_ready",
  "action_completed",
] as const;

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) {
      if (e === "node_modules" || e === ".next") continue;
      walk(p, out);
    } else if (p.endsWith(".tsx") || p.endsWith(".ts")) {
      out.push(p);
    }
  }
  return out;
}

describe("buttons: post-action guidance coverage (every button, every role)", () => {
  it("every PostActionType has title+hint keys in en and ar", () => {
    const enDict = en as Record<string, string>;
    const arDict = ar as Record<string, string>;
    const missing: string[] = [];
    for (const action of EXPECTED_ACTIONS) {
      // hook maps inventory_item_added -> guidance_inventory_added_* and queue_status_updated -> guidance_queue_updated_*
      const base =
        action === "inventory_item_added"
          ? "guidance_inventory_added"
          : action === "queue_status_updated"
            ? "guidance_queue_updated"
            : `guidance_${action}`;
      for (const suffix of ["title", "hint"]) {
        const key = `${base}_${suffix}`;
        if (!enDict[key]) missing.push(`en:${key}`);
        if (!arDict[key]) missing.push(`ar:${key}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("en/ar guidance keys are mirrored 1:1", () => {
    const enKeys = Object.keys(en as Record<string, string>).filter((k) => k.startsWith("guidance_")).sort();
    const arKeys = Object.keys(ar as Record<string, string>).filter((k) => k.startsWith("guidance_")).sort();
    expect(arKeys).toEqual(enKeys);
  });

  it("no dashboard client component writes raw console.* (would appear in browser console)", () => {
    const root = join(process.cwd(), "src");
    const files = walk(root);
    const offenders: string[] = [];
    const allowed = new Set([
      join(process.cwd(), "src/lib/client-logger.ts"),
      join(process.cwd(), "src/lib/safe-logger.ts"),
    ]);
    for (const f of files) {
      if (allowed.has(f)) continue;
      const text = readFileSync(f, "utf-8");
      // server-only files may log; client files with "use client" must not
      if (!text.includes('"use client"') && !text.includes("'use client'")) continue;
      if (/console\.(log|error|warn|info|debug)\(/.test(text)) {
        offenders.push(f.replace(process.cwd(), "."));
      }
    }
    expect(offenders).toEqual([]);
  });

  it("key clinic actions route through triggerGuidance (success + next step)", () => {
    const checks: Array<[string, string[]]> = [
      ["src/app/(dashboard)/appointments/page.tsx", ["appointment_updated", "appointment_cancelled", "queue_status_updated"]],
      ["src/app/(dashboard)/queue/page.tsx", ["queue_status_updated"]],
      ["src/components/patients/add-patient-dialog.tsx", ["patient_created"]],
      ["src/components/prescriptions/new-prescription-dialog.tsx", ["prescription_created"]],
      ["src/components/prescriptions/dispense-dialog.tsx", ["prescription_dispensed"]],
      ["src/components/billing/new-invoice-dialog.tsx", ["invoice_created"]],
      ["src/components/billing/payment-dialog.tsx", ["payment_recorded"]],
      ["src/components/labs/add-lab-order-dialog.tsx", ["lab_order_created"]],
      ["src/components/labs/add-lab-result-dialog.tsx", ["lab_result_added"]],
      ["src/components/documents/upload-document-dialog.tsx", ["document_uploaded"]],
      ["src/components/documents/generate-document-dialog.tsx", ["document_generated"]],
      ["src/components/communications/add-communication-dialog.tsx", ["communication_sent"]],
      ["src/components/communications/add-campaign-dialog.tsx", ["campaign_created"]],
      ["src/components/tasks/create-task-dialog.tsx", ["task_created"]],
      ["src/app/(dashboard)/equipment/page.tsx", ["equipment_added", "equipment_log_added"]],
      ["src/app/(dashboard)/catalogs/page.tsx", ["catalog_updated"]],
      ["src/app/(dashboard)/insurance/page.tsx", ["insurance_policy_created", "insurance_claim_filed"]],
      ["src/app/(dashboard)/staff/page-client.tsx", ["staff_role_assigned", "shift_added"]],
      ["src/app/(dashboard)/settings/page-client.tsx", ["settings_saved"]],
      ["src/components/encounters/record-vitals-dialog.tsx", ["vitals_recorded"]],
      ["src/components/encounters/encounters-workspace.tsx", ["encounter_saved"]],
      ["src/components/appointments/telehealth-link-dialog.tsx", ["telehealth_link_saved"]],
      ["src/components/reports/report-schedule-card.tsx", ["report_scheduled"]],
      ["src/components/waitlist/book-from-waitlist-dialog.tsx", ["waitlist_converted"]],
      ["src/components/waitlist/add-to-waitlist-dialog.tsx", ["waitlist_added"]],
      ["src/components/inventory/add-item-dialog.tsx", ["inventory_item_added", "medicine_added"]],
    ];
    const missing: string[] = [];
    for (const [rel, actions] of checks) {
      const text = readFileSync(join(process.cwd(), rel), "utf-8");
      for (const a of actions) {
        if (!text.includes(`"${a}"`)) missing.push(`${rel} :: ${a}`);
      }
      if (!text.includes("triggerGuidance")) missing.push(`${rel} :: triggerGuidance hook`);
    }
    expect(missing).toEqual([]);
  });

  it("hook fallback always shows a next-step hint (never a bare success toast)", () => {
    const text = readFileSync(join(process.cwd(), "src/hooks/use-post-action-guidance.ts"), "utf-8");
    // fallback branch must include a description hint
    expect(text).toMatch(/description:\s*t\("guidance_action_completed_hint"\)/);
    // success toast must carry description + duration
    expect(text).toMatch(/toast\.success\(title,\s*\{\s*description:\s*hint/);
  });
});
