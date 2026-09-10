"use client";

import { useCallback, useSyncExternalStore } from "react";

interface SyncState {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncTime: Date | null;
}

let state: SyncState = {
  isOnline:
    typeof navigator !== "undefined" ? navigator.onLine : true,
  pendingCount: 0,
  isSyncing: false,
  lastSyncTime: null,
};

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function setState(patch: Partial<SyncState>) {
  state = { ...state, ...patch };
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

if (typeof window !== "undefined") {
  const handleOnline = () => setState({ isOnline: true });
  const handleOffline = () => setState({ isOnline: false });

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);
}

export function useOfflineStatus() {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => state,
    () => state
  );

  const setPendingCount = useCallback((count: number) => {
    setState({ pendingCount: count });
  }, []);

  const setSyncing = useCallback((syncing: boolean) => {
    setState({ isSyncing: syncing });
  }, []);

  const markSynced = useCallback(() => {
    const now = new Date();
    setState({ pendingCount: 0, isSyncing: false, lastSyncTime: now });
  }, []);

  return {
    ...snapshot,
    setPendingCount,
    setSyncing,
    markSynced,
  };
}