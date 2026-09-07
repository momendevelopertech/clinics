"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/components/locale/locale-provider";

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

  React.useEffect(() => {
    fetch("/api/audit")
      .then((r) => r.json())
      .then((data) => { setLogs(Array.isArray(data) ? data : []); })
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  const actionColor: Record<string, string> = {
    CREATE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40",
    UPDATE: "bg-blue-100 text-blue-700 dark:bg-blue-900/40",
    DELETE: "bg-red-100 text-red-700 dark:bg-red-900/40",
  };

  return (
    <motion.div
      className="flex flex-col gap-8 w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <h1 className="text-2xl font-bold tracking-tight">{t("audit_title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            {t("audit_trail")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-8 text-center text-neutral-500">{t("common_loading")}</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 border rounded-[5px]">
              {t("audit_empty")}
            </div>
          ) : (
            <div className="rounded-[5px] border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">{t("audit_colTime")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("audit_colUser")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("audit_colAction")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("audit_colEntity")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("audit_colId")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                      <td className="px-4 py-3 text-neutral-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">{log.user?.name ?? log.user?.email ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-[5px] text-xs font-medium ${actionColor[log.action] ?? "bg-neutral-100"}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">{log.entityType}</td>
                      <td className="px-4 py-3 font-mono text-xs truncate max-w-[120px]">{log.entityId}</td>
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
