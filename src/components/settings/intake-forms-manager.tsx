"use client";

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
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("intake_formName")} />
        <Button onClick={createForm} disabled={!name.trim()}>{t("intake_createForm")}</Button>
      </div>
      {forms.map((form) => (
        <div key={form.id} className="rounded border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-medium text-sm">{form.name}</p>
            <Button size="sm" variant="outline" onClick={() => viewResponses(form.id)}>
              {t("intake_viewResponses")}
            </Button>
          </div>
          {form.fields.map((f) => (
            <p key={f.id} className="text-xs text-neutral-500">
              {f.label} · {f.kind}{f.required ? " *" : ""}
            </p>
          ))}
          {(responses[form.id] ?? []).map((r, i) => (
            <p key={i} className="text-xs rounded bg-neutral-50 dark:bg-neutral-800 p-2">
              <span className="font-medium">{r.patientName}</span> ·{" "}
              {new Date(r.createdAt).toLocaleDateString()} · {r.answers}
            </p>
          ))}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-t pt-2">
            <Input
              value={fieldForm[form.id]?.label ?? ""}
              onChange={(e) => setF(form.id, { label: e.target.value })}
              placeholder={t("intake_fieldLabel")}
            />
            <Select
              value={fieldForm[form.id]?.kind ?? "text"}
              onValueChange={(v) => setF(form.id, { kind: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {KINDS.map((k) => (
                  <SelectItem key={k} value={k}>{k}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={fieldForm[form.id]?.required ?? false}
                onCheckedChange={(c) => setF(form.id, { required: c === true })}
              />
              {t("intake_required")}
            </label>
            <Button size="sm" onClick={() => addField(form.id)}>{t("intake_addField")}</Button>
          </div>
        </div>
      ))}
    </div>
  );
}
