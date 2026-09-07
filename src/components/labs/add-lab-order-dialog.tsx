"use client";

import * as React from "react";
import { ClipboardPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    if (!form.patientId || !form.testName.trim()) {
      toast.error(t("labs_orderRequired"));
      return;
    }
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
      <DialogTrigger asChild><Button variant="outline"><ClipboardPlus className="mr-2 h-4 w-4" />{t("labs_addOrder")}</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("labs_orderTitle")}</DialogTitle><DialogDescription>{t("labs_orderDesc")}</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2"><Label>{t("labs_patientRequired")}</Label><Select value={form.patientId} onValueChange={(value) => setForm({ ...form, patientId: value })}><SelectTrigger><SelectValue placeholder={t("labs_selectPatient")} /></SelectTrigger><SelectContent>{patients.map((patient) => <SelectItem key={patient.id} value={patient.id}>{patient.firstName} {patient.lastName}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2"><Label>{t("labs_orderType")}</Label><Select value={form.orderType} onValueChange={(value) => setForm({ ...form, orderType: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="lab">{t("labs_typeLab")}</SelectItem><SelectItem value="imaging">{t("labs_typeImaging")}</SelectItem></SelectContent></Select></div>
            <div className="flex flex-col gap-2"><Label>{t("labs_priority")}</Label><Select value={form.priority} onValueChange={(value) => setForm({ ...form, priority: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="routine">{t("labs_routine")}</SelectItem><SelectItem value="urgent">{t("labs_urgent")}</SelectItem><SelectItem value="stat">{t("labs_stat")}</SelectItem></SelectContent></Select></div>
          </div>
          <div className="flex flex-col gap-2"><Label>{t("labs_testName")}</Label><Input value={form.testName} onChange={(event) => setForm({ ...form, testName: event.target.value })} /></div>
          <div className="flex flex-col gap-2"><Label>{t("labs_indication")}</Label><Input value={form.indication} onChange={(event) => setForm({ ...form, indication: event.target.value })} /></div>
          <Button type="submit" disabled={loading}>{loading ? t("labs_ordering") : t("labs_addOrder")}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
