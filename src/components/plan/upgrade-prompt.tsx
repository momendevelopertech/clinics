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
      <div className="rounded-[16px] border border-amber-200 bg-amber-50/80 px-4 py-3 dark:border-amber-400/20 dark:bg-amber-400/8">
        <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
      </div>
    );
  }
  if (state !== "locked") return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-amber-300/70 bg-linear-to-r from-amber-50 to-amber-100/60 px-4 py-3.5 dark:border-amber-400/25 dark:from-amber-400/10 dark:to-amber-400/5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 grid size-9 shrink-0 place-content-center rounded-[12px] bg-amber-500/15 text-amber-600 dark:text-amber-300">
          <Lock className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            {t("upg_lockedTitle")}
          </p>
          <p className="mt-0.5 text-xs text-amber-800/90 dark:text-amber-200/80">
            {t("upg_lockedBody")}
          </p>
        </div>
      </div>
      <Link
        href={`/plan?lock=${encodeURIComponent(moduleKey)}`}
        className="inline-flex items-center gap-1.5 rounded-[12px] bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-700"
      >
        {t("upg_seePlans")}
        <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
      </Link>
    </div>
  );
}