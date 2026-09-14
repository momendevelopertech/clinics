"use client";

import * as React from "react";
import {
  FileText,
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
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "sonner";
import { logClientError } from "@/lib/client-logger";

type PatientOption = {
  id: string;
  firstName: string;
  lastName: string;
};

interface NewInvoiceDialogProps {
  onSuccess: () => void;
}

export function NewInvoiceDialog({ onSuccess }: NewInvoiceDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [patients, setPatients] = React.useState<PatientOption[]>([]);
  const [formData, setFormData] = React.useState({
    patientId: "",
    description: "",
    quantity: "1",
    unitPrice: "",
    dueDate: "",
    couponCode: "",
  });
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open) {
      fetch("/api/patients")
        .then((response) => {
          if (!response.ok) throw new Error("Failed to fetch patients");
          return response.json();
        })
        .then(setPatients)
        .catch((error) => {
          logClientError("Invoice patient lookup failed", error);
        });
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.patientId) {
      setFieldErrors({ patientId: "Select a patient" });
      toast.error("Select a patient");
      return;
    }
    const unitPrice = Number(formData.unitPrice);
    if (formData.unitPrice === "" || !Number.isFinite(unitPrice) || unitPrice < 0) {
      setFieldErrors({ unitPrice: "Enter a valid unit price" });
      toast.error("Enter a valid unit price");
      return;
    }
    const quantity = Number(formData.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      setFieldErrors({ quantity: "Quantity must be a positive whole number" });
      toast.error("Quantity must be a positive whole number");
      return;
    }
    setFieldErrors({});

    try {
      setLoading(true);
      const response = await fetch("/api/billing/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: formData.patientId,
          dueDate: formData.dueDate || null,
          idempotencyKey: crypto.randomUUID(),
          couponCode: formData.couponCode.trim() || undefined,
          lineItems: [
            {
              description:
                formData.description.trim() || "Clinic service",
              quantity,
              unitPrice,
            },
          ],
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create invoice");
      }

      toast.success("Invoice created successfully");
      setFormData({
        patientId: "",
        description: "",
        quantity: "1",
        unitPrice: "",
        dueDate: "",
        couponCode: "",
      });
      setOpen(false);
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create invoice");
      logClientError("Create invoice failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-9 gap-1.5 text-xs font-semibold shadow-2xs">
          <Plus className="w-3.5 h-3.5" /> New Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
          <DialogDescription>
            Issue an invoice with a single charge.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          <div className="gap-1.5 flex flex-col">
            <Label htmlFor="invoice-patient" className="text-xs font-semibold">Patient *</Label>
            <SearchableSelect
              value={formData.patientId}
              onValueChange={(value) => {
                setFormData({ ...formData, patientId: value });
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
              placeholder="Select a patient"
              triggerClassName={`h-9 text-xs${fieldErrors.patientId ? " border-destructive" : ""}`}
              id="invoice-patient"
            />
            {fieldErrors.patientId ? (
              <p className="text-xs text-destructive mt-1">{fieldErrors.patientId}</p>
            ) : null}
          </div>

          <div className="gap-1.5 flex flex-col">
            <Label htmlFor="invoice-description" className="text-xs font-semibold">Description</Label>
            <Input
              id="invoice-description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="General consultation"
              className="h-9 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="gap-1.5 flex flex-col">
              <Label htmlFor="invoice-quantity" className="text-xs font-semibold">Quantity *</Label>
              <Input
                id="invoice-quantity"
                type="number"
                min="1"
                step="1"
                value={formData.quantity}
                onChange={(e) => {
                  setFormData({ ...formData, quantity: e.target.value });
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.quantity;
                    return next;
                  });
                }}
                aria-required="true"
                aria-invalid={fieldErrors.quantity ? true : undefined}
                className={`h-9 text-xs${fieldErrors.quantity ? " border-destructive" : ""}`}
              />
              {fieldErrors.quantity ? (
                <p className="text-xs text-destructive mt-1">{fieldErrors.quantity}</p>
              ) : null}
            </div>
            <div className="gap-1.5 flex flex-col">
              <Label htmlFor="invoice-price" className="text-xs font-semibold">Unit Price ($) *</Label>
              <Input
                id="invoice-price"
                type="number"
                min="0"
                step="0.01"
                value={formData.unitPrice}
                onChange={(e) => {
                  setFormData({ ...formData, unitPrice: e.target.value });
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.unitPrice;
                    return next;
                  });
                }}
                aria-required="true"
                aria-invalid={fieldErrors.unitPrice ? true : undefined}
                className={`h-9 text-xs${fieldErrors.unitPrice ? " border-destructive" : ""}`}
              />
              {fieldErrors.unitPrice ? (
                <p className="text-xs text-destructive mt-1">{fieldErrors.unitPrice}</p>
              ) : null}
            </div>
          </div>

          <div className="gap-1.5 flex flex-col">
            <Label htmlFor="invoice-due" className="text-xs font-semibold">Due Date</Label>
            <Input
              id="invoice-due"
              type="date"
              value={formData.dueDate}
              onChange={(e) =>
                setFormData({ ...formData, dueDate: e.target.value })
              }
              className="h-9 text-xs"
            />
          </div>

          <div className="gap-1.5 flex flex-col">
            <Label htmlFor="invoice-coupon" className="text-xs font-semibold">Coupon code (optional)</Label>
            <Input
              id="invoice-coupon"
              value={formData.couponCode}
              onChange={(e) =>
                setFormData({ ...formData, couponCode: e.target.value.toUpperCase() })
              }
              placeholder="RAMADAN10"
              className="h-9 text-xs"
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="h-9 text-xs"
            >
              <X className="mr-1 h-3.5 w-3.5" />Cancel
            </Button>
            <Button type="submit" disabled={loading} className="h-9 text-xs">
              <FileText className="mr-1 h-3.5 w-3.5" />{loading ? "Creating..." : "Create Invoice"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}