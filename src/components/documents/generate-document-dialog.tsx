"use client";
import { FileText, X } from "lucide-react";

import * as React from "react";
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
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "sonner";
import { logClientError } from "@/lib/client-logger";
import { useLocale } from "@/components/locale/locale-provider";
import { usePostActionGuidance } from "@/hooks/use-post-action-guidance";

interface TemplateMeta {
  id: string;
  requiredFields: string[];
  needsLabOrder: boolean;
}

interface PatientOption {
  id: string;
  firstName: string;
  lastName: string;
}

const FIELD_KEYS: Record<string, string> = {
  referredTo: "doc_field_referredTo",
  specialty: "doc_field_specialty",
  reason: "doc_field_reason",
  restDays: "doc_field_restDays",
  startDate: "doc_field_startDate",
  diagnosisText: "doc_field_diagnosisText",
  testName: "doc_field_testName",
  indication: "doc_field_indication",
  summary: "doc_field_summary",
  instructions: "doc_field_instructions",
};

const OPTIONAL_FIELDS: Record<string, string[]> = {
  referral: [],
  medical_report: ["summary"],
  lab_request: ["testName", "indication"],
  imaging_request: ["testName", "indication"],
  discharge_summary: ["instructions"],
  sick_leave: [],
};

export function GenerateDocumentDialog({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [templates, setTemplates] = React.useState<TemplateMeta[]>([]);
  const [patients, setPatients] = React.useState<PatientOption[]>([]);
  const [encounters, setEncounters] = React.useState<Array<{ id: string; startTime: string }>>([]);
  const [orders, setOrders] = React.useState<Array<{ id: string; testName: string }>>([]);
  const [templateId, setTemplateId] = React.useState("");
  const [patientId, setPatientId] = React.useState("");
  const [encounterId, setEncounterId] = React.useState("");
  const [labOrderId, setLabOrderId] = React.useState("");
  const [fields, setFields] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const { t } = useLocale();
  const { triggerGuidance } = usePostActionGuidance();

  const template = templates.find((x) => x.id === templateId) ?? null;
  const visibleFields = [
    ...(template?.requiredFields ?? []),
    ...(OPTIONAL_FIELDS[templateId] ?? []),
  ];

  React.useEffect(() => {
    if (!open) return;
    fetch("/api/documents/templates")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setTemplates(Array.isArray(d) ? d : []))
      .catch((e) => logClientError("Template list failed", e));
    fetch("/api/patients")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setPatients(Array.isArray(d) ? d : []))
      .catch((e) => logClientError("Patient list failed", e));
  }, [open ]);

  React.useEffect(() => {
    if (!open || !patientId) {
      setEncounters([]);
      setOrders([]);
      return;
    }
    fetch(`/api/encounters?patientId=${patientId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setEncounters(Array.isArray(d) ? d : []))
      .catch(() => setEncounters([]));
    fetch(`/api/lab-orders?patientId=${patientId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setOrders(Array.isArray(d) ? d : []))
      .catch(() => setOrders([]));
  }, [open, patientId]);

  const tplLabel = (id: string) => {
    const key = `doc_tpl_${id}`;
    const v = t(key);
    return v === key ? id : v;
  };

  const handleGenerate = async () => {
    if (!templateId || !patientId || saving) return;
    try {
      setSaving(true);
      const response = await fetch("/api/documents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: templateId,
          patientId,
          encounterId: encounterId || undefined,
          labOrderId: labOrderId || undefined,
          fields,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const missing = Array.isArray(data.missing) ? (data.missing as string[]) : null;
        throw new Error(
          missing && missing.length > 0
            ? `Missing: ${missing.map((k) => t(FIELD_KEYS[k] ?? k)).join(", ")}`
            : data.error || "Generate failed",
        );
      }
      if (response.headers.get("X-Document-Persisted") === "0") {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${templateId}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
      triggerGuidance("document_generated", t("doc_genSuccess"));
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("doc_genError"));
      logClientError("Document generate failed", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-9"><FileText className="h-4 w-4 mr-1" />{t("doc_generate")}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("doc_genTitle")}</DialogTitle>
          <DialogDescription>{t("doc_genDesc")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="gap-2 flex flex-col">
              <Label>{t("doc_genTemplate")}</Label>
              <SearchableSelect value={templateId} onValueChange={(v) => { setTemplateId(v); setFields({}); }} options={templates.map((x) => ({ value: x.id, label: tplLabel(x.id) }))} triggerClassName="h-9" />
            </div>
            <div className="gap-2 flex flex-col">
              <Label>{t("doc_genPatient")}</Label>
              <SearchableSelect value={patientId} onValueChange={(v) => { setPatientId(v); setEncounterId(""); setLabOrderId(""); }} options={patients.map((p) => ({ value: p.id, label: `${p.firstName} ${p.lastName}` }))} triggerClassName="h-9" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="gap-2 flex flex-col">
              <Label>{t("doc_genEncounter")}</Label>
              <SearchableSelect value={encounterId} onValueChange={setEncounterId} options={encounters.map((e) => ({ value: e.id, label: new Date(e.startTime).toLocaleDateString() }))} placeholder={t("doc_genNoEncounter")} triggerClassName="h-9" />
            </div>
            {template?.needsLabOrder ? (
              <div className="gap-2 flex flex-col">
                <Label>{t("doc_genLabOrder")}</Label>
                <SearchableSelect value={labOrderId} onValueChange={setLabOrderId} options={orders.map((o) => ({ value: o.id, label: o.testName }))} placeholder={t("doc_genNoOrder")} triggerClassName="h-9" />
              </div>
            ) : null}
          </div>
          {visibleFields.map((f) => {
            const isRequired = template?.requiredFields?.includes(f) ?? false;
            return (
            <div key={f} className="gap-2 flex flex-col">
              <Label>{t(FIELD_KEYS[f] ?? f)} {isRequired ? "*" : `(${t("common_optional")})`}</Label>
              <Input
                value={fields[f] ?? ""}
                onChange={(e) => setFields({ ...fields, [f]: e.target.value })}
                className="h-9"
                aria-required={isRequired ? true : undefined}
              />
            </div>
            );
          })}
        </div>
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving} className="h-9">
            <X className="h-4 w-4 mr-1" />{t("common_cancel")}
          </Button>
          <Button onClick={handleGenerate} disabled={!templateId || !patientId || saving} className="h-9">
            <FileText className="h-4 w-4 mr-1" />{saving ? t("doc_genGenerating") : t("doc_genCreate")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
