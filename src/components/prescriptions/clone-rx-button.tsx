"use client";

import { CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewPrescriptionDialog } from "@/components/prescriptions/new-prescription-dialog";
import {
  buildPrescriptionDraftFromExisting,
  type PrescriptionLike,
} from "@/lib/prescriptions";
import { useLocale } from "@/components/locale/locale-provider";

interface CloneRxButtonProps {
  prescription: PrescriptionLike;
  patientId: string;
  patientName: string;
  encounterId?: string;
  onSuccess?: () => void;
}

/**
 * "Clone" — opens the composer pre-filled with an existing prescription and
 * locks the patient, so the doctor can tweak and save a brand-new copy.
 * Source record is never mutated (server always creates a fresh Prescription).
 */
export function CloneRxButton({
  prescription,
  patientId,
  patientName,
  encounterId,
  onSuccess,
}: CloneRxButtonProps) {
  const { t } = useLocale();

  return (
    <NewPrescriptionDialog
      onSuccess={onSuccess ?? (() => undefined)}
      defaultPatientId={patientId}
      defaultPatientLabel={patientName}
      defaultEncounterId={encounterId ?? undefined}
      initialLines={buildPrescriptionDraftFromExisting(prescription)}
      triggerLabel={t("rx_clone")}
      trigger={
        <Button size="sm" variant="outline" className="flex items-center gap-2">
          <CopyIcon className="h-4 w-4" /> {t("rx_clone")}
        </Button>
      }
    />
  );
}