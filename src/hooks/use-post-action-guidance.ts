"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useLocale } from "@/components/locale/locale-provider";

export type PostActionType =
  | "medicine_added"
  | "inventory_item_added"
  | "waitlist_added"
  | "appointment_booked"
  | "consent_added"
  | "branch_added"
  | "room_added"
  | "queue_status_updated";

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
        appointment_booked: {
          titleKey: "guidance_appointment_booked_title",
          hintKey: "guidance_appointment_booked_hint",
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
      };

      const config = guidanceMessages[actionType];
      if (!config) {
        toast.success(customTitle ?? t("common_saved"));
        return;
      }

      const title = customTitle ?? t(config.titleKey);
      const hint = t(config.hintKey);

      toast.success(title, {
        description: hint,
        duration: 5000,
      });
    },
    [t],
  );

  return { triggerGuidance };
}
