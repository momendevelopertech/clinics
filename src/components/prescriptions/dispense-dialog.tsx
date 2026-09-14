"use client";

import * as React from "react";
import { PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "sonner";
import { logClientError } from "@/lib/client-logger";
import { useLocale } from "@/components/locale/locale-provider";

type StockRow = {
  id: string;
  name: string;
  quantity: number;
  unit: string | null;
  lowStock: boolean;
  outOfStock: boolean;
};

type DispenseLine = {
  medicationName: string;
  dosage?: string | null;
  stockId: string;
  quantity: string;
  stockOptions: StockRow[];
};

/**
 * G5/G8: Pharmacist dispense dialog. Each Rx line is matched to a stock
 * item (auto-matched by name, changeable), quantity defaults to 1.
 * Submit deducts stock and completes the Rx in one server transaction.
 */
export function DispenseDialog({
  prescriptionId,
  lines,
  patientLabel,
  onDone,
}: {
  prescriptionId: string;
  lines: { medicationName: string; dosage?: string | null }[];
  patientLabel: string;
  onDone: () => void;
}) {
  const { t } = useLocale();
  const [open, setOpen] = React.useState(false);
  const [rows, setRows] = React.useState<DispenseLine[]>([]);
  const [saving, setSaving] = React.useState(false);

  const matchStock = React.useCallback(async (name: string): Promise<StockRow[]> => {
    try {
      const res = await fetch(`/api/medications/search?q=${encodeURIComponent(name)}&limit=5`);
      if (!res.ok) return [];
      const data = (await res.json()) as StockRow[];
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }, []);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      const next: DispenseLine[] = await Promise.all(
        lines.map(async (l) => {
          const options = await matchStock(l.medicationName);
          const exact =
            options.find((o) => o.name.toLowerCase() === l.medicationName.toLowerCase()) ??
            options[0];
          return {
            medicationName: l.medicationName,
            dosage: l.dosage,
            stockId: exact?.id ?? "",
            quantity: "1",
            stockOptions: options,
          };
        }),
      );
      if (!cancelled) setRows(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, lines, matchStock]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch(`/api/prescriptions/${prescriptionId}/dispense`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: rows.map((r) => ({
            medicationName: r.medicationName,
            inventoryItemId: r.stockId || null,
            quantity: Math.max(1, Number(r.quantity) || 1),
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || t("rx_dispenseError"));
      toast.success(t("rx_dispenseSuccess"));
      setOpen(false);
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("rx_dispenseError"));
      logClientError("Dispense failed", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8">
          <PackageCheck className="mr-1 h-3.5 w-3.5" />
          {t("rx_dispense")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("rx_dispenseTitle")}</DialogTitle>
          <DialogDescription>{patientLabel}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3">
          {rows.map((row, i) => (
            <div key={i} className="rounded-lg border border-border p-3">
              <p className="text-sm font-semibold text-foreground">
                {row.medicationName}
                {row.dosage ? <span className="ms-2 text-xs font-normal text-muted-foreground">{row.dosage}</span> : null}
              </p>
              {row.stockOptions.length === 0 ? (
                <p className="mt-1 text-xs text-warning-text">{t("rx_dispenseNoStock")}</p>
              ) : (
                <div className="mt-2 grid grid-cols-[1fr_80px] gap-2">
                  <SearchableSelect
                    value={row.stockId}
                    onValueChange={(v) =>
                      setRows((prev) => prev.map((r, j) => (j === i ? { ...r, stockId: v } : r)))
                    }
                    options={row.stockOptions.map((o) => ({
                      value: o.id,
                      label: `${o.name} · ${o.outOfStock ? t("rx_stockOut") : `${o.quantity} ${o.unit ?? ""}`}`,
                    }))}
                    placeholder={t("rx_dispensePickStock")}
                    triggerClassName="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                  />
                  <div className="flex flex-col gap-1">
                    <Label className="text-[11px] font-semibold">{t("print_qty")}</Label>
                    <Input
                      value={row.quantity}
                      onChange={(e) =>
                        setRows((prev) => prev.map((r, j) => (j === i ? { ...r, quantity: e.target.value } : r)))
                      }
                      inputMode="numeric"
                      className="ltr-on-rtl h-9"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
          <div className="flex justify-end gap-2 border-t border-border pt-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              {t("common_cancel")}
            </Button>
            <Button type="submit" disabled={saving || rows.length === 0}>
              {saving ? t("common_saving") : t("rx_dispenseConfirm")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
