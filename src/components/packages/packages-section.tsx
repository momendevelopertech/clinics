"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

interface Pkg {
  id: string;
  name: string;
  totalSessions: number;
  price: number | string;
  active: boolean;
}

interface Balance {
  id: string;
  sessionsTotal: number;
  sessionsUsed: number;
  status: string;
  package: { name: string };
  patient: { firstName: string; lastName: string };
}

export function PackagesSection() {
  const { t } = useLocale();
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [patients, setPatients] = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);
  const [form, setForm] = useState({ name: "", sessions: "8", price: "" });
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignPkg, setAssignPkg] = useState("");
  const [assignPatient, setAssignPatient] = useState("");

  const load = useCallback(async () => {
    try {
      const [p, b] = await Promise.all([
        fetch("/api/packages").then((r) => (r.ok ? r.json() : [])),
        fetch("/api/patient-packages").then((r) => (r.ok ? r.json() : [])),
      ]);
      if (Array.isArray(p)) setPackages(p);
      if (Array.isArray(b)) setBalances(b);
    } catch (error) {
      logClientError("Packages load failed", error);
    }
  }, []);

  useEffect(() => {
    void load();
    fetch("/api/patients")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setPatients(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [load]);

  const handleCreate = async () => {
    try {
      const r = await fetch("/api/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          totalSessions: Number(form.sessions),
          price: Number(form.price),
        }),
      });
      if (!r.ok) throw new Error("create failed");
      setForm({ name: "", sessions: "8", price: "" });
      await load();
    } catch (error) {
      toast.error(t("pkg_error"));
      logClientError("Package create failed", error);
    }
  };

  const handleAssign = async () => {
    try {
      const r = await fetch("/api/patient-packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: assignPatient, packageId: assignPkg }),
      });
      if (!r.ok) throw new Error("assign failed");
      toast.success(t("pkg_assignDone"));
      setAssignOpen(false);
      await load();
    } catch (error) {
      toast.error(t("pkg_error"));
      logClientError("Package assign failed", error);
    }
  };

  const handleConsume = async (id: string) => {
    try {
      const r = await fetch(`/api/patient-packages/${id}/consume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error(data.error || "consume failed");
      }
      toast.success(t("pkg_consumeDone"));
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("pkg_error"));
      logClientError("Package consume failed", error);
    }
  };

  return (
    <section className="rounded-xl border bg-white p-5 dark:bg-neutral-900">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t("pkg_title")}</h2>
          <p className="text-sm text-muted-foreground">{t("pkg_subtitle")}</p>
        </div>
        <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">{t("pkg_assign")}</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("pkg_assign")}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <div className="gap-2 flex flex-col">
                <Label>{t("pkg_title")}</Label>
                <Select value={assignPkg} onValueChange={setAssignPkg}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {packages.filter((p) => p.active).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} · {p.totalSessions}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="gap-2 flex flex-col">
                <Label>{t("pkg_patient")}</Label>
                <Select value={assignPatient} onValueChange={setAssignPatient}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.firstName} {p.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleAssign} disabled={!assignPkg || !assignPatient}>
                  {t("pkg_assign")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="gap-2 flex flex-col">
          <Label>{t("pkg_name")}</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="gap-2 flex flex-col">
          <Label>{t("pkg_sessions")}</Label>
          <Input type="number" min="1" value={form.sessions} onChange={(e) => setForm({ ...form, sessions: e.target.value })} />
        </div>
        <div className="gap-2 flex flex-col">
          <Label>{t("pkg_price")}</Label>
          <Input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        </div>
        <div className="flex items-end">
          <Button onClick={handleCreate} disabled={!form.name.trim() || !form.price}>
            {t("pkg_create")}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {packages.map((p) => (
          <div key={p.id} className="flex justify-between rounded-lg border p-3 text-sm">
            <span>{p.name} · {p.totalSessions} {t("pkg_sessions")}</span>
            <span>{Number(p.price).toFixed(2)}</span>
          </div>
        ))}
        {!packages.length ? <p className="text-sm text-muted-foreground">{t("pkg_empty")}</p> : null}
      </div>

      <h3 className="mt-5 mb-2 font-medium">{t("pkg_patient")}</h3>
      <div className="space-y-2">
        {balances.map((b) => (
          <div key={b.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
            <span>
              {b.patient.firstName} {b.patient.lastName} · {b.package.name} ·{" "}
              {b.sessionsTotal - b.sessionsUsed} {t("pkg_remaining")} · {b.status}
            </span>
            {b.status === "active" && b.sessionsTotal - b.sessionsUsed > 0 ? (
              <Button size="sm" variant="outline" onClick={() => handleConsume(b.id)}>
                {t("pkg_consume")}
              </Button>
            ) : null}
          </div>
        ))}
        {!balances.length ? <p className="text-sm text-muted-foreground">{t("pkg_noBalances")}</p> : null}
      </div>
    </section>
  );
}
