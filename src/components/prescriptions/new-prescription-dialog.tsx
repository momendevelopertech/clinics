"use client";

import * as React from "react";
import { Plus, Trash2, X, Copy, Bookmark } from "lucide-react";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

type FavoriteItem = {
  id: string;
  medicationName: string;
  defaultDosage: string | null;
  defaultFrequency: string | null;
  defaultDuration: string | null;
  usageCount: number;
};

type TemplateItem = {
  id: string;
  name: string;
  specialty: string | null;
  isShared: boolean;
  isOwn: boolean;
  usageCount: number;
  items: RxMedLine[];
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

/**
 * Searchable medication-name field backed by the current doctor's favorites.
 * Live filtering starts at 2 characters; selecting a favorite also fills its
 * default dosage/frequency/duration (all still editable afterwards).
 */
function MedicationNameInput({
  value,
  onChange,
  placeholder,
  onApplyDefaults,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onApplyDefaults: (defaults: {
    dosage: string;
    frequency: string;
    duration: string;
  }) => void;
}) {
  const { t } = useLocale();
  const [results, setResults] = React.useState<FavoriteItem[]>([]);
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const debounceRef = React.useRef<number | null>(null);

  const load = React.useCallback(async (query: string) => {
    try {
      const response = await fetch(
        `/api/prescriptions/favorites?q=${encodeURIComponent(query)}`,
      );
      if (!response.ok) return;
      const data = (await response.json()) as FavoriteItem[];
      if (Array.isArray(data)) {
        setResults(data);
        setOpen(true);
        setActiveIndex(-1);
      }
    } catch {
      logClientError("Prescription favorites lookup failed");
    }
  }, []);

  const scheduleLoad = (query: string) => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => void load(query), 200);
  };

  React.useEffect(() => {
    if (open) {
      if (value.trim().length >= 2) scheduleLoad(value);
      else void load("");
    }
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [open]);

  const apply = (item: FavoriteItem) => {
    onChange(item.medicationName);
    onApplyDefaults({
      dosage: item.defaultDosage ?? "",
      frequency: item.defaultFrequency ?? "",
      duration: item.defaultDuration ?? "",
    });
    setOpen(false);
    setResults([]);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && results.length > 0) {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % results.length);
    } else if (event.key === "ArrowUp" && results.length > 0) {
      event.preventDefault();
      setActiveIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      const item = results[activeIndex];
      if (item) apply(item);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
        />
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start" sideOffset={4}>
        {results.length === 0 ? (
          <p className="px-3 py-3 text-sm text-muted-foreground">{t("rx_no_favorites")}</p>
        ) : (
          <ul className="max-h-64 overflow-auto py-1">
            {results.map((item, index) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition ${
                    index === activeIndex
                      ? "bg-neutral-100 dark:bg-neutral-800"
                      : "hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                  }`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => apply(item)}
                >
                  <span className="min-w-0 flex-1 truncate">{item.medicationName}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    {item.defaultDosage ? (
                      <span className="ltr-on-rtl text-xs text-muted-foreground">
                        {item.defaultDosage}
                      </span>
                    ) : null}
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {item.usageCount}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

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
  const [templates, setTemplates] = React.useState<TemplateItem[]>([]);
  const [templatesOpen, setTemplatesOpen] = React.useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = React.useState(false);
  const [templateName, setTemplateName] = React.useState("");
  const [templateSpecialty, setTemplateSpecialty] = React.useState("");
  const [templateShared, setTemplateShared] = React.useState(false);
  const [savingTemplate, setSavingTemplate] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      fetchPatients();
      void fetchTemplates();
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

  const fetchTemplates = React.useCallback(async () => {
    try {
      const response = await fetch("/api/prescription-templates");
      if (!response.ok) throw new Error("Failed to fetch templates");
      const data = (await response.json()) as { templates?: TemplateItem[] };
      setTemplates(Array.isArray(data.templates) ? data.templates : []);
    } catch (error) {
      logClientError("Prescription templates fetch failed", error);
    }
  }, []);

  const applyTemplate = (tpl: TemplateItem) => {
    const filledCount = lines.filter((line) => line.medicationName.trim().length > 0).length;
    if (filledCount > 0 && !window.confirm(t("rx_template_replace_confirm"))) {
      return;
    }
    const items = Array.isArray(tpl.items) ? tpl.items : [];
    if (items.length > 0) setLines(toMedLines(items));
    setTemplatesOpen(false);
    void fetch(`/api/prescription-templates/${tpl.id}/use`, {
      method: "POST",
    }).catch(() => undefined);
    toast.success(t("rx_template_loaded"));
  };

  const saveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error(t("rx_template_name_required"));
      return;
    }
    const filled = lines.filter((line) => line.medicationName.trim().length > 0);
    if (filled.length === 0) return;
    try {
      setSavingTemplate(true);
      const response = await fetch("/api/prescription-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName.trim(),
          specialty: templateSpecialty.trim() || null,
          isShared: templateShared,
          items: filled.map((line) => ({
            medicationName: line.medicationName.trim(),
            dosage: line.dosage.trim() || null,
            frequency: line.frequency.trim() || null,
            duration: line.duration.trim() || null,
            instructions: line.instructions.trim() || null,
          })),
        }),
      });
      if (!response.ok) throw new Error("Failed to save template");
      toast.success(t("rx_template_saved"));
      setSaveTemplateOpen(false);
      setTemplateName("");
      setTemplateSpecialty("");
      setTemplateShared(false);
      await fetchTemplates();
    } catch (error) {
      toast.error(t("rx_template_save_error"));
      logClientError("Save prescription template failed", error);
    } finally {
      setSavingTemplate(false);
    }
  };

  const hasAnyMedication = lines.some((line) => line.medicationName.trim().length > 0);

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

          <div className="flex flex-wrap items-center gap-2">
            <Popover open={templatesOpen} onOpenChange={setTemplatesOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  <Copy className="me-2 h-4 w-4" />
                  {t("rx_use_template")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="start">
                {templates.length === 0 ? (
                  <p className="py-3 px-4 text-sm text-muted-foreground">
                    {t("rx_templates_empty")}
                  </p>
                ) : (
                  <ul className="max-h-72 overflow-y-auto py-1">
                    {templates.map((tpl) => (
                      <li key={tpl.id}>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                          onClick={() => applyTemplate(tpl)}
                        >
                          <span className="flex min-w-0 flex-col">
                            <span className="flex items-center gap-2">
                              <span className="truncate font-medium">{tpl.name}</span>
                              {!tpl.isOwn ? (
                                <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                  {t("rx_template_shared")}
                                </span>
                              ) : null}
                            </span>
                            {tpl.specialty ? (
                              <span className="text-xs text-muted-foreground">{tpl.specialty}</span>
                            ) : null}
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {tpl.usageCount}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </PopoverContent>
            </Popover>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasAnyMedication}
              onClick={() => setSaveTemplateOpen(true)}
            >
              <Bookmark className="me-2 h-4 w-4" />
              {t("rx_save_as_template")}
            </Button>
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
                    <MedicationNameInput
                      value={line.medicationName}
                      onChange={(value) => updateLine(index, "medicationName", value)}
                      placeholder={t("rx_medicationPlaceholder")}
                      onApplyDefaults={(defaults) => {
                        setLines((prev) =>
                          prev.map((lineState, i) =>
                            i === index
                              ? { ...lineState, ...defaults }
                              : lineState,
                          ),
                        );
                      }}
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

      <Dialog open={saveTemplateOpen} onOpenChange={setSaveTemplateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("rx_save_as_template")}</DialogTitle>
            <DialogDescription>{t("rx_template_save_desc")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="tpl-name">{t("rx_template_name")}</Label>
              <Input
                id="tpl-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder={t("rx_template_name_placeholder")}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="tpl-specialty">{t("rx_template_specialty")}</Label>
              <Input
                id="tpl-specialty"
                value={templateSpecialty}
                onChange={(e) => setTemplateSpecialty(e.target.value)}
                placeholder={t("rx_template_specialty_placeholder")}
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={templateShared}
                onChange={(e) => setTemplateShared(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 accent-[var(--clinic)]"
              />
              {t("rx_template_share")}
            </label>
            <Button
              type="button"
              onClick={saveTemplate}
              disabled={savingTemplate || !templateName.trim()}
            >
              {savingTemplate ? t("common_loading") : t("rx_save_template")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}