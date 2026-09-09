"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataPagination } from "@/components/ui/data-pagination";
import { paginate } from "@/lib/pagination";
import { useLocale } from "@/components/locale/locale-provider";
import { PermissionDenied } from "@/components/ui/permission-denied";
import { usePermissionState } from "@/hooks/use-permission-state";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";

export default function TasksPage() {
  const { t } = useLocale();
  const [tasks, setTasks] = React.useState<Array<{
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string | null;
    dueDate: string | null;
    patient?: { firstName: string; lastName: string } | null;
    assignee?: { name: string | null } | null;
  }>>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const { forbidden, guardedFetch } = usePermissionState();

  const loadTasks = React.useCallback(() => {
    guardedFetch<Array<{
      id: string;
      title: string;
      description: string | null;
      status: string;
      priority: string | null;
      dueDate: string | null;
      patient?: { firstName: string; lastName: string } | null;
      assignee?: { name: string | null } | null;
    }>>("/api/tasks")
      .then((data) => { if (data) setTasks(Array.isArray(data) ? data : []); })
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, [guardedFetch]);

  React.useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  if (forbidden) {
    return (
      <div className="flex flex-col gap-8 w-full">
        <h1 className="text-2xl font-bold tracking-tight">{t("tasks_title")}</h1>
        <PermissionDenied
          title={t("tasks_forbiddenTitle") ?? "You don't have permission"}
          description={t("tasks_forbidden") ?? "Your role can't view tasks."}
        />
      </div>
    );
  }

  const statusColor: Record<string, string> = {
    open: "bg-blue-100 text-blue-700 dark:bg-blue-900/40",
    in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/40",
    completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40",
    cancelled: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      task.title.toLowerCase().includes(query) ||
      (task.description ?? "").toLowerCase().includes(query) ||
      (task.patient ? `${task.patient.firstName} ${task.patient.lastName}`.toLowerCase().includes(query) : false);
    return matchesStatus && matchesSearch;
  });

  const PAGE_SIZE = 10;
  const pageCount = Math.max(1, Math.ceil(filteredTasks.length / PAGE_SIZE));
  const visiblePage = Math.min(page, pageCount);
  const pagedTasks = paginate(filteredTasks, visiblePage, PAGE_SIZE);

  return (
    <motion.div
      className="flex flex-col gap-8 w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t("tasks_title")}</h1>
        <CreateTaskDialog onSuccess={loadTasks} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            {t("tasks_my")}
          </CardTitle>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <Input
              type="search"
              placeholder={t("tasks_search")}
              className="w-full sm:max-w-sm"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
            />
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder={t("tasks_filterStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common_all")}</SelectItem>
                {Object.keys(statusColor).map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-8 text-center text-neutral-500">{t("common_loading")}</div>
          ) : tasks.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 border rounded-[5px]">
              {t("tasks_empty")}
            </div>
          ) : (
            <div className="space-y-3">
              {pagedTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-4 border rounded-[5px] hover:bg-neutral-50 dark:hover:bg-neutral-800/30"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{task.title}</p>
                    {task.description && (
                      <p className="text-sm text-neutral-500 mt-1 truncate">{task.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-neutral-500">
                      {task.patient && (
                        <span>{task.patient.firstName} {task.patient.lastName}</span>
                      )}
                      {task.dueDate && (
                        <span>{t("tasks_due").replace("{date}", new Date(task.dueDate).toLocaleDateString())}</span>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-[5px] text-xs font-medium shrink-0 ${statusColor[task.status] ?? "bg-neutral-100"}`}>
                    {task.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        {filteredTasks.length > PAGE_SIZE ? (
            <DataPagination
              page={visiblePage}
              pageSize={PAGE_SIZE}
              total={filteredTasks.length}
              onPageChange={setPage}
            />
          ) : null}
        </CardContent>
      </Card>
    </motion.div>
  );
}
