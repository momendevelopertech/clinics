# System Logging Architecture Guide

Standardized logging guide for OpenHealthCRM Backend (API Routes & Server Actions) and Frontend (Client Dialogs & Hooks).

---

## 1. Backend Logging Standard (`logServerError`)

All API endpoints (`src/app/api/...`) must wrap database operations and third-party interactions in try-catch blocks and log structured errors using `logServerError`.

### Example (API Route):
```typescript
import { logServerError } from "@/lib/safe-logger";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // ... logic
  } catch (error) {
    logServerError("Failed to execute clinic operation", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

- **Output**: Logs timestamp, error context string, message, and sanitized stack trace without leaking PII or credentials.

---

## 2. Frontend Logging Standard (`logClientError`)

Client-side dialogs, form submissions, and data fetches use `logClientError` for diagnostic tracking in browser console and error reporting.

### Example (React Component):
```typescript
import { logClientError } from "@/lib/client-logger";
import { toast } from "sonner";

try {
  // fetch / action
} catch (error) {
  logClientError("Dialog action failed", error);
  toast.error(handleApiError(error));
}
```

---

## 3. Permanence Principle
Logging instrumentation added during feature fixes remains part of the production codebase for ongoing observability and rapid failure diagnosis.
