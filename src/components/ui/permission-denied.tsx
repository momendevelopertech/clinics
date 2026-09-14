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
        "flex flex-col items-center justify-center gap-4 rounded-lg border border-border surface-panel px-6 py-16 text-center shadow-sm",
        className,
      )}
    >
      <div className="rounded-full bg-critical-bg p-4 text-critical-text">
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
