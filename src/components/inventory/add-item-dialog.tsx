"use client";

import * as React from "react";
import { Plus, X, Pill, Package } from "lucide-react";
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
import { parseApiError } from "@/lib/client-errors";
import { useLocale } from "@/components/locale/locale-provider";
import { usePostActionGuidance } from "@/hooks/use-post-action-guidance";
import { handleApiError } from "@/lib/api-error-handler";
import { cn } from "@/lib/utils";

interface AddItemDialogProps {
  onSuccess: () => void;
}

export function AddItemDialog({ onSuccess }: AddItemDialogProps) {
  const { t } = useLocale();
  const { triggerGuidance } = usePostActionGuidance();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [isStockManaged, setIsStockManaged] = React.useState(false); // Default to Standard Medicine
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
      toast.error(t("inv_nameRequired") ?? "Item name is required");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          category: formData.category.trim() || null,
          isStockManaged,
          sku: isStockManaged ? formData.sku.trim() || null : null,
          quantity: isStockManaged ? (formData.quantity === "" ? 0 : Number(formData.quantity)) : 0,
          unit: isStockManaged ? formData.unit.trim() || "each" : "each",
          reorderLevel: isStockManaged && formData.reorderLevel !== "" ? Number(formData.reorderLevel) : null,
          expiryDate: isStockManaged && formData.expiryDate ? new Date(formData.expiryDate).toISOString() : null,
          batchNumber: isStockManaged ? formData.batchNumber.trim() || null : null,
        }),
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response, t("inv_addError") ?? "Failed to create item"));
      }

      toast.success(t("inv_addSuccess") ?? "Item added");
      triggerGuidance(isStockManaged ? "inventory_item_added" : "medicine_added");

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
      toast.error(handleApiError(error, t));
      logClientError("Create inventory item failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-9 gap-1.5 text-xs font-semibold shadow-2xs">
          <Plus className="w-3.5 h-3.5" /> {t("inv_addMedicineOrStock") ?? t("inv_addTrigger") ?? "Add Medicine / Stock"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("inv_addTitle") ?? "Add Medicine or Stock Item"}</DialogTitle>
          <DialogDescription>{t("inv_addDesc") ?? "Select item type and provide details."}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          {/* Item Type Selector */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold">{t("inv_itemTypeLabel") ?? "Item Type"}</Label>
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-border p-1 bg-muted-bg">
              <button
                type="button"
                onClick={() => setIsStockManaged(false)}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition-colors",
                  !isStockManaged
                    ? "bg-card text-foreground font-semibold shadow-2xs border border-border"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Pill className="h-3.5 w-3.5 text-primary" />
                <span>{t("inv_typeStandard") ?? "دواء عادي"}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsStockManaged(true)}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition-colors",
                  isStockManaged
                    ? "bg-card text-foreground font-semibold shadow-2xs border border-border"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Package className="h-3.5 w-3.5 text-primary" />
                <span>{t("inv_typeStock") ?? "عنصر مخزون"}</span>
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground px-1">
              {!isStockManaged
                ? (t("inv_typeStandardHint") ?? "دواء وصفات فقط (اسم وتصنيف بدون تتبع كميات)")
                : (t("inv_typeStockHint") ?? "مُدار بكميات وتنبيهات إعادة طلب وتاريخ صلاحية")}
            </p>
          </div>

          <div className="gap-1.5 flex flex-col">
            <Label htmlFor="item-name" className="text-xs font-semibold">{t("inv_nameLabel") ?? t("inv_colName") ?? "Name"} *</Label>
            <Input
              id="item-name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder={t("inv_namePlaceholder") ?? "Paracetamol 500mg"}
              className="h-9 text-xs"
            />
          </div>

          <div className="gap-1.5 flex flex-col">
            <Label htmlFor="item-category" className="text-xs font-semibold">{t("inv_colCategory") ?? "Category"}</Label>
            <Input
              id="item-category"
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              placeholder={t("inv_categoryPlaceholder") ?? "Analgesics / مسكنات"}
              className="h-9 text-xs"
            />
          </div>

          {/* Full fields displayed only when isStockManaged === true */}
          {isStockManaged ? (
            <React.Fragment>
              <div className="grid grid-cols-2 gap-3">
                <div className="gap-1.5 flex flex-col">
                  <Label htmlFor="item-sku" className="text-xs font-semibold">{t("inv_colSku") ?? "SKU"}</Label>
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
                  <Label htmlFor="item-unit" className="text-xs font-semibold">{t("inv_unit") ?? "Unit"}</Label>
                  <Input
                    id="item-unit"
                    value={formData.unit}
                    onChange={(e) =>
                      setFormData({ ...formData, unit: e.target.value })
                    }
                    placeholder="box / bottle"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="gap-1.5 flex flex-col">
                  <Label htmlFor="item-quantity" className="text-xs font-semibold">{t("inv_colQty") ?? "Quantity"}</Label>
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
                  <Label htmlFor="item-reorder" className="text-xs font-semibold">{t("inv_colReorder") ?? "Reorder Level"}</Label>
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
                  <Label htmlFor="item-expiry" className="text-xs font-semibold">{t("inv_colExpiry") ?? "Expiry date"}</Label>
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
                  <Label htmlFor="item-batch" className="text-xs font-semibold">{t("inv_colBatch") ?? "Batch number"}</Label>
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
            </React.Fragment>
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
            <Button type="submit" disabled={loading} className="h-9 text-xs font-semibold">
              <Plus className="mr-1 h-3.5 w-3.5" />{loading ? (t("common_saving") ?? "Saving...") : (t("common_add") ?? t("inv_addTrigger") ?? "Add")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}