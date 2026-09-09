"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Package, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataPagination } from "@/components/ui/data-pagination";
import { paginate } from "@/lib/pagination";
import { useLocale } from "@/components/locale/locale-provider";
import { PermissionDenied } from "@/components/ui/permission-denied";
import { usePermissionState } from "@/hooks/use-permission-state";
import { AddItemDialog } from "@/components/inventory/add-item-dialog";

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
  const [searchQuery, setSearchQuery] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const { forbidden, guardedFetch } = usePermissionState();

  const loadItems = React.useCallback(() => {
    guardedFetch<Array<{
      id: string;
      name: string;
      sku: string | null;
      category: string | null;
      quantity: number;
      reorderLevel: number | null;
      unit: string | null;
    }>>("/api/inventory")
      .then((data) => { if (data) setItems(Array.isArray(data) ? data : []); })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [guardedFetch]);

  React.useEffect(() => {
    loadItems();
  }, [loadItems]);

  const lowStock = items.filter((i) => i.reorderLevel != null && i.quantity <= i.reorderLevel);

  const categories = Array.from(new Set(items.map((i) => i.category).filter((c): c is string => Boolean(c))));

  const filteredItems = items.filter((item) => {
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      item.name.toLowerCase().includes(query) ||
      (item.sku ?? "").toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  const PAGE_SIZE = 10;
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const visiblePage = Math.min(page, pageCount);
  const pagedItems = paginate(filteredItems, visiblePage, PAGE_SIZE);

  if (forbidden) {
    return (
      <div className="flex flex-col gap-8 w-full">
        <h1 className="text-2xl font-bold tracking-tight">{t("inv_title")}</h1>
        <PermissionDenied
          title={t("inv_forbiddenTitle") ?? "You don't have permission"}
          description={t("inv_forbidden") ?? "Your role can't view the inventory module."}
        />
      </div>
    );
  }

  return (
    <motion.div
      className="flex flex-col gap-8 w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t("inv_title")}</h1>
        <AddItemDialog onSuccess={loadItems} />
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
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <Input
              type="search"
              placeholder={t("inv_search")}
              className="w-full sm:max-w-sm"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
            />
            <Select
              value={categoryFilter}
              onValueChange={(value) => {
                setCategoryFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder={t("inv_filterCategory")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common_all")}</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
                  {pagedItems.map((item) => (
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
          {filteredItems.length > PAGE_SIZE ? (
            <DataPagination
              page={visiblePage}
              pageSize={PAGE_SIZE}
              total={filteredItems.length}
              onPageChange={setPage}
            />
          ) : null}
        </CardContent>
      </Card>
    </motion.div>
  );
}
