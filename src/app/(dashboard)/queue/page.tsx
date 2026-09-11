"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { logClientError } from "@/lib/client-logger";
import { useLocale } from "@/components/locale/locale-provider";
import { PermissionDenied } from "@/components/ui/permission-denied";
import { FeatureTip } from "@/components/feature-tips/feature-tip";

type QueueItem = {
  id: string;
  tokenNumber: string | null;
  status: string;
  patient: { firstName: string; lastName: string; mrn: string | null };
  provider: { name: string | null };
  room: { name: string; number: string | null } | null;
};

export default function QueuePage() {
  const { t } = useLocale();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/queue");
    if (response.status === 403) {
      setForbidden(true);
      return;
    }
    if (!response.ok) throw new Error(t("queue_loadError"));
    setQueue((await response.json()) as QueueItem[]);
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    void load().catch((reason: unknown) => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : t("queue_loadError"));
    });
    return () => { cancelled = true; };
  }, [load, t]);

  const runAction = async (action: "call-next" | "complete" | "no-show", appointmentId?: string) => {
    try {
      setActing(true);
      setError("");
      const response = await fetch("/api/queue/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, appointmentId }),
      });
      if (response.status === 403) {
        setForbidden(true);
        return;
      }
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || t("queue_actionError"));
      }
      await load();
    } catch (reason: unknown) {
      const message = reason instanceof Error ? reason.message : t("queue_actionError");
      setError(message);
      toast.error(message);
      logClientError("Queue action failed", reason);
    } finally {
      setActing(false);
    }
  };

  if (forbidden) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <h1 className="text-2xl font-bold">{t("queue_title")}</h1>
        <PermissionDenied
          title={t("queue_forbiddenTitle") ?? "You don't have permission"}
          description={t("queue_forbidden") ?? "Only scheduling and clinical roles can view the queue."}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("queue_title")}</h1>
          <p className="text-sm text-muted-foreground">{t("queue_subtitle")}</p>
        </div>
        <Button onClick={() => runAction("call-next")} disabled={acting}>
          {t("queue_callNext")}
        </Button>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="space-y-3">
        {queue.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border bg-white p-4 dark:bg-neutral-900">
            <div>
              <p className="font-medium">{item.patient.firstName} {item.patient.lastName}</p>
              <p className="text-xs text-muted-foreground">{item.patient.mrn ?? ""} · {item.provider.name ?? ""}</p>
              <div className="mt-2 flex gap-2">
                {item.status === "arrived" ? (
                  <>
                    <Button size="sm" variant="outline" disabled={acting} onClick={() => runAction("call-next", item.id)}>
                      {t("queue_callNext")}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-600" disabled={acting} onClick={() => runAction("no-show", item.id)}>
                      {t("queue_noShow")}
                    </Button>
                  </>
                ) : null}
                {item.status === "in_progress" ? (
                  <Button size="sm" variant="outline" disabled={acting} onClick={() => runAction("complete", item.id)}>
                    {t("queue_complete")}
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="text-right">
              <FeatureTip tipId="queue-token">
                <span>
                  <p className="font-mono font-bold">{item.tokenNumber ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{item.room?.name ?? t("queue_unassigned")}</p>
                </span>
              </FeatureTip>
            </div>
          </div>
        ))}
        {!queue.length && !error ? <p className="text-sm text-muted-foreground">{t("queue_empty")}</p> : null}
      </div>
    </div>
  );
}
