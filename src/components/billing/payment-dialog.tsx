"use client";

import * as React from "react";
import {
  CreditCard,
  Plus,
  X,
} from "lucide-react";
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
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getClientErrorMessage, logClientError } from "@/lib/client-logger";
import { useLocale } from "@/components/locale/locale-provider";

type InvoiceOption = {
  id: string;
  invoiceNumber: string;
  status: string;
  total: number | string;
  amountPaid?: number | string | null;
};

interface PaymentDialogProps {
  invoiceId?: string;
  onSuccess?: () => void;
}

export function PaymentDialog({ invoiceId, onSuccess }: PaymentDialogProps) {
  const { t } = useLocale();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [invoices, setInvoices] = React.useState<InvoiceOption[]>([]);
  const [formData, setFormData] = React.useState({
    invoiceId: invoiceId || "",
    amount: "",
    currency: "usd",
    description: "",
    method: "card",
  });
  const isManual = formData.method !== "card" && formData.method !== "online";

  const fetchInvoices = React.useCallback(async () => {
    try {
      const response = await fetch("/api/billing/invoices");
      if (!response.ok) throw new Error("Failed to fetch invoices");
      const data = await response.json();
      const unpaidInvoices = (data as InvoiceOption[]).filter(
        (inv) => inv.status !== "paid",
      );
      setInvoices(unpaidInvoices);
    } catch (error) {
      toast.error(t("pay_failedLoad"));
      logClientError("Payment dialog invoice fetch failed", error);
    }
  }, [t]);

  React.useEffect(() => {
    if (open) {
      fetchInvoices();
    }
  }, [fetchInvoices, open]);

  const getInvoiceAmount = () => {
    if (!formData.invoiceId) return "";
    const invoice = invoices.find((i) => i.id === formData.invoiceId);
    if (!invoice) return "";

    const total = Number(invoice.total ?? 0);
    const amountPaid = Number(invoice.amountPaid ?? 0);
    return (total - amountPaid).toFixed(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.invoiceId || !formData.amount) {
      toast.error(t("pay_fillRequired"));
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: formData.invoiceId,
          amount: parseFloat(formData.amount),
          currency: formData.currency,
          description: formData.description || undefined,
          method: formData.method,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create payment");
      }

      const data = await response.json();

      toast.success(
        isManual ? t("pay_recorded") : t("pay_intentCreated").replace("{id}", data.id),
      );

      setFormData({
        invoiceId: "",
        amount: "",
        currency: "usd",
        description: "",
        method: "card",
      });
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      toast.error(getClientErrorMessage(error, t("pay_failedProcess")));
      logClientError("Payment dialog submission failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-9 gap-1.5 text-xs font-semibold shadow-2xs">
          <Plus className="w-3.5 h-3.5" /> {t("pay_processPayment")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("pay_processPayment")}</DialogTitle>
          <DialogDescription>
            {t("pay_desc")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          <div className="gap-1.5 flex flex-col">
            <Label htmlFor="invoice" className="text-xs font-semibold">{t("pay_invoiceLabel")}</Label>
            <Select
              value={formData.invoiceId}
              onValueChange={(value) => {
                setFormData({
                  ...formData,
                  invoiceId: value,
                  amount: getInvoiceAmount(),
                });
              }}
            >
              <SelectTrigger id="invoice" className="h-9 text-xs">
                <SelectValue placeholder={t("pay_selectInvoice")} />
              </SelectTrigger>
              <SelectContent className="text-xs">
                {invoices.map((invoice) => (
                  <SelectItem key={invoice.id} value={invoice.id}>
                    {invoice.invoiceNumber} - $
                    {(
                      Number(invoice.total ?? 0) -
                      Number(invoice.amountPaid ?? 0)
                    ).toFixed(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="gap-1.5 flex flex-col">
              <Label htmlFor="amount" className="text-xs font-semibold">{t("pay_amountLabel")}</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="gap-1.5 flex flex-col">
              <Label htmlFor="currency" className="text-xs font-semibold">{t("pay_currencyLabel")}</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) =>
                  setFormData({ ...formData, currency: value })
                }
              >
                <SelectTrigger id="currency" className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="usd">USD</SelectItem>
                  <SelectItem value="eur">EUR</SelectItem>
                  <SelectItem value="gbp">GBP</SelectItem>
                  <SelectItem value="cad">CAD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="gap-1.5 flex flex-col">
            <Label htmlFor="method" className="text-xs font-semibold">{t("pay_methodLabel")}</Label>
            <Select
              value={formData.method}
              onValueChange={(value) =>
                setFormData({ ...formData, method: value })
              }
            >
              <SelectTrigger id="method" className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="card">{t("pay_method_card")}</SelectItem>
                <SelectItem value="online">{t("pay_method_online")}</SelectItem>
                <SelectItem value="cash">{t("pay_method_cash")}</SelectItem>
                <SelectItem value="transfer">{t("pay_method_transfer")}</SelectItem>
                <SelectItem value="check">{t("pay_method_check")}</SelectItem>
                <SelectItem value="insurance">{t("pay_method_insurance")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="gap-1.5 flex flex-col">
            <Label htmlFor="description" className="text-xs font-semibold">{t("pay_descriptionLabel")}</Label>
            <Input
              id="description"
              placeholder={t("pay_paymentNote")}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="h-9 text-xs"
            />
          </div>

          {!isManual ? (
            <div className="bg-primary/10 border border-primary/20 rounded-md p-3 text-xs text-primary">
              <p className="font-semibold mb-0.5">{t("pay_secureStripe")}</p>
              <p className="text-[11px] text-muted-foreground">{t("pay_secureStripeDesc")}</p>
            </div>
          ) : null}

          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="h-9 text-xs"
            >
              <X className="mr-1 h-3.5 w-3.5" />{t("common_cancel")}
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="h-9 text-xs"
            >
              <CreditCard className="w-3.5 h-3.5 mr-1" />
              {loading ? t("pay_processing") : isManual ? t("pay_recordPayment") : t("pay_createPayment")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
