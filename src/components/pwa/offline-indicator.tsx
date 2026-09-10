"use client";

import { useState } from "react";
import { Wifi, WifiOff, RefreshCw, CloudOff } from "lucide-react";
import { useOfflineStatus } from "@/hooks/use-offline-status";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";

export function OfflineIndicator() {
  const { isOnline, pendingCount, isSyncing, lastSyncTime } =
    useOfflineStatus();
  const [showDetail, setShowDetail] = useState(false);
  const mounted = useMounted();

  if (!mounted) return null;

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setShowDetail(!showDetail)}
        className={cn(
          "flex items-center gap-2 rounded-[16px] px-4 py-2.5 text-sm font-medium shadow-lg backdrop-blur-sm transition-all",
          !isOnline &&
            "border border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300",
          isOnline &&
            pendingCount > 0 &&
            !isSyncing &&
            "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
          isSyncing &&
            "border border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950 dark:text-cyan-300"
        )}
      >
        {isSyncing ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : !isOnline ? (
          <WifiOff className="h-4 w-4" />
        ) : (
          <CloudOff className="h-4 w-4" />
        )}
        <span>
          {!isOnline
            ? "Offline"
            : isSyncing
              ? "Syncing..."
              : `${pendingCount} pending`}
        </span>
      </button>

      {showDetail && (
        <div className="absolute bottom-full right-0 mb-2 w-72 rounded-[18px] border border-white/60 bg-white p-4 shadow-xl dark:border-white/6 dark:bg-neutral-900">
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="flex items-center gap-1.5 font-medium">
                {isOnline ? (
                  <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <WifiOff className="h-3.5 w-3.5 text-red-500" />
                )}
                {isOnline ? "Connected" : "Disconnected"}
              </span>
            </div>
            {pendingCount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Pending changes</span>
                <span className="font-medium">{pendingCount}</span>
              </div>
            )}
            {isSyncing && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Syncing</span>
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-cyan-500" />
              </div>
            )}
            {lastSyncTime && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last synced</span>
                <span className="font-medium">
                  {lastSyncTime.toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}