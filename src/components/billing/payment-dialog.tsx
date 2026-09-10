"use client";

import * as React from "react";
import { CreditCard, Plus } from "lucide-react";
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
  });

  React.useEffect(() => {
    if (open) {
      fetchInvoices();
    }
  }, [open]);

  const fetchInvoices = async () => {
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
  };

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
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create payment");
      }

      const data = await response.json();

      toast.success(t("pay_intentCreated").replace("{id}", data.id));

      setFormData({
        invoiceId: "",
        amount: "",
        currency: "usd",
        description: "",
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
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> {t("pay_processPayment")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("pay_processPayment")}</DialogTitle>
          <DialogDescription>
            {t("pay_desc")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="gap-2 flex flex-col">
            <Label htmlFor="invoice">{t("pay_invoiceLabel")}</Label>
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
              <SelectTrigger id="invoice">
                <SelectValue placeholder={t("pay_selectInvoice")} />
              </SelectTrigger>
              <SelectContent>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="gap-2 flex flex-col">
              <Label htmlFor="amount">{t("pay_amountLabel")}</Label>
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
              />
            </div>

            <div className="gap-2 flex flex-col">
              <Label htmlFor="currency">{t("pay_currencyLabel")}</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) =>
                  setFormData({ ...formData, currency: value })
                }
              >
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usd">USD</SelectItem>
                  <SelectItem value="eur">EUR</SelectItem>
                  <SelectItem value="gbp">GBP</SelectItem>
                  <SelectItem value="cad">CAD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="gap-2 flex flex-col">
            <Label htmlFor="description">{t("pay_descriptionLabel")}</Label>
            <Input
              id="description"
              placeholder={t("pay_paymentNote")}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
            <p className="font-medium mb-1">{t("pay_secureStripe")}</p>
            <p>{t("pay_secureStripeDesc")}</p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              {t("common_cancel")}
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              {loading ? t("pay_processing") : t("pay_createPayment")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
