"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Lock, Loader2 } from "lucide-react";
import { useLocale } from "@/components/locale/locale-provider";

export function UpgradePrompt({ moduleKey }: { moduleKey: string }) {
  const { t } = useLocale();
  const [state, setState] = useState<"loading" | "locked" | "ok">("loading");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/plan/entitlements", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { modules?: Record<string, boolean> } | null) => {
        if (cancelled) return;
        setState(data && data.modules?.[moduleKey] === true ? "ok" : "locked");
      })
      .catch(() => {
        if (!cancelled) setState("ok");
      });
    return () => {
      cancelled = true;
    };
  }, [moduleKey]);

  if (state === "loading") {
    return (
      <div className="rounded-md border border-warning-text/20 bg-warning-bg px-4 py-3">
        <Loader2 className="h-4 w-4 animate-spin text-warning-text" />
      </div>
    );
  }
  if (state !== "locked") return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning-text/20 bg-warning-bg px-4 py-3.5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 grid size-9 shrink-0 place-content-center rounded-md bg-background/50 text-warning-text">
          <Lock className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-warning-text">
            {t("upg_lockedTitle")}
          </p>
          <p className="mt-0.5 text-xs text-warning-text/90">
            {t("upg_lockedBody")}
          </p>
        </div>
      </div>
      <Link
        href={`/plan?lock=${encodeURIComponent(moduleKey)}`}
        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
      >
        {t("upg_seePlans")}
        <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
      </Link>
    </div>
  );
}