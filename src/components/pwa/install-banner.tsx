"use client";

import { usePwaInstall } from "@/hooks/use-pwa-install";
import { useMounted } from "@/hooks/use-mounted";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { useState } from "react";

export function InstallBanner() {
  const { isInstallable, install } = usePwaInstall();
  const mounted = useMounted();
  const [dismissed] = useState(
    () =>
      typeof window !== "undefined" &&
      localStorage.getItem("pwa-install-dismissed") === "true"
  );

  const handleDismiss = () => {
    if (typeof window === "undefined") return;
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  if (!mounted || !isInstallable || dismissed) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 max-w-sm">
      <div className="rounded-[20px] border border-white/60 bg-white/95 p-4 shadow-2xl backdrop-blur-sm dark:border-white/6 dark:bg-neutral-900/95">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-content-center rounded-[14px] bg-primary/10 text-primary">
            <Download className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Install Healthcare CRM</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add to your home screen for quick access and offline support.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Button
                size="sm"
                onClick={install}
                className="h-8 rounded-[12px] px-3 text-xs"
              >
                Install
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="h-8 rounded-[12px] px-3 text-xs"
              >
                Not now
              </Button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="shrink-0 rounded-[10px] p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}