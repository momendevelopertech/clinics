# Project Audit Report — HealthCRM

**Date:** September 2026  
**Scope:** UI/UX, i18n, loader states, code quality, testing, gap analysis

---

## Executive Summary

Implemented a focused pass across the four hardest-hit pages (documents, consents, campaigns, communications) and their four dialogs, unified shared components, added i18n parity, and performed a code-quality sweep. All changes pass typecheck, lint (0 errors), tests (30 files / 147 tests), and build.

---

## What Changed

### 1. Shared UI Primitives (new)

| File | Purpose |
|---|---|
| `src/components/ui/loading.tsx` | `TableSkeleton`, `EmptyState`, `ErrorState`, `useDelayedLoading` |
| `src/components/ui/filter-bar.tsx` | `FilterBar` — wraps children + "Reset filters" button when filters active |
| `src/components/ui/permission-denied.tsx` | Updated to use `useLocale()` with `perm_deniedTitle`/`perm_deniedDesc` fallbacks |

`useDelayedLoading(loading, 250)` prevents skeleton flash on fast responses (<250ms).

### 2. Pages Refactored (4)

| Page | Changes |
|---|---|
| `documents/page.tsx` | i18n all strings → `t()`, `<FilterBar>` with reset, `TableSkeleton`/`EmptyState`/`ErrorState`, translated doc type labels, `useCallback` deps fixed |
| `consents/page.tsx` | Same pattern: i18n, FilterBar, skeleton/error/empty, useCallback fix |
| `communications/page.tsx` | i18n all display strings, channel/type/status translated, FilterBar reset, skeleton/error/empty |
| `campaigns/page.tsx` | Added search filter + FilterBar (was filterless), i18n, skeleton/error/empty, useCallback fix |

**Filter reset:** All filterable pages now reset `page → 1` on any filter change. "Reset filters" button appears when any filter is active.

**AND logic:** All filters apply conjunctively (search AND type AND channel AND status) — this was already correct and is now verified and documented.

### 3. Dialogs i18n (4)

| Dialog | Changes |
|---|---|
| `documents/upload-document-dialog` | All strings via `t()`, 7 document type labels translated |
| `consents/add-consent-dialog` | 9 consent type labels translated, all labels/toasts via `t()` |
| `communications/add-communication-dialog` | Channel/type/status option labels translated, character counter template i18n |
| `communications/add-campaign-dialog` | Campaign type/trigger labels translated |

### 4. DataPagination i18n

`src/components/ui/data-pagination.tsx` now uses `useLocale()` + `itemCountLabel()` (new pure helper in `src/lib/pagination.ts`). Labels: `pagination_item`/`pagination_items`, `pagination_prev`/`pagination_next`, `pagination_pageOf`.

### 5. Dictionaries — New Keys

~95 new keys added to both `en.ts` and `ar.ts`:
- **Common (10):** `common_export`, `common_view`, `common_patient`, `common_selectPatient`, `common_patientRequired`, `common_noFile`, `common_retry`, `common_resetFilters`, `perm_deniedTitle`, `perm_deniedDesc`
- **Pagination (5):** `pagination_item`, `pagination_items`, `pagination_prev`, `pagination_next`, `pagination_pageOf`
- **Campaign options (7):** `camp_create`, `camp_drip`, `camp_broadcast`, `camp_afterVisit`, `camp_chronicCare`, `camp_manual`
- **Consent types (9):** `consentType_treatment` through `consentType_other`
- **Document types (7):** `docType_imaging` through `docType_other`
- **Communication (13):** channel/type/status option labels

### 6. Code Quality Fixes

| Fix | File |
|---|---|
| Removed unused `appointmentTypePool` declaration | `prisma/seed.js:2078` |
| Removed stray debug `console.log` | `src/components/billing/payment-dialog.tsx:113` |
| Migrated 6 `console.log`/`console.warn` → `logServerError` | `src/app/api/webhooks/stripe/route.ts` |

**Lint:** 0 errors, 9 warnings (all pre-existing `react-hooks/exhaustive-deps` in untouched files). Reduced from 11→9 by fixing `useCallback` deps in documents + campaigns pages.

### 7. Tests Added

| Test file | Coverage |
|---|---|
| `tests/unit/i18n-parity.test.ts` | Verifies every key in `en` exists in `ar` and vice versa; spot-checks all new key groups |
| `tests/unit/permissions-access.test.ts` | Validates `ROLE_MODULE_ACCESS`: Owner = all modules, every role is subset, all modules accessible, dashboard + help for all |
| `tests/unit/pagination.test.ts` | Extended with `itemCountLabel` tests: singular/plural, Arabic, NaN, negative, fractional |

