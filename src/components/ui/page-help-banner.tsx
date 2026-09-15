"use client";

import * as React from "react";
import { Info, X, ChevronDown, ChevronUp, Users, Clock } from "lucide-react";
import { useLocale } from "@/components/locale/locale-provider";
import { cn } from "@/lib/utils";

export interface PageHelpBannerProps {
  pageKey?: string;
  titleKey?: string;
  descriptionKey?: string;
  targetRolesKey?: string;
  actionHintKey?: string;

  // Direct props from remote version
  title?: string;
  description?: string;
  audience?: string;
  actionHint?: string;

  className?: string;
}

export function PageHelpBanner({
  pageKey,
  titleKey,
  descriptionKey,
  targetRolesKey,
  actionHintKey,
  title: directTitle,
  description: directDescription,
  audience: directAudience,
  actionHint: directActionHint,
  className,
}: PageHelpBannerProps) {
  const { t } = useLocale();
  const [dismissed, setDismissed] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);

  const storageKey = pageKey ? `banner_dismissed_${pageKey}` : null;

  React.useEffect(() => {
    if (!storageKey) return;
    try {
      const isDismissed = sessionStorage.getItem(storageKey);
      if (isDismissed === "true") {
        setDismissed(true);
      }
    } catch {
      // Ignore sessionStorage restriction
    }
  }, [storageKey]);

  const rawTitle = directTitle ?? (titleKey ? t(titleKey) : pageKey ? t(`banner_${pageKey}_title`) : "");
  const title = rawTitle.startsWith("banner_") ? "" : rawTitle;

  const rawDescription = directDescription ?? (descriptionKey ? t(descriptionKey) : pageKey ? t(`banner_${pageKey}_desc`) : "");
  const description = rawDescription.startsWith("banner_") ? "" : rawDescription;

  const rawTargetRoles = directAudience ?? (targetRolesKey ? t(targetRolesKey) : pageKey ? t(`banner_${pageKey}_roles`) : "");
  const targetRoles = rawTargetRoles.startsWith("banner_") ? "" : rawTargetRoles;

  const rawActionHint = directActionHint ?? (actionHintKey ? t(actionHintKey) : pageKey ? t(`banner_${pageKey}_action`) : "");
  const actionHint = rawActionHint.startsWith("banner_") ? "" : rawActionHint;

  if (dismissed || !title) return null;

  const handleDismiss = () => {
    setDismissed(true);
    if (storageKey) {
      try {
        sessionStorage.setItem(storageKey, "true");
      } catch {
        // Ignore
      }
    }
  };

  return (
    <section
      className={cn(
        "relative rounded-lg border border-primary/20 bg-card p-4 text-xs shadow-2xs transition-all",
        className,
      )}
      aria-label={title || "Help Banner"}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="grid size-7 shrink-0 place-content-center rounded-md bg-primary/10 text-primary mt-0.5">
            <Info className="h-4 w-4" />
          </div>
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-bold text-foreground text-xs sm:text-sm">{title}</h2>
              {targetRoles ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  <Users className="h-3 w-3" />
                  {targetRoles}
                </span>
              ) : null}
            </div>

            {!collapsed ? (
              <>
                <p className="text-muted-foreground leading-relaxed text-xs">{description}</p>
                {actionHint ? (
                  <p className="font-medium text-foreground pt-1 flex items-center gap-1.5 text-[11px]">
                    <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="text-primary font-bold">{t("banner_quick_tip") || "Tip"}:</span> {actionHint}
                  </p>
                ) : null}
              </>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-md p-1 text-muted-foreground hover:bg-primary/10 hover:text-foreground transition-colors"
            title={collapsed ? t("common_expand") || "Expand" : t("common_collapse") || "Collapse"}
          >
            {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            title={t("common_close") || "Close"}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}
