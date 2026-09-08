"use client";

import * as React from "react";
import { ShieldX } from "lucide-react";
import { cn } from "@/lib/utils";

export function PermissionDenied({
  className,
  title = "You don't have permission",
  description = "Your role doesn't allow you to view or use this page. Contact your clinic owner if you think this is a mistake.",
}: {
  className?: string;
  title?: string;
  description?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-3xl border border-border/60 surface-panel px-6 py-16 text-center",
        className,
      )}
    >
      <div className="rounded-full bg-red-500/10 p-4 text-red-600 dark:text-red-400">
        <ShieldX className="h-8 w-8" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}
