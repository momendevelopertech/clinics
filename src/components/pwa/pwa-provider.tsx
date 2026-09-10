"use client";

import { useCallback, useEffect, type ReactNode } from "react";
import { useOfflineMutationCapture } from "@/hooks/use-offline-mutation-capture";
import { useSyncEngine } from "@/hooks/use-sync-engine";
import { OfflineIndicator } from "@/components/pwa/offline-indicator";
import { InstallBanner } from "@/components/pwa/install-banner";
import { SWUpdateBanner } from "@/components/pwa/sw-update-banner";

export function PWAProvider({
  children,
  orgId = "",
}: {
  children: ReactNode;
  orgId?: string;
}) {
  useOfflineMutationCapture();
  useSyncEngine();

  const sendOrgContext = useCallback(
    (controller: ServiceWorker | null) => {
      if (!controller || !orgId) return;
      try {
        controller.postMessage({ type: "SET_ORG_CONTEXT", orgId });
      } catch {
        // SW not yet controlled
      }
    },
    [orgId]
  );

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator))
      return;

    if (navigator.serviceWorker.controller) {
      sendOrgContext(navigator.serviceWorker.controller);
    }

    const onControllerChange = () => {
      sendOrgContext(navigator.serviceWorker.controller);
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange
    );

    void navigator.serviceWorker.ready.then((reg) => {
      sendOrgContext(reg.active);
    });

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange
      );
    };
  }, [sendOrgContext]);

  return (
    <>
      {children}
      <OfflineIndicator />
      <InstallBanner />
      <SWUpdateBanner />
    </>
  );
}