"use client";
import { Eye, Plus } from "lucide-react";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchableSelect } from "@/components/ui/searchable-select";
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
  const [nameHint, setNameHint] = React.useState<string | null>(null);
  const [fieldForm, setFieldForm] = React.useState<Record<string, { label: string; kind: string; required: boolean }>>({});
  const [fieldHints, setFieldHints] = React.useState<Record<string, string>>({});
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [responses, setResponses] = React.useState<Record<string, Array<{ patientName: string; answers: string; createdAt: string }>>>({});

  const load = React.useCallback(async () => {
    try {
      const r = await fetch("/api/intake-forms");
      if (!r.ok) throw new Error("load failed");
      setForms(await r.json());
      setLoadError(null);
    } catch (error) {
      setLoadError(t("intake_error"));
      logClientError("Intake forms load failed", error);
    }
  }, [t]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const createForm = async () => {
    if (!name.trim()) {
      setNameHint(t("common_required"));
      return;
    }
    setNameHint(null);
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
      toast.success(t("common_added"));
      await load();
    } catch (error) {
      toast.error(t("intake_error"));
      logClientError("Intake form create failed", error);
    }
  };

  const addField = async (formId: string) => {
    const f = fieldForm[formId] ?? { label: "", kind: "text", required: false };
    if (!f.label.trim()) {
      setFieldHints((prev) => ({ ...prev, [formId]: t("common_required") }));
      return;
    }
    setFieldHints((prev) => {
      const next = { ...prev };
      delete next[formId];
      return next;
    });
    try {
      const r = await fetch(`/api/intake-forms/${formId}/fields`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: f.label.trim(), kind: f.kind, required: f.required }),
      });
      if (!r.ok) throw new Error("field failed");
      setFieldForm({ ...fieldForm, [formId]: { label: "", kind: "text", required: false } });
      toast.success(t("common_added"));
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
      {loadError ? (
        <p className="text-xs text-destructive">{loadError}</p>
      ) : null}
      <div className="flex gap-2">
        <Input value={name} onChange={(e) => { setName(e.target.value); if (nameHint) setNameHint(null); }} placeholder={t("intake_formName")} className="h-9" aria-required="true" />
        <Button onClick={createForm} disabled={!name.trim()} className="h-9"><Plus className="h-4 w-4 mr-1" />{t("intake_createForm")}</Button>
      </div>
      {nameHint ? (
        <p className="text-xs text-destructive mt-1">{nameHint}</p>
      ) : null}
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
              onChange={(e) => { setF(form.id, { label: e.target.value }); setFieldHints((prev) => { const next = { ...prev }; delete next[form.id]; return next; }); }}
              placeholder={t("intake_fieldLabel")}
              className="h-9"
              aria-required="true"
            />
            <SearchableSelect
              value={fieldForm[form.id]?.kind ?? "text"}
              onValueChange={(v) => setF(form.id, { kind: v })}
              options={KINDS.map((k) => ({ value: k, label: k }))}
              triggerClassName="h-9"
            />
            <label className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox
                checked={fieldForm[form.id]?.required ?? false}
                onCheckedChange={(c) => setF(form.id, { required: c === true })}
              />
              {t("intake_required")}
            </label>
            <Button size="sm" onClick={() => addField(form.id)} disabled={!(fieldForm[form.id]?.label ?? "").trim()} className="h-9">{t("intake_addField")}</Button>
          </div>
          {fieldHints[form.id] ? (
            <p className="text-xs text-destructive mt-1">{fieldHints[form.id]}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
