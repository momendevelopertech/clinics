"use client";

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
        <Button variant="link" className="p-0 h-auto text-sm font-medium text-indigo-600">
          {t("billing_installments")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("inst_title")}</DialogTitle>
          <DialogDescription>{t("inst_new")}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-neutral-500">{t("common_loading")}</p>
        ) : plans.length === 0 ? (
          <p className="text-sm text-neutral-500">{t("inst_noPlans")}</p>
        ) : (
          <div className="flex flex-col gap-4 max-h-64 overflow-y-auto">
            {plans.map((plan) => (
              <div key={plan.id} className="rounded border p-3">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>
                    {plan.status === "active" ? t("inst_active") : plan.status === "completed" ? t("inst_completed") : t("inst_cancelled")}
                  </span>
                  <span className="text-neutral-500">{Number(plan.totalAmount).toFixed(2)}</span>
                </div>
                <div className="mt-2 flex flex-col gap-1">
                  {plan.installments.map((due) => (
                    <div key={due.id} className="flex items-center justify-between text-sm">
                      <span>
                        {new Date(due.dueDate).toLocaleDateString()} · {Number(due.amount).toFixed(2)} · {dueLabel(due.status)}
                      </span>
                      {plan.status === "active" && (due.status === "pending" || due.status === "overdue") ? (
                        <Button size="sm" variant="outline" onClick={() => handlePay(plan.id, due.id)}>
                          {t("inst_pay")}
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 border-t pt-4">
          <div className="gap-2 flex flex-col">
            <Label>{t("inst_count")}</Label>
            <Input type="number" min="2" max="24" value={count} onChange={(e) => setCount(e.target.value)} />
          </div>
          <div className="gap-2 flex flex-col">
            <Label>{t("inst_firstDue")}</Label>
            <Input type="date" value={firstDue} onChange={(e) => setFirstDue(e.target.value)} />
          </div>
          <div className="gap-2 flex flex-col">
            <Label>{t("inst_frequency")}</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">{t("inst_monthly")}</SelectItem>
                <SelectItem value="weekly">{t("inst_weekly")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="gap-2 flex flex-col">
            <Label>{t("inst_method")}</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">{t("pay_method_cash")}</SelectItem>
                <SelectItem value="transfer">{t("pay_method_transfer")}</SelectItem>
                <SelectItem value="check">{t("pay_method_check")}</SelectItem>
                <SelectItem value="insurance">{t("pay_method_insurance")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="gap-2 flex flex-col col-span-2">
            <Label>{t("inst_downPayment")}</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={downPayment}
              onChange={(e) => setDownPayment(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleCreate}>{t("inst_create")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
