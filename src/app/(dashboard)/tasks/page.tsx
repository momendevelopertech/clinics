"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
              {tasks.map((task) => (
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
        </CardContent>
      </Card>
    </motion.div>
  );
}
