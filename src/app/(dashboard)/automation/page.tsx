"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Clock3, FlaskConical, Sparkles, UserRound } from "lucide-react";
import { useLocale } from "@/components/locale/locale-provider";
import type { AutomationSignal } from "@/lib/automation";
import { UpgradePrompt } from "@/components/plan/upgrade-prompt";

export default function AutomationPage() {
  const { t } = useLocale();
  const [signals, setSignals] = useState<AutomationSignal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/automation/signals", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load automation signals");
        return response.json() as Promise<{ signals: AutomationSignal[] }>;
      })
      .then((payload) => setSignals(payload.signals))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <UpgradePrompt moduleKey="automation" />
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="grid size-12 place-content-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("automation_title")}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("automation_subtitle")}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("common_loading")}</p>
      ) : signals.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center shadow-sm">
          <p className="font-medium text-foreground">{t("automation_empty")}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {signals.map((signal) => (
            <div key={signal.id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-5 shadow-sm">
              <div className="flex min-w-0 items-start gap-3">
                <div className="mt-0.5 text-primary">
                  {signal.kind === "lab_review" ? <FlaskConical className="h-5 w-5" /> : signal.kind === "no_show" ? <UserRound className="h-5 w-5" /> : <Clock3 className="h-5 w-5" />}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{signal.title}</p>
                  <p className="text-sm text-muted-foreground">{signal.patientName} · {signal.detail}</p>
                </div>
              </div>
              <Link href={signal.href} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors h-9">
                {t("automation_review")} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      )}

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <AlertTriangle className="h-4 w-4 text-warning-text" /> {t("automation_readOnly")}
      </p>
    </div>
  );
}

