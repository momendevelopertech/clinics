"use client";

import { Loader2 } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/locale";
import { useFeatureConfig } from "@/hooks/use-feature-config";
import {
  PENDING_SERVICES,
  getPendingServiceDocsUrl,
  getPendingServiceStatus,
  type PendingServiceStatus,
} from "@/lib/pending-services";

const STATUS_DOT: Record<PendingServiceStatus, string> = {
  connected: "bg-emerald-500",
  partial: "bg-amber-500",
  missing: "bg-red-400",
  manual: "bg-neutral-400",
  decision: "bg-violet-500",
};

const STATUS_KEY: Record<PendingServiceStatus, string> = {
  connected: "svc_status_connected",
  partial: "svc_status_partial",
  missing: "svc_status_missing",
  manual: "svc_status_manual",
  decision: "svc_status_decision",
};

function tOf(t: Dictionary, key: string): string {
  const value = t[key];
  return typeof value === "string" ? value : key;
}

/**
 * Super Admin → Pending Services center.
 * Integration cards read LIVE status from GET /api/config/status (same source
 * as FeatureNotConfiguredBanner), so a card flips to "connected" on the next
 * page load after its env keys are provided — no code change, no parallel system.
 */
export function PendingServicesSection({ t }: { t: Dictionary }) {
  const { status, loading } = useFeatureConfig();
  const features = status?.features ?? null;

  if (loading) {
    return (
      <div className="surface-panel mt-6 flex items-center justify-center gap-2 rounded-lg border border-border p-12 text-muted-foreground shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">{tOf(t, "common_loading")}</span>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <p className="text-sm text-muted-foreground">{tOf(t, "svc_help")}</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {PENDING_SERVICES.map((service) => {
          const state = getPendingServiceStatus(service, features);
          const docsUrl = getPendingServiceDocsUrl(service);
          return (
            <article
              key={service.id}
              className="surface-panel rounded-lg border border-border p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-semibold text-foreground">
                  {tOf(t, service.nameKey)}
                </h3>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                  <span className={`size-1.5 rounded-full ${STATUS_DOT[state]}`} />
                  {tOf(t, STATUS_KEY[state])}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {tOf(t, service.effectKey)}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                <span className="font-semibold">{tOf(t, "svc_beneficiaries")}: </span>
                {tOf(t, service.usersKey)}
              </p>
              {service.requiredVars.length > 0 ? (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-foreground">
                    {tOf(t, "svc_required_vars")}:
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {service.requiredVars.map((name) => (
                      <code
                        key={name}
                        dir="ltr"
                        className="rounded-md border border-border bg-muted/50 px-2 py-0.5 font-mono text-[11px] text-foreground"
                      >
                        {name}
                      </code>
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {tOf(t, service.sourceKey)}
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">
                  {tOf(t, service.sourceKey)}
                </p>
              )}
              {docsUrl ? (
                <a
                  href={docsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-xs font-semibold text-primary underline-offset-4 hover:underline"
                >
                  {tOf(t, "svc_docs")}
                </a>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
