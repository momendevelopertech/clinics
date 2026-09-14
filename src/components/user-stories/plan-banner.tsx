"use client";

import * as React from "react";
import Link from "next/link";
import { CreditCard } from "lucide-react";
import { useLocale } from "@/components/locale/locale-provider";
import {
  parseEntitlementsResponse,
  type PublicPlanSummary,
} from "@/lib/user-stories-public";

type BannerStatus =
  | { kind: "loading" }
  | { kind: "hidden" }
  | { kind: "ready"; summary: PublicPlanSummary };

/**
 * Live plan banner for logged-in visitors. Fetches the REAL backend shape
 * (GET /api/plan/entitlements -> { plan, modules, ... }); anonymous visitors
 * get 401 and the banner hides itself. Lazy-loaded (ssr:false) so public
 * visitors pay zero cost for it.
 */
export function PlanBanner() {
  const { t } = useLocale();
  const [status, setStatus] = React.useState<BannerStatus>({ kind: "loading" });

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/plan/entitlements", { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) setStatus({ kind: "hidden" });
          return;
        }
        const payload: unknown = await response.json();
        const summary = parseEntitlementsResponse(payload);
        if (!cancelled) setStatus(summary ? { kind: "ready", summary } : { kind: "hidden" });
      } catch {
        if (!cancelled) setStatus({ kind: "hidden" });
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (status.kind === "hidden") return null;

  if (status.kind === "loading") {
    return (
      <div
        aria-hidden="true"
        className="mx-auto mb-6 h-16 max-w-6xl animate-pulse rounded-lg border border-border bg-card shadow-xs"
      />
    );
  }

  return (
    <div className="mx-auto mb-6 flex max-w-6xl flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-5 py-4 shadow-xs">
      <p className="flex items-center gap-2 text-sm">
        <span className="grid size-9 place-content-center rounded-md bg-primary/10 text-primary">
          <CreditCard className="h-4 w-4" />
        </span>
        <span className="text-muted-foreground">{t("plan_currentPlan")}: </span>
        <span className="font-semibold">{status.summary.planName}</span>
        <span className="text-muted-foreground">
          · {status.summary.enabledModules} {t("userStories_modules")}
        </span>
      </p>
      <Link
        href="/plan"
        className="text-sm font-semibold text-primary hover:underline"
      >
        {t("nav_plan")}
      </Link>
    </div>
  );
}
