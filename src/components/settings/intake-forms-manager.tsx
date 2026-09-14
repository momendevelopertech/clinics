"use client";
import { Eye, Plus } from "lucide-react";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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

interface IntakeField {
  id: string;
  key: string;
  label: string;
  kind: string;
  required: boolean;
}

interface IntakeForm {
  id: string;
  name: string;
  description: string | null;
  fields: IntakeField[];
}

const KINDS = ["text", "multiline", "number", "date", "boolean", "choice"];

export function IntakeFormsManager() {
  const { t } = useLocale();
  const [forms, setForms] = React.useState<IntakeForm[]>([]);
  const [name, setName] = React.useState("");
  const [fieldForm, setFieldForm] = React.useState<Record<string, { label: string; kind: string; required: boolean }>>({});
  const [responses, setResponses] = React.useState<Record<string, Array<{ patientName: string; answers: string; createdAt: string }>>>({});

  const load = React.useCallback(async () => {
    try {
      const r = await fetch("/api/intake-forms");
      if (r.ok) setForms(await r.json());
    } catch (error) {
      logClientError("Intake forms load failed", error);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const createForm = async () => {
    if (!name.trim()) return;
    try {
      const r = await fetch("/api/intake-forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (r.status === 403) {
        toast.error(t("staff_ownerOnly"));
        return;
      }
      if (!r.ok) throw new Error("create failed");
      setName("");
      await load();
    } catch (error) {
      toast.error(t("intake_error"));
      logClientError("Intake form create failed", error);
    }
  };

  const addField = async (formId: string) => {
    const f = fieldForm[formId] ?? { label: "", kind: "text", required: false };
    if (!f.label.trim()) return;
    try {
      const r = await fetch(`/api/intake-forms/${formId}/fields`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: f.label.trim(), kind: f.kind, required: f.required }),
      });
      if (!r.ok) throw new Error("field failed");
      setFieldForm({ ...fieldForm, [formId]: { label: "", kind: "text", required: false } });
      await load();
    } catch (error) {
      toast.error(t("intake_error"));
      logClientError("Intake field create failed", error);
    }
  };

  const viewResponses = async (formId: string) => {
    try {
      const r = await fetch(`/api/intake-responses?formId=${formId}`);
      if (!r.ok) throw new Error("responses failed");
      const data = await r.json();
      setResponses((prev) => ({
        ...prev,
        [formId]: data.map((x: { patient: { firstName: string; lastName: string }; answers: string; createdAt: string }) => ({
          patientName: `${x.patient.firstName} ${x.patient.lastName}`,
          answers: x.answers,
          createdAt: x.createdAt,
        })),
      }));
    } catch (error) {
      toast.error(t("intake_error"));
      logClientError("Intake responses failed", error);
    }
  };

  const setF = (formId: string, patch: Partial<{ label: string; kind: string; required: boolean }>) =>
    setFieldForm((prev) => {
      const current = prev[formId] ?? { label: "", kind: "text", required: false };
      return { ...prev, [formId]: { ...current, ...patch } };
    });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("intake_formName")} className="h-9" />
        <Button onClick={createForm} disabled={!name.trim()} className="h-9"><Plus className="h-4 w-4 mr-1" />{t("intake_createForm")}</Button>
      </div>
      {forms.map((form) => (
        <div key={form.id} className="rounded-lg border border-border bg-card p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="font-medium text-sm text-foreground">{form.name}</p>
            <Button size="sm" variant="outline" onClick={() => viewResponses(form.id)} className="h-8">
              <Eye className="h-3.5 w-3.5 mr-1" />{t("intake_viewResponses")}
            </Button>
          </div>
          {form.fields.map((f) => (
            <p key={f.id} className="text-xs text-muted-foreground">
              {f.label} · {f.kind}{f.required ? " *" : ""}
            </p>
          ))}
          {(responses[form.id] ?? []).map((r, i) => (
            <p key={i} className="text-xs rounded-md bg-muted-bg border border-border/60 p-2.5 text-foreground">
              <span className="font-medium text-foreground">{r.patientName}</span> ·{" "}
              <span className="text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span> · {r.answers}
            </p>
          ))}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-border pt-3">
            <Input
              value={fieldForm[form.id]?.label ?? ""}
              onChange={(e) => setF(form.id, { label: e.target.value })}
              placeholder={t("intake_fieldLabel")}
              className="h-9"
            />
            <Select
              value={fieldForm[form.id]?.kind ?? "text"}
              onValueChange={(v) => setF(form.id, { kind: v })}
            >
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {KINDS.map((k) => (
                  <SelectItem key={k} value={k}>{k}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox
                checked={fieldForm[form.id]?.required ?? false}
                onCheckedChange={(c) => setF(form.id, { required: c === true })}
              />
              {t("intake_required")}
            </label>
            <Button size="sm" onClick={() => addField(form.id)} className="h-9">{t("intake_addField")}</Button>
          </div>
        </div>
      ))}
    </div>
  );
}
