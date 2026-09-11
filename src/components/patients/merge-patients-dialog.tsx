"use client";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { logClientError } from "@/lib/client-logger";
import { useLocale } from "@/components/locale/locale-provider";
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
      toast.success(t("patients_mergeSuccess"));
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
        <Button variant="link" className="p-0 h-auto text-sm font-medium text-amber-600 hover:text-amber-700">
          {t("patients_merge")}
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
          <Select value={survivorId} onValueChange={setSurvivorId}>
            <SelectTrigger id={`merge-survivor-${patient.id}`}>
              <SelectValue placeholder={t("patients_mergeSurvivorPlaceholder")} />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {candidates.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.firstName} {c.lastName} · {c.mrn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            {t("common_cancel")}
          </Button>
          <Button onClick={handleMerge} disabled={!survivorId || saving}>
            {saving ? t("patients_mergeMerging") : t("patients_mergeConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
