"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Package, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DataPagination } from "@/components/ui/data-pagination";
import { paginate } from "@/lib/pagination";
import { useLocale } from "@/components/locale/locale-provider";
import { FeatureTip } from "@/components/feature-tips/feature-tip";
import { PermissionDenied } from "@/components/ui/permission-denied";
import { usePermissionState } from "@/hooks/use-permission-state";
import { PageHelpBanner } from "@/components/ui/page-help-banner";
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
    expiryDate: string | null;
    batchNumber: string | null;
  }>>([]);
  const [alerts, setAlerts] = React.useState<{ expired: string[]; expiringSoon: string[]; lowStock: string[] }>({
    expired: [],
    expiringSoon: [],
    lowStock: [],
  });
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
      expiryDate: string | null;
      batchNumber: string | null;
    }>>("/api/inventory")
      .then((data) => { if (data) setItems(Array.isArray(data) ? data : []); })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
    guardedFetch<{ expired: Array<{ id: string }>; expiringSoon: Array<{ id: string }>; lowStock: Array<{ id: string }> }>("/api/inventory/alerts")
      .then((data) => {
        if (data) {
          setAlerts({
            expired: data.expired.map((i) => i.id),
            expiringSoon: data.expiringSoon.map((i) => i.id),
            lowStock: data.lowStock.map((i) => i.id),
          });
        }
      })
      .catch(() => {});
  }, [guardedFetch]);

  React.useEffect(() => {
    loadItems();
  }, [loadItems]);

  const lowStock = items.filter((i) => alerts.lowStock.includes(i.id));
  const expiredItems = items.filter((i) => alerts.expired.includes(i.id));
  const expiringItems = items.filter((i) => alerts.expiringSoon.includes(i.id));

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
      <div className="flex flex-col gap-6 w-full">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("inv_title")}</h1>
        <PermissionDenied
          title={t("inv_forbiddenTitle") ?? "You don't have permission"}
          description={t("inv_forbidden") ?? "Your role can't view the inventory module."}
        />
      </div>
    );
  }

  return (
    <motion.div
      className="flex flex-col gap-6 w-full pb-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("inv_title")}</h1>
          <p className="text-xs text-muted-foreground">{t("inv_items")}</p>
        </div>
        <AddItemDialog onSuccess={loadItems} />
      </div>

      <PageHelpBanner
        title={t("ph_inventory_title")}
        description={t("ph_inventory_desc")}
        audience={t("ph_inventory_audience")}
        actionHint={t("ph_inventory_action")}
      />

      {expiredItems.length > 0 && (
        <div className="rounded-lg border border-critical/30 bg-critical-bg p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-critical-text shrink-0" />
            <span className="text-xs font-semibold text-critical-text">
              {t("inv_expired").replace("{n}", String(expiredItems.length))} {expiredItems.map((i) => i.name).join(", ")}
            </span>
          </div>
        </div>
      )}

      {expiringItems.length > 0 && (
        <div className="rounded-lg border border-warning/30 bg-warning-bg p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-warning-text shrink-0" />
            <span className="text-xs font-semibold text-warning-text">
              {t("inv_expiringSoon").replace("{n}", String(expiringItems.length))} {expiringItems.map((i) => i.name).join(", ")}
            </span>
          </div>
        </div>
      )}

      {lowStock.length > 0 && (
        <FeatureTip tipId="inventory-reorder">
          <div className="rounded-lg border border-warning/30 bg-warning-bg p-4 shadow-2xs">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-warning-text shrink-0" />
              <span className="text-xs font-semibold text-warning-text">
                {t("inv_lowStock").replace("{n}", String(lowStock.length))} {lowStock.map((i) => i.name).join(", ")}
              </span>
            </div>
          </div>
        </FeatureTip>
      )}

      <Card className="rounded-lg border border-border bg-card shadow-2xs">
        <CardHeader className="p-5 border-b border-border bg-muted-bg">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <Package className="w-4 h-4 text-primary" />
              {t("inv_items")}
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-stretch sm:items-center">
              <Input
                type="search"
                placeholder={t("inv_search")}
                className="h-9 w-full sm:w-64 bg-card text-xs border-input"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
              />
              <SearchableSelect
                value={categoryFilter}
                onValueChange={(value) => {
                  setCategoryFilter(value);
                  setPage(1);
                }}
                options={[
                  { value: "all", label: t("common_all") },
                  ...categories.map((category) => ({
                    value: category,
                    label: category,
                  })),
                ]}
                placeholder={t("inv_filterCategory")}
                triggerClassName="h-9 w-full sm:w-44 bg-card text-xs border-input"
                contentClassName="text-xs"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-xs text-muted-foreground">{t("common_loading")}</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              {t("inv_empty")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="border-b border-border bg-muted-bg text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">{t("inv_colName")}</th>
                    <th className="px-4 py-3">{t("inv_colSku")}</th>
                    <th className="px-4 py-3">{t("inv_colCategory")}</th>
                    <th className="px-4 py-3">{t("inv_colQty")}</th>
                    <th className="px-4 py-3">{t("inv_colExpiry")}</th>
                    <th className="px-4 py-3">{t("inv_colBatch")}</th>
                    <th className="px-4 py-3">{t("inv_colReorder")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground">
                  {pagedItems.map((item) => (
                    <tr key={item.id} className="transition-colors hover:bg-muted/40">
                      <td className="px-4 py-3 font-semibold text-foreground">{item.name}</td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">{item.sku ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item.category ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={item.reorderLevel != null && item.quantity <= item.reorderLevel ? "text-warning-text font-bold" : "font-mono font-medium"}>
                          {item.quantity} {item.unit ?? ""}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {item.expiryDate ? (
                          <span className={alerts.expired.includes(item.id) ? "text-critical-text font-bold" : alerts.expiringSoon.includes(item.id) ? "text-warning-text font-bold" : "text-muted-foreground"}>
                            {new Date(item.expiryDate).toLocaleDateString()}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">{item.batchNumber ?? "—"}</td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">{item.reorderLevel ?? "—"}</td>
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
