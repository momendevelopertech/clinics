"use client";

import * as React from "react";
import { ShieldX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/locale/locale-provider";

export function PermissionDenied({
  className,
  title,
  description,
}: {
  className?: string;
  title?: string;
  description?: string;
}) {
  const { t } = useLocale();

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
        <h2 className="text-lg font-semibold text-foreground">
          {title ?? t("perm_deniedTitle")}
        </h2>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          {description ?? t("perm_deniedDesc")}
        </p>
      </div>
    </div>
  );
}
