"use client";

import * as React from "react";
import {
  ClipboardPlus,
  Plus,
} from "lucide-react";;
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "sonner";
import { useLocale } from "@/components/locale/locale-provider";
import { logClientError } from "@/lib/client-logger";

type Patient = { id: string; firstName: string; lastName: string };

export function AddLabOrderDialog({ onSuccess }: { onSuccess: () => void }) {
  const { t } = useLocale();
  const [open, setOpen] = React.useState(false);
  const [patients, setPatients] = React.useState<Patient[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [form, setForm] = React.useState({ patientId: "", orderType: "lab", testName: "", priority: "routine", indication: "" });
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!open) return;
    fetch("/api/patients")
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Failed to fetch patients")))
      .then(setPatients)
      .catch((error) => {
        toast.error(t("common_loadPatientsError"));
        logClientError("Lab order patient lookup failed", error);
      });
  }, [open, t]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!form.patientId) errors.patientId = t("labs_orderRequired");
    if (!form.testName.trim()) errors.testName = t("labs_orderRequired");
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error(t("labs_orderRequired"));
      return;
    }
    setFieldErrors({});
    try {
      setLoading(true);
      const response = await fetch("/api/lab-orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!response.ok) throw new Error("Failed to create lab order");
      toast.success(t("labs_orderAdded"));
      setOpen(false);
      setForm({ patientId: "", orderType: "lab", testName: "", priority: "routine", indication: "" });
      onSuccess();
    } catch (error) {
      toast.error(t("labs_orderError"));
      logClientError("Create lab order failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-9 gap-2">
          <ClipboardPlus className="h-4 w-4" />
          {t("labs_addOrder")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("labs_orderTitle")}</DialogTitle>
          <DialogDescription>{t("labs_orderDesc")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-1.5">
            <Label>{t("labs_patientRequired")}</Label>
            <SearchableSelect
              value={form.patientId}
              onValueChange={(value) => {
                setForm({ ...form, patientId: value });
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.patientId;
                  return next;
                });
              }}
              options={patients.map((patient) => ({
                value: patient.id,
                label: `${patient.firstName} ${patient.lastName}`,
              }))}
              placeholder={t("labs_selectPatient")}
            />
            {fieldErrors.patientId ? (
              <p className="text-xs text-destructive mt-1">{fieldErrors.patientId}</p>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>{t("labs_orderType")}</Label>
              <SearchableSelect
                value={form.orderType}
                onValueChange={(value) => setForm({ ...form, orderType: value })}
                options={[
                  { value: "lab", label: t("labs_typeLab") },
                  { value: "imaging", label: t("labs_typeImaging") },
                ]}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("labs_priority")}</Label>
              <SearchableSelect
                value={form.priority}
                onValueChange={(value) => setForm({ ...form, priority: value })}
                options={[
                  { value: "routine", label: t("labs_routine") },
                  { value: "urgent", label: t("labs_urgent") },
                  { value: "stat", label: t("labs_stat") },
                ]}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("labs_testName")}</Label>
            <Input
              value={form.testName}
              onChange={(event) => {
                setForm({ ...form, testName: event.target.value });
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.testName;
                  return next;
                });
              }}
              aria-required="true"
              aria-invalid={fieldErrors.testName ? true : undefined}
              className={fieldErrors.testName ? "border-destructive" : undefined}
            />
            {fieldErrors.testName ? (
              <p className="text-xs text-destructive mt-1">{fieldErrors.testName}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("labs_indication")}</Label>
            <Input value={form.indication} onChange={(event) => setForm({ ...form, indication: event.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              {t("common_cancel")}
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              <Plus className="h-4 w-4" />
              {loading ? t("labs_ordering") : t("labs_addOrder")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
