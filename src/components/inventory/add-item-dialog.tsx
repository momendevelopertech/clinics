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
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Item
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Inventory Item</DialogTitle>
          <DialogDescription>
            Add a new item to the clinic stock.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="gap-2 flex flex-col">
            <Label htmlFor="item-name">Name *</Label>
            <Input
              id="item-name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Paracetamol 500mg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="gap-2 flex flex-col">
              <Label htmlFor="item-sku">SKU</Label>
              <Input
                id="item-sku"
                value={formData.sku}
                onChange={(e) =>
                  setFormData({ ...formData, sku: e.target.value })
                }
                placeholder="SKU-001"
              />
            </div>
            <div className="gap-2 flex flex-col">
              <Label htmlFor="item-category">Category</Label>
              <Input
                id="item-category"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                placeholder="Medication"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="gap-2 flex flex-col">
              <Label htmlFor="item-quantity">Quantity</Label>
              <Input
                id="item-quantity"
                type="number"
                min="0"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: e.target.value })
                }
              />
            </div>
            <div className="gap-2 flex flex-col">
              <Label htmlFor="item-unit">Unit</Label>
              <Input
                id="item-unit"
                value={formData.unit}
                onChange={(e) =>
                  setFormData({ ...formData, unit: e.target.value })
                }
                placeholder="each"
              />
            </div>
            <div className="gap-2 flex flex-col">
              <Label htmlFor="item-reorder">Reorder Level</Label>
              <Input
                id="item-reorder"
                type="number"
                min="0"
                value={formData.reorderLevel}
                onChange={(e) =>
                  setFormData({ ...formData, reorderLevel: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="gap-2 flex flex-col">
              <Label htmlFor="item-expiry">Expiry date</Label>
              <Input
                id="item-expiry"
                type="date"
                value={formData.expiryDate}
                onChange={(e) =>
                  setFormData({ ...formData, expiryDate: e.target.value })
                }
              />
            </div>
            <div className="gap-2 flex flex-col">
              <Label htmlFor="item-batch">Batch number</Label>
              <Input
                id="item-batch"
                value={formData.batchNumber}
                onChange={(e) =>
                  setFormData({ ...formData, batchNumber: e.target.value })
                }
                placeholder="B-001"
              />
            </div>
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
              {loading ? "Adding..." : "Add Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}