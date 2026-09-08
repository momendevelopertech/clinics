# Role Capability Guide — OpenHealthCRM

**Version:** 1.0 (2026-09-08) — matches the seeded data and code at commit `e5c24cf`.
**Scope:** What every role can view, create, or modify in the staff application, and
**where** that is enforced (sidebar UI, server API guards, or platform checks).
**Sources:** `prisma/seed.js` (role/permission definitions), `src/lib/roles.ts`,
`src/lib/auth.ts` (`hasPermission`), `src/lib/authorization.ts`
(`requireAnyPermission`), `src/components/ui/dashboard-with-collapsible-sidebar.tsx`,
`src/app/api/signup/route.ts`.

---

## 1. How access control works

Access is decided by **two layers that must agree**:

1. **RBAC (authoritative).** Every staff user has one or more `UserRole → Role`
   assignments. Each `Role` holds a flat set of `RolePermission` rows
   (`action`, `resource`). The session exposes the RBAC **role names** as
   `session.user.roles` (`src/auth.ts` `authenticateUser`).
   - `hasPermission(userId, orgId, action, resource)` (`src/lib/auth.ts`) checks
     the user's roles for a matching `action` and grants `resource:null` wildcards.
   - **Super Admin short-circuit:** a role literally named `"Super Admin"` bypasses
     every permission check and is allowed to do anything.
2. **Org scope.** Every org-scoped API resolves the org from the session
   (`getOrgId`/`requireOrgContext`) and asserts it before any permission decision,
   so staff can never read another tenant's data even with a valid permission.

**Where each layer is enforced:**

| Surface | Mechanism | Notes |
|---|---|---|
| Sidebar navigation | Client-side `canAccess(roles[])` | Cosmetic only — never a security boundary. `Owner` and `Super Admin` always pass. An item with **no** `roles` array (Dashboard, Automation, Plan, Catalogs, Help) is visible to every role. |
| API reads/writes | `requireAnyPermission(orgId, [...])` → 403 on miss | Applied across patients, appointments, encounters, billing, payments, labs, lab-orders, clinical-orders, procedure-orders, vitals/stream, inventory, tasks, documents, consents, communications, campaigns, waitlist, settings, queue, branches, rooms, reports, analytics, prescriptions, notifications, audit. |
| Page-level | `/super` uses `requireSuperAdmin`; `/plan` flags `isOwner` via `requireOwner` (display only; does not block the page) | No other page blocks by role server-side — URL access to a page is possible, but its data APIs will 403 without the right permission. |
| Payment/insurance writes | `billing:write` etc. | Same guard path as above. |

---

## 2. Permission matrix (authoritative)

`✓` = granted in the seeded `RolePermission` set (or by Super Admin short-circuit).
`—` = not granted (the API will return 403 on an action requiring it).

Rows are `resource:action`. Column "Receptionist*" is the **Care Coordinator** RBAC
role that the receptionist demo account uses — see §5. “Owner” here is the RBAC
**Owner** role (12 perms), distinct from the GitHub-style super-owner.

| Resource / action | Super Admin | Owner | Doctor | Nurse | Care Coordinator (Receptionist\*) | Biller | Pharmacist |
|---|---|---|---|---|---|---|---|
| patients:read | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| patients:write | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| appointments:read | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| appointments:write | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| encounters:read | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| encounters:write | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| inventory:read | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| inventory:write | ✓ | ✓ | ✓ | — | ✓ | — | ✓ |
| billing:read | ✓ | ✓ | ✓ | — | ✓ | ✓ | — |
| billing:write | ✓ | ✓ | ✓ | — | ✓ | ✓ | — |
| lab:read | ✓ | — | ✓ | ✓ | ✓ | — | ✓ |
| lab:write | ✓ | — | ✓ | — | ✓ | — | — |
| pharmacy:read | ✓ | — | ✓ | ✓ | ✓ | — | ✓ |
| pharmacy:write | ✓ | — | ✓ | — | ✓ | — | ✓ |
| staff:read | ✓ | ✓ | — | — | — | — | — |
| staff:write | ✓ | ✓ | — | — | — | — | — |

Key details:
- **Super Admin** (`superadmin@acmeclinic.com`, platform org): implicit `✓` for
  everything via the short-circuit, plus `requireSuperAdmin` (needs the
  denormalized flag too) for `/super` + `/api/super/*`.
- **Doctor == Care Coordinator == Receptionist\*** on permissions: all three are
  seeded with the same 14-permission clinical stack (`prisma/seed.js`
  `allPermissions` / `CLINICAL_ROLE_PERMISSIONS` in the signup route).
- **Owner cannot see Lab or Pharmacy** (`lab:read/write`, `pharmacy:read/write`
  are absent from `ownerPermissions`) but owns `staff:read/write`.
- **Nurse** reads inventory/lab/pharmacy but writes **only** clinical records;
  no billing read.
