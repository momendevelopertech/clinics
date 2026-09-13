"use client";
import { CreditCard, Plus, Wallet } from "lucide-react";

import * as React from "react";
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

interface InstallmentRow {
  id: string;
  dueDate: string;
  amount: number | string;
  status: string;
}

interface InstallmentPlanRow {
  id: string;
  status: string;
  totalAmount: number | string;
  downPayment: number | string;
  installments: InstallmentRow[];
}

export function InstallmentPlansDialog({ invoiceId, onSuccess }: { invoiceId: string; onSuccess?: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [plans, setPlans] = React.useState<InstallmentPlanRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [count, setCount] = React.useState("4");
  const [firstDue, setFirstDue] = React.useState("");
  const [frequency, setFrequency] = React.useState("monthly");
  const [downPayment, setDownPayment] = React.useState("");
  const [method, setMethod] = React.useState("cash");
  const { t } = useLocale();

  const fetchPlans = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/installment-plans?invoiceId=${invoiceId}`);
      if (!response.ok) throw new Error("Failed to load plans");
      setPlans(await response.json());
    } catch (error) {
      logClientError("Installment plans fetch failed", error);
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  React.useEffect(() => {
    if (open) void fetchPlans();
  }, [open, fetchPlans]);

  const handleCreate = async () => {
    try {
      const response = await fetch("/api/installment-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId,
          count: Number(count),
          firstDueDate: firstDue ? new Date(firstDue).toISOString() : undefined,
          frequency,
          downPayment: downPayment ? Number(downPayment) : 0,
          method,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Create failed");
      }
      toast.success(t("inst_createSuccess"));
      await fetchPlans();
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("inst_createError"));
      logClientError("Installment plan create failed", error);
    }
  };

  const handlePay = async (planId: string, installmentId: string) => {
    try {
      const response = await fetch(`/api/installment-plans/${planId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ installmentId, method }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Pay failed");
      }
      toast.success(t("inst_paySuccess"));
      await fetchPlans();
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("inst_payError"));
      logClientError("Installment pay failed", error);
    }
  };

  const dueLabel = (status: string) => {
    if (status === "paid") return t("inst_paid");
    if (status === "overdue") return t("inst_overdue");
    if (status === "cancelled") return t("inst_cancelled");
    return t("inst_pending");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="link" className="p-0 h-auto text-xs font-semibold text-primary hover:underline">
          <Wallet className="w-3.5 h-3.5 mr-1" />{t("billing_installments")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("inst_title")}</DialogTitle>
          <DialogDescription>{t("inst_new")}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-xs text-muted-foreground py-4 text-center">{t("common_loading")}</p>
        ) : plans.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">{t("inst_noPlans")}</p>
        ) : (
          <div className="flex flex-col gap-3 max-h-64 overflow-y-auto py-1">
            {plans.map((plan) => (
              <div key={plan.id} className="rounded-lg border border-border bg-card p-3 shadow-2xs">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className={plan.status === "active" ? "text-success-text font-bold" : "text-muted-foreground"}>
                    {plan.status === "active" ? t("inst_active") : plan.status === "completed" ? t("inst_completed") : t("inst_cancelled")}
                  </span>
                  <span className="font-mono text-foreground">${Number(plan.totalAmount).toFixed(2)}</span>
                </div>
                <div className="mt-2.5 flex flex-col gap-1.5">
                  {plan.installments.map((due) => (
                    <div key={due.id} className="flex items-center justify-between text-xs rounded-md bg-muted-bg/50 px-2.5 py-1.5">
                      <span className="text-muted-foreground">
                        {new Date(due.dueDate).toLocaleDateString()} · <span className="font-mono font-semibold text-foreground">${Number(due.amount).toFixed(2)}</span> · <span className={due.status === "paid" ? "text-success-text font-medium" : due.status === "overdue" ? "text-critical-text font-medium" : "text-muted-foreground"}>{dueLabel(due.status)}</span>
                      </span>
                      {plan.status === "active" && (due.status === "pending" || due.status === "overdue") ? (
                        <Button size="sm" variant="outline" className="h-6 px-2 text-[11px]" onClick={() => handlePay(plan.id, due.id)}>
                          <CreditCard className="w-3 h-3 mr-1" />{t("inst_pay")}
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 border-t border-border pt-4">
          <div className="gap-1.5 flex flex-col">
            <Label className="text-xs font-semibold">{t("inst_count")}</Label>
            <Input type="number" min="2" max="24" value={count} onChange={(e) => setCount(e.target.value)} className="h-9 text-xs" />
          </div>
          <div className="gap-1.5 flex flex-col">
            <Label className="text-xs font-semibold">{t("inst_firstDue")}</Label>
            <Input type="date" value={firstDue} onChange={(e) => setFirstDue(e.target.value)} className="h-9 text-xs" />
          </div>
          <div className="gap-1.5 flex flex-col">
            <Label className="text-xs font-semibold">{t("inst_frequency")}</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="monthly">{t("inst_monthly")}</SelectItem>
                <SelectItem value="weekly">{t("inst_weekly")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="gap-1.5 flex flex-col">
            <Label className="text-xs font-semibold">{t("inst_method")}</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="cash">{t("pay_method_cash")}</SelectItem>
                <SelectItem value="transfer">{t("pay_method_transfer")}</SelectItem>
                <SelectItem value="check">{t("pay_method_check")}</SelectItem>
                <SelectItem value="insurance">{t("pay_method_insurance")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="gap-1.5 flex flex-col col-span-2">
            <Label className="text-xs font-semibold">{t("inst_downPayment")}</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={downPayment}
              onChange={(e) => setDownPayment(e.target.value)}
              placeholder="0.00"
              className="h-9 text-xs"
            />
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={handleCreate} className="h-9 text-xs font-semibold"><Plus className="w-3.5 h-3.5 mr-1" />{t("inst_create")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
