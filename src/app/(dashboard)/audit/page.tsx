"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DataPagination } from "@/components/ui/data-pagination";
import { paginate } from "@/lib/pagination";
import { useLocale } from "@/components/locale/locale-provider";
import { FeatureTip } from "@/components/feature-tips/feature-tip";

export default function AuditPage() {
  const { t } = useLocale();
  const [logs, setLogs] = React.useState<Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    createdAt: string;
    user?: { name: string | null; email: string };
  }>>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [actionFilter, setActionFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    fetch("/api/audit")
      .then((r) => r.json())
      .then((data) => { setLogs(Array.isArray(data) ? data : []); })
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  const actionColor: Record<string, string> = {
    CREATE: "bg-success-bg text-success-text",
    UPDATE: "bg-accent-blue-bg text-accent-blue-text",
    DELETE: "bg-critical-bg text-critical-text",
  };

  const filteredLogs = logs.filter((log) => {
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      (log.user?.name ?? "").toLowerCase().includes(query) ||
      (log.user?.email ?? "").toLowerCase().includes(query) ||
      log.entityType.toLowerCase().includes(query) ||
      log.entityId.toLowerCase().includes(query);
    return matchesAction && matchesSearch;
  });

  const PAGE_SIZE = 10;
  const pageCount = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const visiblePage = Math.min(page, pageCount);
  const pagedLogs = paginate(filteredLogs, visiblePage, PAGE_SIZE);

  return (
    <motion.div
      className="flex flex-col gap-6 w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("audit_title")}</h1>
      </div>

      <FeatureTip tipId="audit-append">
      <Card className="rounded-lg border border-border bg-card shadow-xs">
        <CardHeader className="p-5 border-b border-border">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Shield className="w-5 h-5 text-primary" />
            {t("audit_trail")}
          </CardTitle>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mt-3">
            <Input
              type="search"
              placeholder={t("audit_search")}
              className="w-full sm:max-w-sm h-9 bg-background"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
            />
            <SearchableSelect
              value={actionFilter}
              onValueChange={(value) => {
                setActionFilter(value);
                setPage(1);
              }}
              options={[
                { value: "all", label: t("common_all") },
                ...Object.keys(actionColor).map((action) => ({
                  value: action,
                  label: action,
                })),
              ]}
              placeholder={t("audit_filterAction")}
              triggerClassName="w-full sm:w-48 h-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-5">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">{t("common_loading")}</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground border border-border rounded-md">
              {t("audit_empty")}
            </div>
          ) : (
            <div className="rounded-md border border-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted-bg/60 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">{t("audit_colTime")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("audit_colUser")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("audit_colAction")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("audit_colEntity")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("audit_colId")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pagedLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted-bg/50 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-medium">{log.user?.name ?? log.user?.email ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${actionColor[log.action] ?? "bg-muted-bg text-muted-foreground"}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">{log.entityType}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground truncate max-w-[120px]">{log.entityId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {filteredLogs.length > PAGE_SIZE ? (
            <DataPagination
              page={visiblePage}
              pageSize={PAGE_SIZE}
              total={filteredLogs.length}
              onPageChange={setPage}
            />
          ) : null}
        </CardContent>
      </Card>
      </FeatureTip>
    </motion.div>
  );
}
