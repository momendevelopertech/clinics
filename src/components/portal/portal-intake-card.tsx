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
      return <textarea className="w-full rounded border bg-background px-3 py-2 text-sm" rows={3} {...common} />;
    }
    if (field.kind === "boolean") {
      return (
        <select className="h-10 rounded-md border bg-background px-3 text-sm" {...common}>
          <option value="">—</option>
          <option value="yes">Yes / نعم</option>
          <option value="no">No / لا</option>
        </select>
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
        <select className="h-10 rounded-md border bg-background px-3 text-sm" {...common}>
          <option value="">—</option>
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      );
    }
    return (
      <Input
        type={field.kind === "number" ? "number" : field.kind === "date" ? "date" : "text"}
        {...common}
      />
    );
  };

  return (
    <Card className="mb-6" id="portal-intake">
      <CardHeader>
        <CardTitle>{t("portal_intakeTitle")}</CardTitle>
        <CardDescription>{t("portal_intakeDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {pending.length === 0 ? (
            <p className="text-sm text-neutral-500">{t("portal_intakeDone")}</p>
          ) : (
            pending.map((form) => (
              <div key={form.id} className="border rounded p-3 space-y-3">
                <p className="font-medium">{form.name}</p>
                {form.description ? (
                  <p className="text-sm text-neutral-500">{form.description}</p>
                ) : null}
                {form.fields.map((field) => (
                  <div key={field.id} className="gap-1 flex flex-col">
                    <Label>
                      {labelFor(field)}
                      {field.required ? " *" : ""}
                    </Label>
                    {renderField(form.id, field)}
                  </div>
                ))}
                <Button size="sm" onClick={() => submit(form)}>
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
