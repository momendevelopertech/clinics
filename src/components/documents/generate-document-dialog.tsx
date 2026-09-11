"use client";

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
        throw new Error(
          data.missing ? `Missing: ${(data.missing as string[]).join(", ")}` : data.error || "Generate failed",
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
      toast.success(t("doc_genSuccess"));
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
        <Button variant="outline">{t("doc_generate")}</Button>
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
              <Select value={templateId} onValueChange={(v) => { setTemplateId(v); setFields({}); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {templates.map((x) => (
                    <SelectItem key={x.id} value={x.id}>{tplLabel(x.id)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="gap-2 flex flex-col">
              <Label>{t("doc_genPatient")}</Label>
              <Select value={patientId} onValueChange={(v) => { setPatientId(v); setEncounterId(""); setLabOrderId(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="gap-2 flex flex-col">
              <Label>{t("doc_genEncounter")}</Label>
              <Select value={encounterId} onValueChange={setEncounterId}>
                <SelectTrigger><SelectValue placeholder={t("doc_genNoEncounter")} /></SelectTrigger>
                <SelectContent>
                  {encounters.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {new Date(e.startTime).toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {template?.needsLabOrder ? (
              <div className="gap-2 flex flex-col">
                <Label>{t("doc_genLabOrder")}</Label>
                <Select value={labOrderId} onValueChange={setLabOrderId}>
                  <SelectTrigger><SelectValue placeholder={t("doc_genNoOrder")} /></SelectTrigger>
                  <SelectContent>
                    {orders.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.testName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>
          {visibleFields.map((f) => (
            <div key={f} className="gap-2 flex flex-col">
              <Label>{t(FIELD_KEYS[f] ?? f)}</Label>
              <Input
                value={fields[f] ?? ""}
                onChange={(e) => setFields({ ...fields, [f]: e.target.value })}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            {t("common_cancel")}
          </Button>
          <Button onClick={handleGenerate} disabled={!templateId || !patientId || saving}>
            {saving ? t("doc_genGenerating") : t("doc_genCreate")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
