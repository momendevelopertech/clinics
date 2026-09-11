"use client";

import * as React from "react";
import { Plus } from "lucide-react";
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
      toast.error("Select a patient");
      return;
    }
    const unitPrice = Number(formData.unitPrice);
    if (formData.unitPrice === "" || !Number.isFinite(unitPrice) || unitPrice < 0) {
      toast.error("Enter a valid unit price");
      return;
    }
    const quantity = Number(formData.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      toast.error("Quantity must be a positive whole number");
      return;
    }

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
        <Button className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" /> New Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
          <DialogDescription>
            Issue an invoice with a single charge.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="gap-2 flex flex-col">
            <Label htmlFor="invoice-patient">Patient *</Label>
            <Select
              value={formData.patientId}
              onValueChange={(value) =>
                setFormData({ ...formData, patientId: value })
              }
            >
              <SelectTrigger id="invoice-patient">
                <SelectValue placeholder="Select a patient" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.firstName} {patient.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="gap-2 flex flex-col">
            <Label htmlFor="invoice-description">Description</Label>
            <Input
              id="invoice-description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="General consultation"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="gap-2 flex flex-col">
              <Label htmlFor="invoice-quantity">Quantity</Label>
              <Input
                id="invoice-quantity"
                type="number"
                min="1"
                step="1"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: e.target.value })
                }
              />
            </div>
            <div className="gap-2 flex flex-col">
              <Label htmlFor="invoice-price">Unit Price ($)</Label>
              <Input
                id="invoice-price"
                type="number"
                min="0"
                step="0.01"
                value={formData.unitPrice}
                onChange={(e) =>
                  setFormData({ ...formData, unitPrice: e.target.value })
                }
              />
            </div>
          </div>

          <div className="gap-2 flex flex-col">
            <Label htmlFor="invoice-due">Due Date</Label>
            <Input
              id="invoice-due"
              type="date"
              value={formData.dueDate}
              onChange={(e) =>
                setFormData({ ...formData, dueDate: e.target.value })
              }
            />
          </div>

          <div className="gap-2 flex flex-col">
            <Label htmlFor="invoice-coupon">Coupon code (optional)</Label>
            <Input
              id="invoice-coupon"
              value={formData.couponCode}
              onChange={(e) =>
                setFormData({ ...formData, couponCode: e.target.value.toUpperCase() })
              }
              placeholder="RAMADAN10"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Invoice"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}