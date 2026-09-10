"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getPendingOperations,
  removeOperation,
  clearAllOperations,
  type OfflineOperation,
} from "@/lib/pwa/offline-mutations";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useMounted } from "@/hooks/use-mounted";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  RefreshCw,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

export function PendingChangesButton() {
  const [count, setCount] = useState(0);
  const mounted = useMounted();

  const refreshCount = useCallback(async () => {
    try {
      const ops = await getPendingOperations();
      setCount(ops.filter((op) => op.status !== "synced").length);
    } catch {
      // IndexedDB not available
    }
  }, []);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => void refreshCount(), 0);
    const interval = window.setInterval(() => void refreshCount(), 10000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
    };
  }, [refreshCount]);

  if (!mounted || count === 0) return null;

  return (
    <PendingChangesDialog count={count} onRefresh={refreshCount} />
  );
}

function PendingChangesDialog({
  count,
  onRefresh,
}: {
  count: number;
  onRefresh: () => void;
}) {
  const [operations, setOperations] = useState<OfflineOperation[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadOperations = useCallback(async () => {
    setLoading(true);
    try {
      const ops = await getPendingOperations();
      setOperations(ops);
    } catch {
      // IndexedDB not available
    }
    setLoading(false);
  }, []);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) void loadOperations();
  };

  const handleRemove = async (id: string) => {
    await removeOperation(id);
    await loadOperations();
    await onRefresh();
    toast.success("Operation removed");
  };

  const handleClearAll = async () => {
    await clearAllOperations();
    await loadOperations();
    await onRefresh();
    toast.success("All pending operations cleared");
  };

  const statusIcon = (status: OfflineOperation["status"]) => {
    switch (status) {
      case "pending":
        return <Clock className="h-3.5 w-3.5 text-amber-500" />;
      case "syncing":
        return <RefreshCw className="h-3.5 w-3.5 animate-spin text-cyan-500" />;
      case "synced":
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
      case "conflict":
        return <AlertTriangle className="h-3.5 w-3.5 text-red-500" />;
    }
  };

  const statusLabel = (status: OfflineOperation["status"]) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="border-amber-300 text-amber-700">
            Pending
          </Badge>
        );
      case "syncing":
        return (
          <Badge variant="outline" className="border-cyan-300 text-cyan-700">
            Syncing
          </Badge>
        );
      case "synced":
        return (
          <Badge variant="outline" className="border-emerald-300 text-emerald-700">
            Synced
          </Badge>
        );
      case "conflict":
        return (
          <Badge variant="outline" className="border-red-300 text-red-700">
            Conflict
          </Badge>
        );
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-9 rounded-[14px] border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
        >
          <Eye className="mr-1.5 h-3.5 w-3.5" />
          {count} pending
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg rounded-[24px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Pending Changes
            <Badge variant="secondary">{count}</Badge>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : operations.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No pending changes
          </div>
        ) : (
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {operations.map((op) => (
              <div
                key={op.id}
                className="flex items-center gap-3 rounded-[14px] border border-white/60 p-3 dark:border-white/6"
              >
                {statusIcon(op.status)}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {op.method} {op.entityType}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {formatTime(op.timestamp)}
                  </p>
                  {op.conflictDetails && (
                    <p className="mt-1 text-xs text-red-600">
                      {op.conflictDetails}
                    </p>
                  )}
                </div>
                {statusLabel(op.status)}
                {op.status === "pending" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => handleRemove(op.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" size="sm" onClick={handleClearAll}>
            Clear all
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
