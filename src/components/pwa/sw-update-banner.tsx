"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useMounted } from "@/hooks/use-mounted";

interface SWUpdate {
  isUpdateAvailable: boolean;
  update: ServiceWorker | null;
}

export function useSWUpdate() {
  const [updateState, setUpdateState] = useState<SWUpdate>({
    isUpdateAvailable: false,
    update: null,
  });

  const applyUpdate = useCallback(async () => {
    if (!updateState.update) return;
    updateState.update.postMessage({ type: "SKIP_WAITING" });
  }, [updateState.update]);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator))
      return;

    let reloading = false;

    const onControllerChange = () => {
      setUpdateState({ isUpdateAvailable: false, update: null });
      if (!reloading) {
        reloading = true;
        window.location.reload();
      }
    };

    navigator.serviceWorker.ready.then((reg) => {
      if (reg.waiting) {
        setUpdateState({ isUpdateAvailable: true, update: reg.waiting });
      }

      reg.addEventListener("updatefound", () => {
        const newSW = reg.installing;
        if (!newSW) return;

        newSW.addEventListener("statechange", () => {
          if (
            newSW.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            setUpdateState({ isUpdateAvailable: true, update: newSW });
          }
        });
      });
    });

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange
    );

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange
      );
    };
  }, []);

  return { ...updateState, applyUpdate };
}

export function SWUpdateBanner() {
  const { isUpdateAvailable, applyUpdate } = useSWUpdate();
  const mounted = useMounted();

  if (!mounted || !isUpdateAvailable) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <button
        onClick={() => void applyUpdate()}
        className="flex items-center gap-2 rounded-md border border-accent-blue-text/20 bg-accent-blue-bg px-4 py-2.5 text-sm font-medium text-accent-blue-text shadow-lg backdrop-blur-sm transition hover:opacity-90"
      >
        <RefreshCw className="h-4 w-4" />
        New version available — Refresh
      </button>
    </div>
  );
}