"use client";

import type { ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/locale/locale-provider";

type FilterBarProps = {
  children: ReactNode;
  hasActiveFilters: boolean;
  onReset: () => void;
};

export function FilterBar({
  children,
  hasActiveFilters,
  onReset,
}: FilterBarProps) {
  const { t } = useLocale();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">{children}</div>
      {hasActiveFilters ? (
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          onClick={onReset}
        >
          <RotateCcw className="h-4 w-4" />
          {t("common_resetFilters")}
        </Button>
      ) : null}
    </div>
  );
}