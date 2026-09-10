"use client";

import { useEffect, useState, type ReactNode } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/locale/locale-provider";

export function useDelayedLoading(loading: boolean, delay = 250) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(
      () => setShow(loading),
      loading ? delay : 0,
    );
    return () => window.clearTimeout(id);
  }, [loading, delay]);

  return show;
}

type TableSkeletonProps = {
  rows?: number;
  columns?: number;
};

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <div className="divide-y" aria-hidden="true">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4 px-6 py-4">
          {Array.from({ length: columns }).map((_, columnIndex) => (
            <div
              key={columnIndex}
              className="h-4 flex-1 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700"
              style={{ maxWidth: columnIndex === 0 ? "40%" : undefined }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
};

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {icon ? <div className="mb-4">{icon}</div> : null}
      <p className="font-medium text-neutral-900 dark:text-neutral-100">
        {title}
      </p>
      {description ? (
        <p className="mt-1 text-sm text-neutral-500">{description}</p>
      ) : null}
    </div>
  );
}

type ErrorStateProps = {
  title: string;
  message?: string;
  onRetry?: () => void;
};

export function ErrorState({ title, message, onRetry }: ErrorStateProps) {
  const { t } = useLocale();

  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <TriangleAlert className="mb-3 h-10 w-10 text-red-500" />
      <p className="font-medium text-neutral-900 dark:text-neutral-100">
        {title}
      </p>
      {message ? (
        <p className="mt-1 text-sm text-neutral-500">{message}</p>
      ) : null}
      {onRetry ? (
        <Button
          variant="outline"
          size="sm"
          className="mt-4 flex items-center gap-2"
          onClick={onRetry}
        >
          <RefreshCw className="h-4 w-4" />
          {t("common_retry")}
        </Button>
      ) : null}
    </div>
  );
}