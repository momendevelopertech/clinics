"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/components/locale/locale-provider";

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

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const response = await fetch("/api/queue");
      if (!response.ok) throw new Error(t("queue_loadError"));
      const data = (await response.json()) as QueueItem[];
      if (!cancelled) setQueue(data);
    };
    void load().catch((reason: unknown) => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : t("queue_loadError"));
    });
    return () => { cancelled = true; };
  }, [t]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">{t("queue_title")}</h1>
        <p className="text-sm text-muted-foreground">{t("queue_subtitle")}</p>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="space-y-3">
        {queue.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-xl border bg-white p-4 dark:bg-neutral-900">
            <div>
              <p className="font-medium">{item.patient.firstName} {item.patient.lastName}</p>
              <p className="text-xs text-muted-foreground">{item.patient.mrn ?? ""} · {item.provider.name ?? ""}</p>
            </div>
            <div className="text-right">
              <p className="font-mono font-bold">{item.tokenNumber ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{item.room?.name ?? t("queue_unassigned")}</p>
            </div>
          </div>
        ))}
        {!queue.length && !error ? <p className="text-sm text-muted-foreground">{t("queue_empty")}</p> : null}
      </div>
    </div>
  );
}
