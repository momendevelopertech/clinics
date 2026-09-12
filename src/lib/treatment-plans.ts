/** Treatment-plan status machines (pure). */

const PLAN_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ["draft", "active", "cancelled"],
  active: ["active", "completed", "cancelled"],
  completed: ["completed"],
  cancelled: ["cancelled"],
};

const STEP_TRANSITIONS: Record<string, readonly string[]> = {
  pending: ["pending", "done", "skipped"],
  done: ["done", "pending"],
  skipped: ["skipped", "pending"],
};

export function isPlanTransitionAllowed(current: string, next: string): boolean {
  return PLAN_TRANSITIONS[current]?.includes(next) ?? false;
}

export function isStepTransitionAllowed(current: string, next: string): boolean {
  return STEP_TRANSITIONS[current]?.includes(next) ?? false;
}

/** A plan with no pending steps is finishable (including one with no steps). */
export function isPlanFinishable(stepStatuses: string[]): boolean {
  return stepStatuses.every((s) => s !== "pending");
}
