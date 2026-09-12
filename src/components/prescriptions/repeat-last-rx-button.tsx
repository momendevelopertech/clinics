"use client";

import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewPrescriptionDialog } from "@/components/prescriptions/new-prescription-dialog";
import {
  buildPrescriptionDraftFromExisting,
  type PrescriptionLike,
} from "@/lib/prescriptions";
import { useLocale } from "@/components/locale/locale-provider";

interface RepeatLastRxButtonProps {
  prescription: PrescriptionLike;
  patientId: string;
  patientName: string;
  encounterId?: string;
  onSuccess?: () => void;
}

/**
 * "Repeat last Rx" — opens the composer pre-filled with the patient's most
 * recent prescription (all lines included) so the doctor can adjust before
 * saving. Saving goes through the normal POST /api/prescriptions and always
 * creates a brand-new record (the source prescription is never mutated).
 */
export function RepeatLastRxButton({
  prescription,
  patientId,
  patientName,
  encounterId,
  onSuccess,
}: RepeatLastRxButtonProps) {
  const { t } = useLocale();

  return (
    <NewPrescriptionDialog
      onSuccess={onSuccess ?? (() => undefined)}
      defaultPatientId={patientId}
      defaultPatientLabel={patientName}
      defaultEncounterId={encounterId ?? undefined}
      initialLines={buildPrescriptionDraftFromExisting(prescription)}
      triggerLabel={t("rx_repeat_last")}
      trigger={
        <Button size="sm" variant="outline" className="flex items-center gap-2">
          <RefreshCcw className="h-4 w-4" /> {t("rx_repeat_last")}
        </Button>
      }
    />
  );
}