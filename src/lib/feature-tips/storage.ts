import type { VisibilityState } from "./types";

const STORAGE_KEY = "ohcrm:feature-tips:v1";

const DEFAULT_STATE: VisibilityState = {
  dismissed: {},
  enabled: true,
};

export function loadState(): VisibilityState {
  if (typeof window === "undefined") {
    return { ...DEFAULT_STATE, dismissed: {} };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_STATE, dismissed: {} };
    }
    const parsed = JSON.parse(raw) as Partial<VisibilityState>;
    return {
      dismissed: parsed.dismissed ?? {},
      enabled: parsed.enabled ?? true,
    };
  } catch {
    return { ...DEFAULT_STATE, dismissed: {} };
  }
}

export function isTipDismissed(state: VisibilityState, tipId: string): boolean {
  return state.dismissed[tipId] !== undefined;
}

export function markTipDismissed(tipId: string): VisibilityState {
  const state = loadState();
  state.dismissed = { ...state.dismissed, [tipId]: Date.now() };
  persistState(state);
  return state;
}

export function setTipsEnabled(enabled: boolean): VisibilityState {
  const state = loadState();
  state.enabled = enabled;
  persistState(state);
  return state;
}

export function resetDismissed(): VisibilityState {
  const state: VisibilityState = {
    dismissed: {},
    enabled: loadState().enabled,
  };
  persistState(state);
  return state;
}

function persistState(state: VisibilityState): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Persistence failures must never break the UI.
  }
}