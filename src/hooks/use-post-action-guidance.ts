"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useLocale } from "@/components/locale/locale-provider";

export type PostActionType =
  | "medicine_added"
  | "inventory_item_added"
  | "waitlist_added"
  | "waitlist_converted"
  | "appointment_booked"
  | "appointment_updated"
  | "appointment_cancelled"
  | "patient_created"
  | "patient_updated"
  | "prescription_created"
  | "prescription_dispensed"
  | "invoice_created"
  | "payment_recorded"
  | "equipment_added"
  | "equipment_log_added"
  | "staff_added"
  | "staff_role_assigned"
  | "shift_added"
  | "consent_added"
  | "branch_added"
  | "room_added"
  | "queue_status_updated"
  | "task_created"
  | "lab_order_created"
  | "lab_result_added"
  | "document_uploaded"
  | "document_generated"
  | "communication_sent"
  | "campaign_created"
  | "campaign_launched"
  | "insurance_policy_created"
  | "insurance_claim_filed"
  | "catalog_updated"
  | "settings_saved"
  | "vitals_recorded"
  | "encounter_saved"
  | "telehealth_link_saved"
  | "report_scheduled"
  | "export_ready"
  | "action_completed";

export function usePostActionGuidance() {
  const { t } = useLocale();

  const triggerGuidance = useCallback(
    (actionType: PostActionType, customTitle?: string) => {
      const guidanceMessages: Record<PostActionType, { titleKey: string; hintKey: string }> = {
        medicine_added: {
          titleKey: "guidance_medicine_added_title",
          hintKey: "guidance_medicine_added_hint",
        },
        inventory_item_added: {
          titleKey: "guidance_inventory_added_title",
          hintKey: "guidance_inventory_added_hint",
        },
        waitlist_added: {
          titleKey: "guidance_waitlist_added_title",
          hintKey: "guidance_waitlist_added_hint",
        },
        waitlist_converted: {
          titleKey: "guidance_waitlist_converted_title",
          hintKey: "guidance_waitlist_converted_hint",
        },
        appointment_booked: {
          titleKey: "guidance_appointment_booked_title",
          hintKey: "guidance_appointment_booked_hint",
        },
        appointment_updated: {
          titleKey: "guidance_appointment_updated_title",
          hintKey: "guidance_appointment_updated_hint",
        },
        appointment_cancelled: {
          titleKey: "guidance_appointment_cancelled_title",
          hintKey: "guidance_appointment_cancelled_hint",
        },
        patient_created: {
          titleKey: "guidance_patient_created_title",
          hintKey: "guidance_patient_created_hint",
        },
        patient_updated: {
          titleKey: "guidance_patient_updated_title",
          hintKey: "guidance_patient_updated_hint",
        },
        prescription_created: {
          titleKey: "guidance_prescription_created_title",
          hintKey: "guidance_prescription_created_hint",
        },
        prescription_dispensed: {
          titleKey: "guidance_prescription_dispensed_title",
          hintKey: "guidance_prescription_dispensed_hint",
        },
        invoice_created: {
          titleKey: "guidance_invoice_created_title",
          hintKey: "guidance_invoice_created_hint",
        },
        payment_recorded: {
          titleKey: "guidance_payment_recorded_title",
          hintKey: "guidance_payment_recorded_hint",
        },
        equipment_added: {
          titleKey: "guidance_equipment_added_title",
          hintKey: "guidance_equipment_added_hint",
        },
        equipment_log_added: {
          titleKey: "guidance_equipment_log_added_title",
          hintKey: "guidance_equipment_log_added_hint",
        },
        staff_added: {
          titleKey: "guidance_staff_added_title",
          hintKey: "guidance_staff_added_hint",
        },
        staff_role_assigned: {
          titleKey: "guidance_staff_role_assigned_title",
          hintKey: "guidance_staff_role_assigned_hint",
        },
        shift_added: {
          titleKey: "guidance_shift_added_title",
          hintKey: "guidance_shift_added_hint",
        },
        consent_added: {
          titleKey: "guidance_consent_added_title",
          hintKey: "guidance_consent_added_hint",
        },
        branch_added: {
          titleKey: "guidance_branch_added_title",
          hintKey: "guidance_branch_added_hint",
        },
        room_added: {
          titleKey: "guidance_room_added_title",
          hintKey: "guidance_room_added_hint",
        },
        queue_status_updated: {
          titleKey: "guidance_queue_updated_title",
          hintKey: "guidance_queue_updated_hint",
        },
        task_created: {
          titleKey: "guidance_task_created_title",
          hintKey: "guidance_task_created_hint",
        },
        lab_order_created: {
          titleKey: "guidance_lab_order_created_title",
          hintKey: "guidance_lab_order_created_hint",
        },
        lab_result_added: {
          titleKey: "guidance_lab_result_added_title",
          hintKey: "guidance_lab_result_added_hint",
        },
        document_uploaded: {
          titleKey: "guidance_document_uploaded_title",
          hintKey: "guidance_document_uploaded_hint",
        },
        document_generated: {
          titleKey: "guidance_document_generated_title",
          hintKey: "guidance_document_generated_hint",
        },
        communication_sent: {
          titleKey: "guidance_communication_sent_title",
          hintKey: "guidance_communication_sent_hint",
        },
        campaign_created: {
          titleKey: "guidance_campaign_created_title",
          hintKey: "guidance_campaign_created_hint",
        },
        campaign_launched: {
          titleKey: "guidance_campaign_launched_title",
          hintKey: "guidance_campaign_launched_hint",
        },
        insurance_policy_created: {
          titleKey: "guidance_insurance_policy_created_title",
          hintKey: "guidance_insurance_policy_created_hint",
        },
        insurance_claim_filed: {
          titleKey: "guidance_insurance_claim_filed_title",
          hintKey: "guidance_insurance_claim_filed_hint",
        },
        catalog_updated: {
          titleKey: "guidance_catalog_updated_title",
          hintKey: "guidance_catalog_updated_hint",
        },
        settings_saved: {
          titleKey: "guidance_settings_saved_title",
          hintKey: "guidance_settings_saved_hint",
        },
        vitals_recorded: {
          titleKey: "guidance_vitals_recorded_title",
          hintKey: "guidance_vitals_recorded_hint",
        },
        encounter_saved: {
          titleKey: "guidance_encounter_saved_title",
          hintKey: "guidance_encounter_saved_hint",
        },
        telehealth_link_saved: {
          titleKey: "guidance_telehealth_link_saved_title",
          hintKey: "guidance_telehealth_link_saved_hint",
        },
        report_scheduled: {
          titleKey: "guidance_report_scheduled_title",
          hintKey: "guidance_report_scheduled_hint",
        },
        export_ready: {
          titleKey: "guidance_export_ready_title",
          hintKey: "guidance_export_ready_hint",
        },
        action_completed: {
          titleKey: "guidance_action_completed_title",
          hintKey: "guidance_action_completed_hint",
        },
      };

      const config = guidanceMessages[actionType];
      if (!config) {
        toast.success(customTitle ?? t("common_saved"), {
          description: t("guidance_action_completed_hint"),
          duration: 5000,
        });
        return;
      }

      const title = customTitle ?? t(config.titleKey);
      const rawHint = t(config.hintKey);
      const hint = rawHint === config.hintKey ? t("guidance_action_completed_hint") : rawHint;

      toast.success(title, {
        description: hint,
        duration: 5000,
      });
    },
    [t],
  );

  return { triggerGuidance };
}