---

## Verification Results

```
Typecheck:  ✅ pass (after removing stale .next/dev/types)
Lint:       ✅ 0 errors, 9 pre-existing warnings
Tests:      ✅ 30 files, 147 tests, 0 failures
Build:      ✅ success
```

---

## Remaining Technical Debt

| Item | Severity | Notes |
|---|---|---|
| `react-hooks/exhaustive-deps` warnings (9) | Low | In untouched files; fixing requires `useCallback` refactor with stable deps verification |
| `.next/dev/types` stale artifact | Low | Must delete before `typecheck`; recurs after `next dev` due to `ACTIVE_APPOINTMENT_STATUSES` export in `src/app/api/appointments/route.ts:454` |
| Dialog `fetchPatients` exhaustive-deps warnings (3) | Low | Pre-existing; `fetchPatients` defined inline in useEffect — fix requires `useCallback` + loading guard |

---

## Human-Decision Items

Decisions requiring stakeholder input before proceeding:

1. **Telehealth integration** — vendor choice (Twilio, Daily.co, custom WebRTC)? Affects architecture significantly.

2. **E-prescribe integration** — Surescripts (US) vs regional vendor? Regulatory requirements?

3. **Insurance eligibility verification** — clearinghouse vendor (Availity, Trizetto)?

4. **Online patient self-scheduling** — requires appointment availability engine + booking rules. Design decision: in-app only or public booking page?

5. **Language switching UX** — current: full page reload via cookie + `router.refresh()`. Options:
   - (A) Keep reload (simpler, current behavior)
   - (B) Client-side dictionary swap (no reload, larger bundle — both dictionaries shipped)
   - (C) Dynamic import dictionary on switch (network roundtrip, but small payload)
   Recommendation: (B) for SPA feel; dictionaries are ~50KB total gzipped.

6. **Component library scope** — refactor all 14 dashboard pages to shared `TableSkeleton`/`FilterBar`/`EmptyState`? Or only the 4 worst (done)?

7. **E2E test framework** — Playwright vs Cypress? React Testing Library for component tests?

8. **Design tokens** — Tailwind v4 CSS-first approach is working. Proceed with token audit across all pages, or leave as-is?

9. **WhatsApp integration** — currently communications are queued to `/api/communications`. Is WhatsApp Business API or a third-party (Twilio, MessageBird) preferred?

10. **No-show policy** — Zocdoc charges patients for late cancellations. Does the clinic want a no-show fee system?

---

## Files Modified

```
NEW:  src/components/ui/loading.tsx
NEW:  src/components/ui/filter-bar.tsx
NEW:  tests/unit/i18n-parity.test.ts
NEW:  tests/unit/permissions-access.test.ts
NEW:  CRM_GAP_ANALYSIS.md
NEW:  PROJECT_AUDIT_REPORT.md (this file)

EDIT: src/components/ui/data-pagination.tsx          (i18n)
EDIT: src/components/ui/permission-denied.tsx         (locale-aware defaults)
EDIT: src/lib/pagination.ts                           (added itemCountLabel)
EDIT: src/lib/i18n/dictionaries/en.ts                 (~95 new keys)
EDIT: src/lib/i18n/dictionaries/ar.ts                 (~95 new keys)
EDIT: src/app/(dashboard)/documents/page.tsx          (i18n, FilterBar, loader/error/empty)
EDIT: src/app/(dashboard)/consents/page.tsx           (i18n, FilterBar, loader/error/empty)
EDIT: src/app/(dashboard)/communications/page.tsx     (i18n, FilterBar, loader/error/empty)
EDIT: src/app/(dashboard)/campaigns/page.tsx          (i18n, FilterBar, loader/error/empty)
EDIT: src/components/documents/upload-document-dialog.tsx   (i18n)
EDIT: src/components/consents/add-consent-dialog.tsx        (i18n)
EDIT: src/components/communications/add-communication-dialog.tsx (i18n)
EDIT: src/components/communications/add-campaign-dialog.tsx (i18n)
EDIT: src/components/billing/payment-dialog.tsx       (remove console.log)
EDIT: src/app/api/webhooks/stripe/route.ts            (console.log → logServerError)
EDIT: prisma/seed.js                                  (remove unused appointmentTypePool)
EDIT: tests/unit/pagination.test.ts                   (added itemCountLabel tests)
```
