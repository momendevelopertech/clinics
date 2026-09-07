"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Package, Plus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/components/locale/locale-provider";

export default function InventoryPage() {
  const { t } = useLocale();
  const [items, setItems] = React.useState<Array<{
    id: string;
    name: string;
    sku: string | null;
    category: string | null;
    quantity: number;
    reorderLevel: number | null;
    unit: string | null;
  }>>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/inventory")
      .then((r) => r.json())
      .then((data) => { setItems(Array.isArray(data) ? data : []); })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const lowStock = items.filter((i) => i.reorderLevel != null && i.quantity <= i.reorderLevel);

  return (
    <motion.div
      className="flex flex-col gap-8 w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t("inv_title")}</h1>
        <Button className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" />
          {t("inv_addItem")}
        </Button>
      </div>

      {lowStock.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <span className="font-medium">
              {t("inv_lowStock").replace("{n}", String(lowStock.length))} {lowStock.map((i) => i.name).join(", ")}
            </span>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {t("inv_items")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-8 text-center text-neutral-500">{t("common_loading")}</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 border rounded-[5px]">
              {t("inv_empty")}
            </div>
          ) : (
            <div className="rounded-[5px] border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">{t("inv_colName")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("inv_colSku")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("inv_colCategory")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("inv_colQty")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("inv_colReorder")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                      <td className="px-4 py-3 font-medium">{item.name}</td>
                      <td className="px-4 py-3 text-neutral-500">{item.sku ?? "—"}</td>
                      <td className="px-4 py-3">{item.category ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={item.reorderLevel != null && item.quantity <= item.reorderLevel ? "text-amber-600 font-medium" : ""}>
                          {item.quantity} {item.unit ?? ""}
                        </span>
                      </td>
                      <td className="px-4 py-3">{item.reorderLevel ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
