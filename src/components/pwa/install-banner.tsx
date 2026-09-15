"use client";

import { usePwaInstall } from "@/hooks/use-pwa-install";
import { useMounted } from "@/hooks/use-mounted";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { useState } from "react";
import { useLocale } from "@/components/locale/locale-provider";

export function InstallBanner() {
  const { isInstallable, install } = usePwaInstall();
  const { t } = useLocale();
  const mounted = useMounted();
  const [dismissed, setDismissed] = useState(
    () =>
      typeof window !== "undefined" &&
      localStorage.getItem("pwa-install-dismissed") === "true"
  );

  const handleDismiss = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("pwa-install-dismissed", "true");
    }
    setDismissed(true);
  };

  if (!mounted || !isInstallable || dismissed) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 max-w-sm">
      <div className="rounded-lg border border-border bg-card/95 p-4 shadow-xl backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-content-center rounded-md bg-primary/10 text-primary">
            <Download className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              {t("pwa_installTitle")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("pwa_installDesc")}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Button
                size="sm"
                onClick={install}
                className="h-8 rounded-md px-3 text-xs"
              >
                {t("pwa_installBtn")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="h-8 rounded-md px-3 text-xs"
              >
                {t("pwa_notNow")}
              </Button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}