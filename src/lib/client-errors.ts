/**
 * Shared client-side error parsing for API responses.
 *
 * API handlers return `{ error: string }` (and sometimes `details`). This
 * helper extracts the human-readable server message so pages can toast it
 * instead of a generic "failed" fallback, and never surfaces raw exceptions,
 * stack traces, or JSON payloads to the user.
 */
type ApiErrorBody = { error?: unknown; details?: unknown };

export async function parseApiError(
  response: Response,
  fallback: string,
): Promise<string> {
  let body: ApiErrorBody = {};
  try {
    body = (await response.json()) as ApiErrorBody;
  } catch {
    // Non-JSON error body (proxy / network). The caller-localized fallback wins.
  }
  const message = body.error;
  if (typeof message === "string" && message.trim()) {
    return message.trim();
  }
  return fallback;
}