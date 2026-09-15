"use client";

import * as React from "react";
import { Info, X, ChevronDown, ChevronUp } from "lucide-react";
import { useLocale } from "@/components/locale/locale-provider";
import { cn } from "@/lib/utils";

interface PageHelpBannerProps {
  pageKey: string;
  titleKey?: string;
  descriptionKey?: string;
  targetRolesKey?: string;
  actionHintKey?: string;
  className?: string;
}

export function PageHelpBanner({
  pageKey,
  titleKey,
  descriptionKey,
  targetRolesKey,
  actionHintKey,
  className,
}: PageHelpBannerProps) {
  const { t } = useLocale();
  const [dismissed, setDismissed] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);

  const storageKey = `banner_dismissed_${pageKey}`;

  React.useEffect(() => {
    try {
      const isDismissed = sessionStorage.getItem(storageKey);
      if (isDismissed === "true") {
        setDismissed(true);
      }
    } catch {
      // Ignore sessionStorage restriction
    }
  }, [storageKey]);

  if (dismissed) return null;

  const title = titleKey ? t(titleKey) : t(`banner_${pageKey}_title`);
  const description = descriptionKey ? t(descriptionKey) : t(`banner_${pageKey}_desc`);
  const targetRoles = targetRolesKey ? t(targetRolesKey) : t(`banner_${pageKey}_roles`);
  const actionHint = actionHintKey ? t(actionHintKey) : t(`banner_${pageKey}_action`);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(storageKey, "true");
    } catch {
      // Ignore
    }
  };

  return (
    <div
      className={cn(
        "relative rounded-lg border border-primary/20 bg-primary/5 p-4 text-xs shadow-2xs transition-all",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="grid size-6 shrink-0 place-content-center rounded-md bg-primary/10 text-primary mt-0.5">
            <Info className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground text-xs sm:text-sm">{title}</h3>
              {targetRoles ? (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {targetRoles}
                </span>
              ) : null}
            </div>

            {!collapsed ? (
              <>
                <p className="text-muted-foreground leading-relaxed">{description}</p>
                {actionHint ? (
                  <p className="font-medium text-foreground pt-1 flex items-center gap-1 text-[11px]">
                    <span className="text-primary font-bold">💡 {t("banner_quick_tip")}:</span> {actionHint}
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
            title={collapsed ? t("common_expand") : t("common_collapse")}
          >
            {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            title={t("common_close")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
