"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  addPendingOperation,
  getPendingCount,
  isEligibleForOfflineQueue,
  getEntityType,
} from "@/lib/pwa/offline-mutations";
import { useOfflineStatus } from "@/hooks/use-offline-status";

let pendingCountPollInterval: ReturnType<typeof setInterval> | null = null;

export function useOfflineMutationCapture() {
  const { setPendingCount, isOnline } = useOfflineStatus();
  const originalFetchRef = useRef<typeof fetch | null>(null);

  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await getPendingCount();
      setPendingCount(count);
    } catch {
      // IndexedDB not available
    }
  }, [setPendingCount]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof fetch === "undefined") return;

    if (!originalFetchRef.current) {
      originalFetchRef.current = window.fetch;
    }

    const originalFetch = originalFetchRef.current;

    window.fetch = async function (
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      const method = init?.method?.toUpperCase() ?? "GET";

      if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
        return originalFetch.call(window, input, init);
      }

      if (!navigator.onLine) {
        if (isEligibleForOfflineQueue(url, method)) {
          try {
            const body = init?.body
              ? typeof init.body === "string"
                ? init.body
                : JSON.stringify(init.body)
              : "";

            const entityType = getEntityType(url, method);

            await addPendingOperation({
              endpoint: url,
              method,
              body,
              timestamp: Date.now(),
              orgId: "",
              entityType,
            });

            await refreshPendingCount();

            return new Response(
              JSON.stringify({
                _offline: true,
                _queued: true,
                message: "Operation queued for sync when online",
              }),
              {
                status: 202,
                headers: { "Content-Type": "application/json" },
              }
            );
          } catch {
            // Fall through to normal fetch which will fail
          }
        }

        return new Response(
          JSON.stringify({ error: "You are offline" }),
          { status: 503, headers: { "Content-Type": "application/json" } }
        );
      }

      try {
        const response = await originalFetch.call(window, input, init);
        return response;
      } catch (error) {
        if (
          isEligibleForOfflineQueue(url, method) &&
          (error instanceof TypeError ||
            (error as Error)?.message?.includes("Failed to fetch") ||
            (error as Error)?.message?.includes("NetworkError"))
        ) {
          try {
            const body = init?.body
              ? typeof init.body === "string"
                ? init.body
                : JSON.stringify(init.body)
              : "";

            const entityType = getEntityType(url, method);

            await addPendingOperation({
              endpoint: url,
              method,
              body,
              timestamp: Date.now(),
              orgId: "",
              entityType,
            });

            await refreshPendingCount();

            return new Response(
              JSON.stringify({
                _offline: true,
                _queued: true,
                message: "Operation queued for sync when online",
              }),
              {
                status: 202,
                headers: { "Content-Type": "application/json" },
              }
            );
          } catch {
            // Fall through to throw original error
          }
        }

        throw error;
      }
    };

    pendingCountPollInterval = setInterval(refreshPendingCount, 30000);

    refreshPendingCount();

    return () => {
      if (originalFetchRef.current) {
        window.fetch = originalFetchRef.current;
      }
      if (pendingCountPollInterval) {
        clearInterval(pendingCountPollInterval);
      }
    };
  }, [refreshPendingCount]);

  useEffect(() => {
    if (isOnline) {
      refreshPendingCount();
    }
  }, [isOnline, refreshPendingCount]);

  return { refreshPendingCount };
}
