"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/locale/locale-provider";
import { itemCountLabel } from "@/lib/pagination";

type DataPaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

export function DataPagination({ page, pageSize, total, onPageChange }: DataPaginationProps) {
  const { t } = useLocale();
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex items-center justify-between gap-4 border-t px-6 py-3">
      <p className="text-xs text-neutral-500">
        {itemCountLabel(total, t("pagination_item"), t("pagination_items"))}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="flex items-center gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          {t("pagination_prev")}
        </Button>
        <span className="text-xs text-neutral-500">
          {t("pagination_pageOf")
            .replace("{page}", String(page))
            .replace("{pageCount}", String(pageCount))}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          className="flex items-center gap-1"
        >
          {t("pagination_next")}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}