"use client";
import { Check, Combine, X } from "lucide-react";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "sonner";
import { logClientError } from "@/lib/client-logger";
import { useLocale } from "@/components/locale/locale-provider";
import { usePostActionGuidance } from "@/hooks/use-post-action-guidance";
import type { Patient } from "@/context/MedicalContext";

interface MergePatientsDialogProps {
  patient: Patient;
  patients: Patient[];
  onSuccess?: () => void;
}

export function MergePatientsDialog({ patient, patients, onSuccess }: MergePatientsDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [survivorId, setSurvivorId] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const { t } = useLocale();
  const { triggerGuidance } = usePostActionGuidance();

  const candidates = patients.filter((p) => p.id !== patient.id);

  const handleMerge = async () => {
    if (!survivorId || saving) return;
    try {
      setSaving(true);
      const response = await fetch(`/api/patients/${patient.id}/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ survivorId }),
      });
      if (response.status === 403) {
        toast.error(t("common_error"));
        return;
      }
      if (!response.ok) throw new Error("Merge failed");
      triggerGuidance("patient_updated", t("patients_mergeSuccess"));
      setOpen(false);
      setSurvivorId("");
      onSuccess?.();
    } catch (error) {
      logClientError("Patient merge failed", error);
      toast.error(t("patients_mergeError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-medium text-amber-700 hover:text-amber-800 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40">
          <Combine className="mr-1 h-3.5 w-3.5" />{t("patients_merge")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("patients_mergeTitle")}</DialogTitle>
          <DialogDescription>
            {patient.firstName} {patient.lastName} ({patient.mrn}) — {t("patients_mergeDesc")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-2">
          <Label htmlFor={`merge-survivor-${patient.id}`}>{t("patients_mergeSurvivor")}</Label>
          <SearchableSelect
            value={survivorId}
            onValueChange={setSurvivorId}
            options={candidates.map((c) => ({
              value: c.id,
              label: `${c.firstName} ${c.lastName} · ${c.mrn}`,
            }))}
            placeholder={t("patients_mergeSurvivorPlaceholder")}
            id={`merge-survivor-${patient.id}`}
          />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            <X className="mr-1.5 h-4 w-4" />{t("common_cancel")}
          </Button>
          <Button onClick={handleMerge} disabled={!survivorId || saving}>
            <Check className="mr-1.5 h-4 w-4" />{saving ? t("patients_mergeMerging") : t("patients_mergeConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
