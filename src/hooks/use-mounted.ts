"use client";

import { useSyncExternalStore } from "react";

function noop() {
  return () => undefined;
}

export function useMounted(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}