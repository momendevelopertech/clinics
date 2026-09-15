"use client";
import { Ban, Check, Loader2, Phone } from "lucide-react";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { logClientError } from "@/lib/client-logger";
import { useLocale } from "@/components/locale/locale-provider";
import { PermissionDenied } from "@/components/ui/permission-denied";
import { FeatureTip } from "@/components/feature-tips/feature-tip";
import { TableSkeleton } from "@/components/ui/loading";
import { PageHelpBanner } from "@/components/ui/page-help-banner";
import { RecordVitalsDialog } from "@/components/encounters/record-vitals-dialog";
import { TodayProceduresCard } from "@/components/encounters/today-procedures-card";

type QueueItem = {
  id: string;
  tokenNumber: string | null;
  status: string;
  patient: { id: string; firstName: string; lastName: string; mrn: string | null };
  provider: { name: string | null };
  room: { name: string; number: string | null } | null;
};

export default function QueuePage() {
  const { t } = useLocale();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

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
    setLoading(true);
    void load()
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : t("queue_loadError"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [load, t]);

  const successKey = (action: "call-next" | "complete" | "no-show") =>
    action === "call-next" ? "common_callNext" : action === "complete" ? "common_saved" : "common_updated";

  const runAction = async (action: "call-next" | "complete" | "no-show", appointmentId?: string) => {
    const rowKey = appointmentId ?? "call-next-all";
    try {
      setBusyId(rowKey);
      setError("");
      const response = await fetch("/api/queue/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, appointmentId }),
      });
      if (response.status === 403) {
        setForbidden(true);
        return null;
      }
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || t("queue_actionError"));
      }
      const data = (await response.json().catch(() => null)) as { encounterId?: string | null } | null;
      await load();
      toast.success(t(successKey(action)));
      return data;
    } catch (reason: unknown) {
      const message = reason instanceof Error ? reason.message : t("queue_actionError");
      setError(message);
      toast.error(message);
      logClientError("Queue action failed", reason);
      return null;
    } finally {
      setBusyId(null);
    }
  };

  const startVisit = async (item: QueueItem) => {
    const data = await runAction("call-next", item.id);
    const encounterId = data?.encounterId;
    const params = new URLSearchParams({ appointmentId: item.id, patientId: item.patient.id });
    if (encounterId) params.set("encounterId", encounterId);
    window.location.href = `/encounters?${params.toString()}`;
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("queue_title")}</h1>
          <p className="text-xs text-muted-foreground">{t("queue_subtitle")}</p>
        </div>
        <Button onClick={() => runAction("call-next")} disabled={busyId === "call-next-all"} className="h-9 gap-2 text-xs font-semibold shadow-2xs">
          {busyId === "call-next-all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}{t("queue_callNext")}
        </Button>
      </div>
      <PageHelpBanner
        title={t("ph_queue_title")}
        description={t("ph_queue_desc")}
        audience={t("ph_queue_audience")}
        actionHint={t("ph_queue_action")}
      />
      {error ? <p className="text-xs font-semibold text-destructive">{error}</p> : null}
      <TodayProceduresCard />
      {loading ? (
        <TableSkeleton rows={5} columns={3} />
      ) : (
      <div className="space-y-3">
        {queue.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 shadow-2xs">
            <div>
              <p className="text-xs font-semibold text-foreground">{item.patient.firstName} {item.patient.lastName}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.patient.mrn ?? ""} · {item.provider.name ?? ""}</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <RecordVitalsDialog
                  patientId={item.patient.id}
                  patientLabel={`${item.patient.firstName} ${item.patient.lastName}`}
                  onSaved={() => void load()}
                />
                {item.status === "arrived" ? (
                  <>
                    <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs" disabled={busyId === item.id} onClick={() => void startVisit(item)}>
                      {busyId === item.id ? <Loader2 className="me-1 h-3.5 w-3.5 animate-spin" /> : <Phone className="me-1 h-3.5 w-3.5" />}{t("queue_startVisit")}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10" disabled={busyId === item.id} onClick={() => void runAction("no-show", item.id)}>
                      {busyId === item.id ? <Loader2 className="me-1 h-3.5 w-3.5 animate-spin" /> : <Ban className="me-1 h-3.5 w-3.5" />}{t("queue_noShow")}
                    </Button>
                  </>
                ) : null}
                {item.status === "in_progress" ? (
                  <>
                    <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs" asChild>
                      <a href={`/encounters?appointmentId=${item.id}&patientId=${item.patient.id}`}>{t("common_openChart")}</a>
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs" disabled={busyId === item.id} onClick={() => void runAction("complete", item.id)}>
                      {busyId === item.id ? <Loader2 className="me-1 h-3.5 w-3.5 animate-spin" /> : <Check className="me-1 h-3.5 w-3.5" />}{t("queue_complete")}
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
            <div className="text-end">
              <FeatureTip tipId="queue-token">
                <span>
                  <p className="font-mono text-base font-bold text-foreground">{item.tokenNumber ?? "—"}</p>
                  <p className="text-[11px] text-muted-foreground">{item.room?.name ?? t("queue_unassigned")}</p>
                </span>
              </FeatureTip>
            </div>
          </div>
        ))}
        {!queue.length && !error ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-xs text-muted-foreground">{t("queue_empty")}</p>
            <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs" asChild>
              <a href="/appointments">{t("queue_emptyCta")}</a>
            </Button>
          </div>
        ) : null}
      </div>
      )}
    </div>
  );
}
