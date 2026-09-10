"use client";

import { useEffect, useCallback, useState } from "react";
import {
  getPendingOperations,
  updateOperationStatus,
  requiresConflictUI,
} from "@/lib/pwa/offline-mutations";
import { useOfflineStatus } from "@/hooks/use-offline-status";
import { toast } from "sonner";

type SyncResult = {
  synced: number;
  conflicts: number;
  failed: number;
};

export function useSyncEngine() {
  const { setSyncing, markSynced, setPendingCount } = useOfflineStatus();
  const [isSyncing, setIsSyncing] = useState(false);

  const syncPendingOperations = useCallback(async (): Promise<SyncResult> => {
    if (isSyncing) return { synced: 0, conflicts: 0, failed: 0 };

    setIsSyncing(true);
    setSyncing(true);

    const result: SyncResult = { synced: 0, conflicts: 0, failed: 0 };

    try {
      const operations = await getPendingOperations();
      const pendingOps = operations.filter((op) => op.status === "pending");

      for (const op of pendingOps) {
        try {
          await updateOperationStatus(op.id, "syncing");

          const headers: Record<string, string> = {
            "Content-Type": "application/json",
          };
          if (op.baseVersion) {
            headers["X-Base-Version"] = op.baseVersion;
          }

          const response = await fetch(op.endpoint, {
            method: op.method,
            headers,
            body: op.body || undefined,
          });

          if (response.status === 409) {
            const conflictData = await response.json().catch(() => ({}));
            await updateOperationStatus(
              op.id,
              "conflict",
              JSON.stringify(conflictData)
            );
            result.conflicts++;
          } else if (response.ok || response.status === 202) {
            if (requiresConflictUI(op.entityType, op.method)) {
              await updateOperationStatus(op.id, "conflict", "requires-review");
              result.conflicts++;
            } else {
              await updateOperationStatus(op.id, "synced");
              result.synced++;
            }
          } else {
            await updateOperationStatus(op.id, "pending");
            result.failed++;
          }
        } catch {
          await updateOperationStatus(op.id, "pending");
          result.failed++;
        }
      }

      const remaining = await getPendingOperations();
      const remainingPending = remaining.filter(
        (op) => op.status === "pending"
      ).length;
      setPendingCount(remainingPending);

      if (result.synced > 0 && result.conflicts === 0 && result.failed === 0) {
        markSynced();
      }

      return result;
    } finally {
      setIsSyncing(false);
      setSyncing(false);
    }
  }, [isSyncing, setSyncing, markSynced, setPendingCount]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      setTimeout(() => {
        syncPendingOperations().then((result) => {
          if (result.conflicts > 0) {
            toast.warning(
              `${result.conflicts} change(s) have conflicts and need your review`
            );
          } else if (result.synced > 0) {
            toast.success(
              `${result.synced} pending change(s) synced successfully`
            );
          }
        });
      }, 2000);
    };

    const handleRunSync = (event: MessageEvent) => {
      if (event.data?.type === "RUN_SYNC") {
        syncPendingOperations().then((result) => {
          if (result.conflicts > 0) {
            toast.warning(
              `${result.conflicts} change(s) have conflicts and need your review`
            );
          } else if (result.synced > 0) {
            toast.success(
              `${result.synced} pending change(s) synced successfully`
            );
          }
        });
      }
    };

    window.addEventListener("online", handleOnline);
    navigator.serviceWorker.addEventListener("message", handleRunSync);

    if ("serviceWorker" in navigator && "SyncManager" in window) {
      navigator.serviceWorker.ready
        .then((reg) => {
          if ("sync" in reg) {
            return (reg as ServiceWorkerRegistration & {
              sync: { register: (tag: string) => Promise<void> };
            }).sync.register("sync-mutations");
          }
        })
        .catch(() => {
          // Background Sync not supported
        });
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      navigator.serviceWorker.removeEventListener("message", handleRunSync);
    };
  }, [syncPendingOperations]);

  return {
    isSyncing,
    syncPendingOperations,
  };
}
