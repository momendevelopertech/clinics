# Hardcoded Values Audit & Audit Remediation Log

This document records all hardcoded strings, static fallbacks, and fixed user/role identity values identified across the codebase prior to refactoring.

---

## 1. Identified Hardcoded Values

### A. Dashboard Shell Header User Identity
- **File**: [dashboard-with-collapsible-sidebar.tsx](file:///f:/clinic/OpenHealthCRM/src/components/ui/dashboard-with-collapsible-sidebar.tsx#L846)
- **Found Value**: `{t("shell_accountStaff")}`
- **Issue**: Rendered `"مشرف الطبيب"` (ar) / `"Admin Doctor"` (en) for all logged-in users regardless of their actual user name or assigned role in the tenant.
- **Remediation**: Replaced with dynamic user context component (`UserContextHeader`) consuming NextAuth session `user.name` and localized role label (`displayRoleName(role)`).

### B. Navigation & Header Default Organization Name
- **File**: [dashboard-with-collapsible-sidebar.tsx](file:///f:/clinic/OpenHealthCRM/src/components/ui/dashboard-with-collapsible-sidebar.tsx#L339)
- **Found Value**: `{orgName ?? t("shell_defaultOrgName")}`
- **Issue**: Fallback displayed generic `"العيادة"` when `orgName` server prop was missing or unpopulated in client state.
- **Remediation**: Passed `orgName` explicitly from session/Prisma organization query in `DashboardLayout`.

---

## 2. Acceptance Criteria Checklist
- [x] Full-text search for legacy static role string `"مشرف الطبيب"` / `"Admin Doctor"` in shell header.
- [x] Header dynamically renders logged-in user's full name and localized assigned role badge.
