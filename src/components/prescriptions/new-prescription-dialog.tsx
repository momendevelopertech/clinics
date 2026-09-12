"use client";

import * as React from "react";
import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import type { RxMedLine } from "@/lib/prescriptions";

type PatientOption = {
  id: string;
  firstName: string;
  lastName: string;
  mrn: string;
};

type MedLine = {
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
};

const EMPTY_LINE: MedLine = {
  medicationName: "",
  dosage: "",
  frequency: "",
  duration: "",
  instructions: "",
};

const toMedLines = (lines: RxMedLine[]): MedLine[] =>
  lines.map((line) => ({
    medicationName: line.medicationName ?? "",
    dosage: line.dosage ?? "",
    frequency: line.frequency ?? "",
    duration: line.duration ?? "",
    instructions: line.instructions ?? "",
  }));

interface NewPrescriptionDialogProps {
  onSuccess: () => void;
  defaultPatientId?: string;
  defaultPatientLabel?: string;
  defaultEncounterId?: string;
  initialLines?: RxMedLine[];
  triggerLabel?: string;
  trigger?: React.ReactNode;
}

/**
 * Doctor-facing prescription composer. The first medication line populates the
 * top-level Rx fields; any further lines are stored as PrescriptionItem rows.
 */
export function NewPrescriptionDialog({
  onSuccess,
  defaultPatientId,
  defaultPatientLabel,
  defaultEncounterId,
  initialLines,
  triggerLabel,
  trigger,
}: NewPrescriptionDialogProps) {
  const { t } = useLocale();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [patients, setPatients] = React.useState<PatientOption[]>([]);
  const [patientId, setPatientId] = React.useState(defaultPatientId ?? "");
  const [lines, setLines] = React.useState<MedLine[]>([{ ...EMPTY_LINE }]);
  const [warnings, setWarnings] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (open) {
      fetchPatients();
      setWarnings([]);
      if (initialLines && initialLines.length > 0) {
        setLines(toMedLines(initialLines));
      }
    }
  }, [open]);

  const fetchPatients = async () => {
    try {
      const response = await fetch("/api/patients");
      if (!response.ok) throw new Error("Failed to fetch patients");
      const data = await response.json();
      if (Array.isArray(data)) setPatients(data);
    } catch (error) {
      toast.error(t("rx_loadPatientsError"));
      logClientError("Prescription patient lookup failed", error);
    }
  };

  const updateLine = (index: number, field: keyof MedLine, value: string) => {
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, [field]: value } : line)),
    );
  };

  const addLine = () => setLines((prev) => [...prev, { ...EMPTY_LINE }]);
  const removeLine = (index: number) =>
    setLines((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!patientId) {
      toast.error(t("rx_requirePatient"));
      return;
    }

    const nonEmpty = lines.filter((line) => line.medicationName.trim().length > 0);
    if (nonEmpty.length === 0) {
      toast.error(t("rx_requireMedication"));
      return;
    }

    const [main, ...items] = nonEmpty;

    try {
      setLoading(true);
      const response = await fetch("/api/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          encounterId: defaultEncounterId || null,
          medicationName: main.medicationName.trim(),
          dosage: main.dosage.trim() || main.dosage || null,
          frequency: main.frequency.trim() || null,
          duration: main.duration.trim() || null,
          instructions: main.instructions.trim() || null,
          items: items.map((line) => ({
            medicationName: line.medicationName.trim(),
            dosage: line.dosage.trim() || null,
            frequency: line.frequency.trim() || null,
            duration: line.duration.trim() || null,
            instructions: line.instructions.trim() || null,
          })),
        }),
      });

      if (!response.ok) throw new Error("Failed to create prescription");
      const result = await response.json();

      if (Array.isArray(result.allergyWarnings) && result.allergyWarnings.length > 0) {
        setWarnings(result.allergyWarnings.map((w: { allergen: string }) => w.allergen));
        toast.warning(t("rx_allergyWarning"));
        onSuccess();
        return;
      }

      toast.success(t("rx_createdSuccess"));
      setLines([{ ...EMPTY_LINE }]);
      setPatientId(defaultPatientId ?? "");
      setOpen(false);
      onSuccess();
    } catch (error) {
      toast.error(t("rx_createError"));
      logClientError("Create prescription failed", error);
    } finally {
      setLoading(false);
    }
  };

  const patientLabel = defaultPatientLabel
    ? defaultPatientLabel
    : (patients.find((p) => p.id === patientId)
        ? `${patients.find((p) => p.id === patientId)?.firstName} ${patients.find((p) => p.id === patientId)?.lastName}`
        : "");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> {triggerLabel ?? t("rx_newTrigger")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("rx_newTitle")}</DialogTitle>
          <DialogDescription>{t("rx_newDesc")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="rx-patient">{t("rx_patient")}</Label>
            {defaultPatientLabel ? (
              <Input value={patientLabel} disabled />
            ) : (
              <Select value={patientId} onValueChange={setPatientId}>
                <SelectTrigger id="rx-patient">
                  <SelectValue placeholder={t("rx_selectPatient")} />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.firstName} {patient.lastName} - {patient.mrn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-3">
            {lines.map((line, index) => (
              <div
                key={index}
                className="rounded-[16px] border border-white/60 bg-white/60 p-4 dark:border-white/6 dark:bg-white/[0.03]"
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {t("rx_line")} {index + 1}
                  </p>
                  {lines.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 rounded-full p-0 text-red-600"
                      onClick={() => removeLine(index)}
                      aria-label={t("rx_removeLine")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <Label>{t("rx_medication")}</Label>
                    <Input
                      value={line.medicationName}
                      onChange={(e) => updateLine(index, "medicationName", e.target.value)}
                      placeholder={t("rx_medicationPlaceholder")}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label>{t("rx_dosage")}</Label>
                    <Input
                      value={line.dosage}
                      onChange={(e) => updateLine(index, "dosage", e.target.value)}
                      placeholder={t("rx_dosagePlaceholder")}
                      className="ltr-on-rtl"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label>{t("rx_frequency")}</Label>
                    <Input
                      value={line.frequency}
                      onChange={(e) => updateLine(index, "frequency", e.target.value)}
                      placeholder={t("rx_frequencyPlaceholder")}
                      className="ltr-on-rtl"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label>{t("rx_duration")}</Label>
                    <Input
                      value={line.duration}
                      onChange={(e) => updateLine(index, "duration", e.target.value)}
                      placeholder={t("rx_durationPlaceholder")}
                      className="ltr-on-rtl"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label>{t("rx_instructions")}</Label>
                    <Textarea
                      value={line.instructions}
                      onChange={(e) => updateLine(index, "instructions", e.target.value)}
                      placeholder={t("rx_instructionsPlaceholder")}
                      className="min-h-16 ltr-on-rtl"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button type="button" variant="outline" size="sm" onClick={addLine} className="self-start">
            <Plus className="h-4 w-4" /> {t("rx_addLine")}
          </Button>

          {warnings.length > 0 ? (
            <div className="flex items-start gap-2 rounded-[14px] border border-amber-400/50 bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
              <X className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                {t("rx_allergyWarning")}: {warnings.join(", ")}
              </p>
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              {t("common_cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("common_loading") : t("rx_save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}