- **Pharmacist** owns inventory+pharmacy writes, read-only patients/appointments/lab.

---

## 3. Sidebar visibility per role

From `src/components/ui/dashboard-with-collapsible-sidebar.tsx`. Items without a
role list show for everyone; `Owner`/`Super Admin` always see everything.

| Nav item | Owner / Super Admin | Doctor | Nurse | Receptionist\* | Biller | Pharmacist | Care Coordinator |
|---|---|---|---|---|---|---|---|
| Dashboard, Automation, Plan, Catalogs, Help | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Patients | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Appointments | ✓ | ✓ | ✓ | ✓ | — | — | ✓ |
| Queue | ✓ | ✓ | ✓ | ✓ | — | — | ✓ |
| Encounters | ✓ | ✓ | ✓ | — | — | — | ✓ |
| Analytics | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| Consents | ✓ | ✓ | ✓ | ✓ | — | — | ✓ |
| Audit | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| Billing | ✓ | ✓ | — | — | ✓ | — | ✓ |
| Payments | ✓ | — | — | — | ✓ | — | — |
| Labs | ✓ | ✓ | ✓ | — | — | ✓ | ✓ |
| Inventory | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ |
| Tasks | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Documents | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Communications | ✓ | ✓ | ✓ | ✓ | — | — | ✓ |
| Campaigns | ✓ | ✓ | ✓ | ✓ | — | — | ✓ |
| Reports | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| Availability | ✓ | ✓ | ✓ | — | — | — | — |
| Locations | ✓ | ✓ | ✓ | ✓ | — | — | ✓ |
| Settings | ✓ | ✓ | ✓ | ✓ | — | — | ✓ |
| Waitlist | ✓ | ✓ | ✓ | ✓ | — | — | ✓ |
| Super Admin console | only `isSuperAdmin` prop (server `requireSuperAdmin`) | | | | | | |

Sidebar-vs-permission mismatches to be aware of (cosmetic; the server is the
authority):
- **Biller** sees Patients/Appointments/Analytics/Audit/Reports/Documents/Tasks but
  has no `write` permissions for those modules — reads only.
- **Nurse** sees Billing? No — Billing row above shows Nurse `—`. Nurse sees
  Analytics/Audit/Reports (read-only aggregates) but no Billing or Payments.
- **Pharmacist** sees Labs, Inventory, Documents, Tasks, Patients (read).

---

## 4. Server-side enforcement map

Read endpoints require the listed `read` permission; write endpoints require the
`write` permission. Representative coverage (not exhaustive — every org-scoped
route under `src/app/api` runs `requireAnyPermission`):

| Module | Required permission (read / write) |
|---|---|
| `/api/patients` | `patients:read` / `patients:write` |
| `/api/appointments` (+ recurrence) | `appointments:read` / `appointments:write` |
| `/api/encounters` (+ `/[id]` + notes) | `encounters:read` / `encounters:write` |
| `/api/billing/invoices`, `/api/payments` | `billing:read` / `billing:write` |
| `/api/labs`, `/api/lab-orders` | `lab:read`(or `encounters:read`) / `encounters:write`+`patients:write` |
| `/api/clinical-orders`, `/api/procedure-orders`, `/api/prescriptions` | `encounters:write`+`patients:write` |
| `/api/vitals`, `/api/vitals/stream` | `patients:read`+`encounters:read` / `encounters:write` |
| `/api/inventory` (+ `/[id]/transaction`) | `inventory:read` / `inventory:write` |
| `/api/documents` | `patients:read` / `patients:write` |
| `/api/consents` | `encounters:read`+`patients:write` / `patients:write` |
| `/api/communications`, `/api/communications/campaigns` | `patients:write`+`appointments:write` |
| `/api/tasks` | `patients:read`+`appointments:read` / `patients:write`+`appointments:write` |
| `/api/waitlist` (+ `/[id]`) | `appointments:write` / `patients:write`+`appointments:write` |
| `/api/queue`, `/api/branches`, `/api/rooms` | `appointments:write` |
| `/api/settings`, `/api/notifications` | `staff:read`+`patients:write`+… / `staff:write` |
| `/api/analytics/dashboard`, `/api/reports/monthly` | `billing:read`+`encounters:read` |
| `/api/audit` | any of `patients:read` / `encounters:read` / `billing:read` |

Hence a Pharmacist (7 perms) can open the Labs page, read lab results, and run
inventory + pharmacy; attempting `patients:write` (e.g. editing a patient) returns
HTTP 403. A Biller can read patients/appointments and write billing, but creating
an appointment (`appointments:write`) returns 403 even though the sidebar shows the
Appointments item.

---

## 5. Role capability summaries

### Super Admin (platform) — `superadmin@acmeclinic.com`
- Everything, everywhere, in the **platform org** (`إدارة المنصة`).
- `hasPermission` short-circuits to `true`; `/super` console + `/api/super/*`
  additionally demand `User.role === "superAdmin"` (prevents tenants self-granting).
