---
name: rbac-permissions
description: Use whenever dealing with roles, permissions, user authorization, staff role assignment, owner/admin access, permission matrices, or tenant-isolation checks in OpenHealthCRM. Lists the exact role strings, the guard functions, the module/action model, and security rules. Trigger on "role", "permission", "rbac", "authorization", "owner", "access", "403", "tenant isolation", "super admin".
---

# RBAC & Permissions — OpenHealthCRM

## Role strings (exact)
RBAC `Role.name` (DB): `Super Admin`, `Owner`, `Doctor`, `Care Coordinator`, `Nurse`, `Biller`, `Pharmacist` (+ `Patient` in the auth portal, not RBAC). Display label: `Care Coordinator` shows as "Receptionist" (see `src/lib/role-labels.ts`).
Denormalized `User.role`: `superAdmin`, `owner`, `doctor`, `receptionist`, `biller`, `nurse`, `pharmacist`.

## Identity layers (all three must be consistent)
1. `User.role` denormalized string.
2. `UserRole` → `Role.name` membership.
3. `RolePermission` rows: `{ action: "<module>:<action>", resource: "<module>" }`.
`hasPermission()` short-circuits TRUE for `Super Admin`.

## Guard hierarchy
- `requireSuperAdmin()` — session roles OR `user.role==="superAdmin"` + active (both required). Platform-only.
- `requireOwner({ json: true })` — clinic owner + super admin. Settings/staff/branches/rooms/catalogs/plan routes.
- `requireModulePermission(orgId, module, action?)` — module gate with `ROLE_MODULE_ACCESS` legacy fallback; Owner/superAdmin pass.
- `requireAnyPermission(orgId, [{ action, resource }])` — fine-grained RBAC.
- Client: `usePermissionState().guardedFetch()` + `<PermissionDenied>`. UI hiding is NEVER a security boundary — server guards are.

## Module inventory (`permissions.ts` `CLINIC_MODULES`)
dashboard, patients, appointments, queue, encounters, analytics, consents, audit, labs, tasks, documents, reports, availability, catalogs, communications, locations, waitlist, billing, payments, inventory, automation, campaigns, settings, plan, help.

## Security rules (from the audit)
1. Never add a route without `getOrgId() + assertOrgScope(orgId)` + a permission/module/owner guard. The platform has **no active middleware** (`src/proxy.ts` is dead code — not registered); every handler must self-guard.
2. **Never let a tenant escalate to Super Admin**: `UserRole` assignment must never allow creating an `Owner` for another org, nor the `Super Admin` role. `requireSuperAdmin` double-checks `user.role === "superAdmin"` to neutralize RBAC tampering.
3. **Staff enumeration** was an open gap: `GET /api/staff` and `/api/staff/roles` must not be readable by arbitrary roles — they are gated (module `settings`, owner-only) and list endpoints must scope `organizationId`.
4. Tenant isolation: every cross-entity query scopes through `{ organizationId }` (or nested relation filter). Ownership checks return 404. Never accept an `orgId` from the client body — derive it from session.
5. `emailVerified` and org `status` gating exist at login; do not weaken them.
6. Role/matrix editing (super admin or owner) writes `RolePermission` rows only within the target org's `Role` records.

## Role ↔ module default matrix
Owner: all. Doctor: patients,appointments,queue,encounters,analytics,consents,audit,labs,tasks,documents,reports,availability,catalogs,help. Care Coordinator: patients,appointments,queue,consents,tasks,documents,communications,locations,waitlist,help. Nurse: patients,appointments,encounters,analytics,consents,labs,inventory,tasks,documents,reports,availability,catalogs,help. Biller: patients,appointments,analytics,audit,billing,payments,tasks,reports,help. Pharmacist: patients,appointments,labs,inventory,tasks,catalogs,help.