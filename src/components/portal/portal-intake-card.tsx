"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { logClientError } from "@/lib/client-logger";
import { useLocale } from "@/components/locale/locale-provider";
import { SearchableSelect } from "@/components/ui/searchable-select";

interface IntakeField {
  id: string;
  key: string;
  label: string;
  labelAr: string | null;
  kind: string;
  required: boolean;
  options: string | null;
}

interface IntakeForm {
  id: string;
  name: string;
  description: string | null;
  fields: IntakeField[];
}

export function PortalIntakeCard() {
  const { t, lang } = useLocale();
  const [forms, setForms] = React.useState<IntakeForm[]>([]);
  const [submitted, setSubmitted] = React.useState<string[]>([]);
  const [answers, setAnswers] = React.useState<Record<string, Record<string, string>>>({});

  React.useEffect(() => {
    Promise.all([
      fetch("/api/patient-portal/intake/forms").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/patient-portal/intake").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([f, s]) => {
        if (Array.isArray(f)) setForms(f);
        if (Array.isArray(s)) setSubmitted(s.map((x: { formId: string }) => x.formId));
      })
      .catch((e) => logClientError("Intake forms failed", e));
  }, []);

  const setAnswer = (formId: string, key: string, value: string) =>
    setAnswers((prev) => ({ ...prev, [formId]: { ...prev[formId], [key]: value } }));

  const submit = async (form: IntakeForm) => {
    try {
      const payload = answers[form.id] ?? {};
      const response = await fetch("/api/patient-portal/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formId: form.id, answers: payload }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.missing ? `Missing: ${(data.missing as string[]).join(", ")}` : "submit failed",
        );
      }
      setSubmitted((prev) => [...prev, form.id]);
      toast.success(t("portal_intakeThanks"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("portal_intakeError"));
      logClientError("Intake submit failed", error);
    }
  };

  const pending = forms.filter((f) => !submitted.includes(f.id));
  if (forms.length === 0) return null;

  const labelFor = (f: IntakeField) =>
    lang === "ar" && f.labelAr ? f.labelAr : f.label;

  const renderField = (formId: string, field: IntakeField) => {
    const value = answers[formId]?.[field.key] ?? "";
    const common = {
      value,
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
      ) => setAnswer(formId, field.key, e.target.value),
    };
    if (field.kind === "multiline") {
      return <textarea className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" rows={3} {...common} />;
    }
    if (field.kind === "boolean") {
      return (
        <SearchableSelect
          value={value}
          onValueChange={(v) => setAnswer(formId, field.key, v)}
          options={[
            { value: "", label: "—" },
            { value: "yes", label: "Yes / نعم" },
            { value: "no", label: "No / لا" },
          ]}
          placeholder="—"
          triggerClassName="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
        />
      );
    }
    if (field.kind === "choice") {
      let options: string[] = [];
      try {
        options = JSON.parse(field.options ?? "[]");
      } catch {
        options = [];
      }
      return (
        <SearchableSelect
          value={value}
          onValueChange={(v) => setAnswer(formId, field.key, v)}
          options={[
            { value: "", label: "—" },
            ...options.map((o) => ({ value: o, label: o })),
          ]}
          placeholder="—"
          triggerClassName="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
        />
      );
    }
    return (
      <Input
        type={field.kind === "number" ? "number" : field.kind === "date" ? "date" : "text"}
        className="h-9"
        {...common}
      />
    );
  };

  return (
    <Card className="mb-6 border-border bg-card shadow-sm" id="portal-intake">
      <CardHeader>
        <CardTitle>{t("portal_intakeTitle")}</CardTitle>
        <CardDescription>{t("portal_intakeDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("portal_intakeDone")}</p>
          ) : (
            pending.map((form) => (
              <div key={form.id} className="border border-border rounded-lg p-4 space-y-3 bg-muted-bg/30">
                <p className="font-medium text-foreground">{form.name}</p>
                {form.description ? (
                  <p className="text-sm text-muted-foreground">{form.description}</p>
                ) : null}
                {form.fields.map((field) => (
                  <div key={field.id} className="gap-1 flex flex-col">
                    <Label className="text-foreground">
                      {labelFor(field)}
                      {field.required ? " *" : ""}
                    </Label>
                    {renderField(form.id, field)}
                  </div>
                ))}
                <Button size="sm" className="h-9" onClick={() => submit(form)}>
                  {t("portal_intakeSubmit")}
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
