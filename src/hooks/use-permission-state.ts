"use client";

import * as React from "react";

/**
 * Tracks whether a fetch failed with a 403 (permission denied).
 * Returns helpers to run a guarded request and reset the flag.
 */
export function usePermissionState() {
  const [forbidden, setForbidden] = React.useState(false);

  const guardedFetch = React.useCallback(
    async <T,>(
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<T | null> => {
      try {
        const response = await fetch(input, init);
        if (response.status === 403) {
          setForbidden(true);
          return null;
        }
        if (!response.ok) {
          return null;
        }
        return (await response.json()) as T;
      } catch {
        return null;
      }
    },
    [],
  );

  const reset = React.useCallback(() => setForbidden(false), []);

  return { forbidden, setForbidden, guardedFetch, reset };
}
