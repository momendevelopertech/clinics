"use client";

import * as React from "react";
import {
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
import { logClientError } from "@/lib/client-logger";

interface AddItemDialogProps {
  onSuccess: () => void;
}

export function AddItemDialog({ onSuccess }: AddItemDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: "",
    sku: "",
    category: "",
    quantity: "",
    unit: "",
    reorderLevel: "",
    expiryDate: "",
    batchNumber: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Item name is required");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          sku: formData.sku.trim() || null,
          category: formData.category.trim() || null,
          quantity: formData.quantity === "" ? 0 : Number(formData.quantity),
          unit: formData.unit.trim() || "each",
          reorderLevel:
            formData.reorderLevel === ""
              ? null
              : Number(formData.reorderLevel),
          expiryDate: formData.expiryDate ? new Date(formData.expiryDate).toISOString() : null,
          batchNumber: formData.batchNumber.trim() || null,
        }),
      });

      if (!response.ok) throw new Error("Failed to create item");

      toast.success("Item added successfully");
      setFormData({
        name: "",
        sku: "",
        category: "",
        quantity: "",
        unit: "",
        reorderLevel: "",
        expiryDate: "",
        batchNumber: "",
      });
      setOpen(false);
      onSuccess();
    } catch (error) {
      toast.error("Failed to add item");
      logClientError("Create inventory item failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-9 gap-1.5 text-xs font-semibold shadow-2xs">
          <Plus className="w-3.5 h-3.5" /> Add Item
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Inventory Item</DialogTitle>
          <DialogDescription>
            Add a new item to the clinic stock.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          <div className="gap-1.5 flex flex-col">
            <Label htmlFor="item-name" className="text-xs font-semibold">Name *</Label>
            <Input
              id="item-name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Paracetamol 500mg"
              className="h-9 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="gap-1.5 flex flex-col">
              <Label htmlFor="item-sku" className="text-xs font-semibold">SKU</Label>
              <Input
                id="item-sku"
                value={formData.sku}
                onChange={(e) =>
                  setFormData({ ...formData, sku: e.target.value })
                }
                placeholder="SKU-001"
                className="h-9 text-xs"
              />
            </div>
            <div className="gap-1.5 flex flex-col">
              <Label htmlFor="item-category" className="text-xs font-semibold">Category</Label>
              <Input
                id="item-category"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                placeholder="Medication"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="gap-1.5 flex flex-col">
              <Label htmlFor="item-quantity" className="text-xs font-semibold">Quantity</Label>
              <Input
                id="item-quantity"
                type="number"
                min="0"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: e.target.value })
                }
                className="h-9 text-xs"
              />
            </div>
            <div className="gap-1.5 flex flex-col">
              <Label htmlFor="item-unit" className="text-xs font-semibold">Unit</Label>
              <Input
                id="item-unit"
                value={formData.unit}
                onChange={(e) =>
                  setFormData({ ...formData, unit: e.target.value })
                }
                placeholder="each"
                className="h-9 text-xs"
              />
            </div>
            <div className="gap-1.5 flex flex-col">
              <Label htmlFor="item-reorder" className="text-xs font-semibold">Reorder Level</Label>
              <Input
                id="item-reorder"
                type="number"
                min="0"
                value={formData.reorderLevel}
                onChange={(e) =>
                  setFormData({ ...formData, reorderLevel: e.target.value })
                }
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="gap-1.5 flex flex-col">
              <Label htmlFor="item-expiry" className="text-xs font-semibold">Expiry date</Label>
              <Input
                id="item-expiry"
                type="date"
                value={formData.expiryDate}
                onChange={(e) =>
                  setFormData({ ...formData, expiryDate: e.target.value })
                }
                className="h-9 text-xs"
              />
            </div>
            <div className="gap-1.5 flex flex-col">
              <Label htmlFor="item-batch" className="text-xs font-semibold">Batch number</Label>
              <Input
                id="item-batch"
                value={formData.batchNumber}
                onChange={(e) =>
                  setFormData({ ...formData, batchNumber: e.target.value })
                }
                placeholder="B-001"
                className="h-9 text-xs"
              />
            </div>
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
            <Button type="submit" disabled={loading} className="h-9 text-xs font-semibold">
              <Plus className="mr-1 h-3.5 w-3.5" />{loading ? "Adding..." : "Add Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}