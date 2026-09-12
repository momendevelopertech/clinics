"use client";

import * as React from "react";
import type { ConfigGatedFeature, FeatureConfigStatus } from "@/lib/feature-config";
import { FEATURE_DOC_LINKS } from "@/lib/feature-config";

type ConfigStatusResponse = {
  features: Record<ConfigGatedFeature, FeatureConfigStatus>;
};

let cached: Promise<ConfigStatusResponse | null> | null = null;

function fetchStatus(): Promise<ConfigStatusResponse | null> {
  if (!cached) {
    cached = fetch("/api/config/status")
      .then((r) => (r.ok ? (r.json() as Promise<ConfigStatusResponse>) : null))
      .catch(() => null);
  }
  return cached;
}

/** Shared, cached read of `/api/config/status` for badges + banners. */
export function useFeatureConfig() {
  const [status, setStatus] = React.useState<ConfigStatusResponse | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let alive = true;
    fetchStatus()
      .then((data) => {
        if (alive) setStatus(data);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const get = React.useCallback(
    (feature: ConfigGatedFeature): FeatureConfigStatus | null =>
      status?.features?.[feature] ?? null,
    [status],
  );

  return { status, loading, get };
}

export { FEATURE_DOC_LINKS };
