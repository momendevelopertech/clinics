"use client";
import { Download, Send } from "lucide-react";

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
    <div className="rounded-lg border border-border bg-card p-6 shadow-xs flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">{t("lab_ordersTitle")}</h3>
      </div>
      <div className="flex flex-col gap-2">
        {orders.slice(0, 20).map((o) => (
          <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-muted/20 px-3.5 py-2.5 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{o.testName}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">
                {o.patient.firstName} {o.patient.lastName}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                {o.status}
              </span>
              {o.externalRef ? (
                <span className="font-mono text-xs text-muted-foreground">
                  · {o.externalRef}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {!o.transmittedAt && (o.status === "ordered" || o.status === "collected") ? (
                <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => transmit(o.id)}>
                  <Send className="h-3.5 w-3.5" />
                  {t("lab_transmit")}
                </Button>
              ) : null}
              {o.status !== "reviewed" && o.status !== "cancelled" ? (
                <Dialog
                  open={ingestId === o.id}
                  onOpenChange={(open) => setIngestId(open ? o.id : "")}
                >
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="h-8 gap-1.5">
                      <Download className="h-3.5 w-3.5" />
                      {t("lab_ingest")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>{o.testName}</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-3 pt-2">
                      <div className="gap-1.5 flex flex-col">
                        <Label>{t("lab_resultValue")}</Label>
                        <Input
                          value={form.resultValue}
                          onChange={(e) => setForm({ ...form, resultValue: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="gap-1.5 flex flex-col">
                          <Label>{t("lab_unit")}</Label>
                          <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
                        </div>
                        <div className="gap-1.5 flex flex-col">
                          <Label>{t("lab_range")}</Label>
                          <Input
                            value={form.referenceRange}
                            onChange={(e) => setForm({ ...form, referenceRange: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end pt-2">
                        <Button size="sm" className="h-9 gap-1.5" onClick={ingest}>
                          <Download className="h-4 w-4" />
                          {t("lab_ingest")}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
