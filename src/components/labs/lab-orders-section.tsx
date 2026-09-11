"use client";

import * as React from "react";
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
import { toast } from "sonner";
import { logClientError } from "@/lib/client-logger";
import { useLocale } from "@/components/locale/locale-provider";

interface LabOrder {
  id: string;
  testName: string;
  orderType: string;
  priority: string;
  status: string;
  indication: string | null;
  transmittedAt: string | null;
  externalRef: string | null;
  patient: { firstName: string; lastName: string };
}

export function LabOrdersSection({ onChanged }: { onChanged?: () => void }) {
  const { t } = useLocale();
  const [orders, setOrders] = React.useState<LabOrder[]>([]);
  const [ingestId, setIngestId] = React.useState("");
  const [form, setForm] = React.useState({ resultValue: "", unit: "", referenceRange: "" });

  const load = React.useCallback(async () => {
    try {
      const r = await fetch("/api/lab-orders");
      if (r.ok) setOrders(await r.json());
    } catch (error) {
      logClientError("Lab orders load failed", error);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const transmit = async (id: string) => {
    try {
      const r = await fetch(`/api/lab-orders/${id}/transmit`, { method: "POST" });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error(data.error || "transmit failed");
      }
      const data = await r.json();
      const blob = new Blob([JSON.stringify(data.payload, null, 2)], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lab-order-${data.externalRef}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(t("lab_transmitted"));
      await load();
      onChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("lab_error"));
      logClientError("Lab transmit failed", error);
    }
  };

  const ingest = async () => {
    if (!ingestId || !form.resultValue.trim()) return;
    try {
      const r = await fetch(`/api/lab-orders/${ingestId}/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resultValue: form.resultValue.trim(),
          unit: form.unit || undefined,
          referenceRange: form.referenceRange || undefined,
        }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error(data.error || "ingest failed");
      }
      toast.success(t("lab_ingested"));
      setIngestId("");
      setForm({ resultValue: "", unit: "", referenceRange: "" });
      await load();
      onChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("lab_error"));
      logClientError("Lab ingest failed", error);
    }
  };

  if (orders.length === 0) return null;

  return (
    <div className="bg-white dark:bg-neutral-900 border rounded-[5px] shadow-sm flex flex-col p-6 gap-3">
      <h3 className="font-semibold">{t("lab_ordersTitle")}</h3>
      {orders.slice(0, 20).map((o) => (
        <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded border px-3 py-2 text-sm">
          <span>
            <span className="font-medium">{o.testName}</span> · {o.patient.firstName}{" "}
            {o.patient.lastName} · {o.status}
            {o.externalRef ? ` · ${o.externalRef}` : ""}
          </span>
          <span className="flex gap-2">
            {!o.transmittedAt && (o.status === "ordered" || o.status === "collected") ? (
              <Button size="sm" variant="outline" onClick={() => transmit(o.id)}>
                {t("lab_transmit")}
              </Button>
            ) : null}
            {o.status !== "reviewed" && o.status !== "cancelled" ? (
              <Dialog
                open={ingestId === o.id}
                onOpenChange={(open) => setIngestId(open ? o.id : "")}
              >
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">{t("lab_ingest")}</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>{o.testName}</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col gap-3">
                    <div className="gap-2 flex flex-col">
                      <Label>{t("lab_resultValue")}</Label>
                      <Input
                        value={form.resultValue}
                        onChange={(e) => setForm({ ...form, resultValue: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="gap-2 flex flex-col">
                        <Label>{t("lab_unit")}</Label>
                        <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
                      </div>
                      <div className="gap-2 flex flex-col">
                        <Label>{t("lab_range")}</Label>
                        <Input
                          value={form.referenceRange}
                          onChange={(e) => setForm({ ...form, referenceRange: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button size="sm" onClick={ingest}>{t("lab_ingest")}</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            ) : null}
          </span>
        </div>
      ))}
    </div>
  );
}