- Sidebar shows the extra **Super Admin** item; can approve/change org status,
  plan, and upgrade requests.

### Owner — `owner@acmeclinic.com` (RBAC "Owner", 12 perms)
- Full clinical ops (patients, appointments, encounters), inventory, and billing,
  **plus staff management** (`staff:read`/`staff:write` → Settings staff/roles).
- **Cannot** access Lab or Pharmacy data (`lab:*`, `pharmacy:*` missing).
- `requireOwner()` gates upgrade actions on `/plan`.

### Doctor — `admin@acmeclinic.com` (14 perms)
- Full read/write over patients, appointments, encounters, inventory, billing,
  labs, and pharmacy (itemized prescriptions, lab orders, results review).
- No staff management.

### Doctor / Pediatrician (2nd provider) — `dr.fatma@acmeclinic.com`
- Same 14 perms and clinical access as Doctor; seeded as the pediatric specialist
  (branch 2, "طب الأطفال") and used as the second provider on child appointments.

### Nurse — `nurse@acmeclinic.com` (9 perms)
- Read/write patients, appointments, encounters (vitals, SOAP notes, check-in).
- **Read-only** inventory, lab results, and pharmacy (dispense view) — cannot
  adjust stock, order labs, or change billing.

### Care Coordinator — `ops@acmeclinic.com` (14 perms)
- Full clinical stack identical to Doctor (reception-front + coordination).
- Demo `ops@` account is the scheduling/operations persona.

### Receptionist (via "Care Coordinator" role) — `receptionist@acmeclinic.com`
- Sidebar renders under the legacy `Receptionist` name (supported), but the
  account is assigned the **Care Coordinator** RBAC role (14 perms) in the seed —
  i.e. the same read/write clinical stack as Doctor/CC.
- **Naming drift note:** `User.role` carries `"receptionist"` (denormalized);
  the RBAC role name is `"Care Coordinator"`. Both `hasRoleName("Care Coordinator")`
  and sidebar legacy `Receptionist` matching are honored.

### Biller — `billing@acmeclinic.com` (4 perms)
- `patients:read`, `appointments:read`, `billing:read`, `billing:write`.
- Payments, invoices, outstanding/collected; **read-only** across every other
  module it can see (Patients, Appointments, Analytics, Audit, Reports, Documents,
  Tasks).

### Pharmacist — `pharmacist@acmeclinic.com` (7 perms)
- `patients:read`, `appointments:read`, `inventory:*`, `pharmacy:*`, `lab:read`.
- Full stock + dispensing control; read-only lab/patients/appointments; no
  clinical or billing writes.

---

## 6. Demo accounts quick reference

All demo passwords are `admin123`; the login page lists every account with a
fast-login button.

| Account | `User.role` | RBAC role | Quick capability |
|---|---|---|---|
| `superadmin@acmeclinic.com` | `superAdmin` | Super Admin | Everything + `/super` console |
| `owner@acmeclinic.com` | `owner` | Owner | Clinical full + inventory/billing + staff mgmt |
| `admin@acmeclinic.com` | `doctor` | Doctor | Clinical full (14 perms) |
| `dr.fatma@acmeclinic.com` | `doctor` | Doctor | Clinical full; pediatric provider |
| `nurse@acmeclinic.com` | `nurse` | Nurse | Clinical r/w; read-only stock/lab/pharmacy |
| `ops@acmeclinic.com` | `receptionist` | Care Coordinator | Clinical full (14 perms) |
| `receptionist@acmeclinic.com` | `receptionist` | Care Coordinator | Clinical full (14 perms) |
| `billing@acmeclinic.com` | `biller` | Biller | Billing r/w; read elsewhere |
| `pharmacist@acmeclinic.com` | `pharmacist` | Pharmacist | Inventory + pharmacy r/w; read-only patients/lab |

---

## 7. Known gaps & intentional deviations

1. **Sidebar is cosmetic.** It is role-driven but client-side; enforcement lives in
   the API layer. Navigating directly to a page works, but data calls 403 without
   the right permission.
2. **Read-only realms for Biller/Pharmacist/Nurse**: the sidebar shows some read
   surfaces (Analytics/Audit/Reports to Biller, Labs to Pharmacist, etc.) yet the
   matching write actions are not granted — by design, but worth a UI “read-only”
   hint in future.
3. **Owner vs Lab/Pharmacy**: an Owner cannot open Lab or Pharmacy data until
   `ownerPermissions` gains `lab:*`/`pharmacy:*`; deliberate today (owner focuses on
   ops + staff). Revisit when the Settings role editor becomes self-serve.
4. **Receptionist is “Care Coordinator” under the hood** — historical naming drift
   documented in `SYSTEM_SIDEBAR_AUDIT.md` §3/§5.
5. **No dedicated Patient RBAC role** — the patient portal is a separate
   `PatientSession` token path, not a `User` role.