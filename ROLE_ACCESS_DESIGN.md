# Role Hierarchy & Access Architecture — Design & Analysis

**Document status:** Draft v1 (design phase — no code changes)
**Date:** 2026-09-08
**Scope:** Role hierarchy, identity model, authorization model, access control enforcement, multi-tenant isolation, onboarding/approval, role-specific UI (sidebar/dashboard), and an implementation roadmap for OpenHealthCRM.
**This document changes nothing.** It describes the system as it stands (verified against source, 2026-09-08) and proposes the target architecture.
**Baseline documents:** `SYSTEM_SIDEBAR_AUDIT.md`, `ROLE_CAPABILITY_GUIDE.md`.

---

## Legend

Every section verdict carries one or more of these labels:

| Label | Meaning |
|---|---|
| **CURRENT** | Behavior verified in the codebase today. |
| **RECOMMENDED** | Proposed target design for this phase. |
| **GAP** | Current behavior is functionally incomplete for the recommended design. |
| **SECURITY RISK** | Current behavior is unsafe if left unchanged. |
| **IMPLEMENTATION NEEDED** | Concrete follow-up work, scoped for the roadmap. |

## Methodology

The findings below were re-verified from source (not assumed from the audit):

- `prisma/schema.prisma` (all models), `prisma/seed.js` (roles, permissions, users, branches, org data, bulk demo data).
- `src/auth.ts`, `src/lib/auth.ts`, `src/lib/roles.ts`, `src/lib/org.ts`, `src/lib/authorization.ts`, `src/lib/plans.ts`, `src/proxy.ts`.
- `src/app/api/signup/route.ts`, `src/app/api/staff/route.ts`, `src/app/api/staff/roles/route.ts`, `src/app/api/settings/route.ts`, `src/app/api/org/request-upgrade/route.ts`.
- `src/app/api/super/orgs/**` (list, status, plan, upgrade) + `src/app/super/page.tsx` + `src/components/super/super-console.tsx`.
- `src/app/(dashboard)/layout.tsx`, `dashboard/page.tsx`, `plan/page.tsx`, `settings/page.tsx`, `src/components/settings/staff-profiles.tsx`, `src/components/ui/dashboard-with-collapsible-sidebar.tsx`.
- API guard requirements across ~20 route handlers via grep + targeted reads.

---

# Section 1 — What is the CURRENT role hierarchy?

**CURRENT** — There are effectively two isolated planes of access:

1. **Platform plane** (one global instance identity): RBAC role named **"Super Admin"**, bound to the platform organization (seed: "إدارة المنصة"). It is granted to exactly one user (`User.role = "superAdmin"`) with super-admin privileges system-wide. `hasPermission()` short-circuits to `true` for any user holding the RBAC role named `"Super Admin"`.
2. **Clinic plane** (per organization): RBAC roles **Owner, Doctor, Care Coordinator, Nurse, Biller, Pharmacist** — seeded for the demo clinic; only **Owner, Doctor, Care Coordinator** are auto-created on self-serve signup.
3. **Patient plane** (separate identity domain): patients authenticate via `PatientSession` (signed HTTP-only cookie) and do NOT participate in staff RBAC at all.

| # | Role name | Where | Permission surface | Notes |
|---|---|---|---|---|
| 1 | Super Admin | Platform org | Bypass (`hasPermission` short-circuit) | Also requires `User.role = "superAdmin"` |
| 2 | Owner | Clinic org | 12 perms (clinical R/W + inventory R/W + billing R/W + staff R/W) | No lab / pharmacy permissions |
| 3 | Doctor | Clinic org | 14 perms (`allPermissions`: incl. lab/pharmacy R/W) | Identical to Care Coordinator |
| 4 | Care Coordinator | Clinic org | 14 perms (same as Doctor) | Canonical "back office / receptionist" role |
| 5 | Nurse | Clinic org | 9 perms (patients, appointments, encounters R/W + inventory/lab/pharmacy read) | Read-only on inventory/lab/pharmacy |
| 6 | Biller | Clinic org | 4 perms (patients:read, appointments:read, billing:read, billing:write) | Narrow, focused scope |
| 7 | Pharmacist | Clinic org | 7 perms (patients:read, appointments:read, inventory R/W, pharmacy R/W, lab:read) | Narrow, focused scope |
| 8 | Patient | — (portal) | `PatientSession` identity, no RolePermission rows | Separate auth stack |

**Verification basis:** `src/lib/auth.ts` (`hasPermission`), `src/lib/roles.ts` (`isSuperAdmin`, `isOwner`, `requireOwner`), `prisma/seed.js` role/permission seeds, `src/app/api/signup/route.ts` (`OWNER_PERMISSIONS`, `CLINICAL_ROLE_PERMISSIONS`, `createDefaultRoles`).

---

# Section 2 — How is identity represented at runtime?

**CURRENT**

- `User.role` is a **classifier string** (`superAdmin | owner | doctor | receptionist | biller | nurse | pharmacist`). It is used for display and some coarse gates (`isOwner`).
- `UserRole` (join) → `Role` → `RolePermission` is the **authoritative RBAC link**. Role *name* is what flows into the session.
- `session.user.roles = [role names]` (strings) is issued by NextAuth JWT in `src/auth.ts` callbacks.
- Permission checks run **server-side per request** via `requireAnyPermission(orgId, perms)` → `hasPermission(userId, orgId, perm)`.

**GAP — duplicate identity sources.** A user's authority can be read from three places that can disagree: `User.role`, RBAC role names, and explicit permission rows. Example: a user with `User.role = "receptionist"` who holds the RBAC `"Care Coordinator"` role — both must be kept in sync, and nothing enforces that today.

**GAP — user-role cardinality.** `UserRole` is many-to-many and `staff/roles` POST uses `upsert` on `userId_roleId`, so a single user can hold **multiple** roles; `settings` surfaces only `userRoles[0]` to the UI.

**SECURITY RISK — `requireOwner` is role-name based, not permission based.** `isOwner()` returns true when `User.role === "owner"` **or** the user holds an RBAC role named `"Owner"` or `"Super Admin"`. Because owners can assign roles (Section 17), identity sources can drift away from the original owner account.

**RECOMMENDED**

1. `User.role` becomes a **display-only classifier** derived from privileges, never checked in authorization paths (keep `requireOwner` only as a narrowly-scoped legacy gate).
2. Introduce `Scope` (Section 12) so role membership = (role, scope), not just role.
3. Normalize staff/role UI to enumerate **all** role memberships, not `[0]`.

---

# Section 3 — Super Admin: CURRENT authority model

**CURRENT** — Super Admin authority is **platform-wide and bypasses permission checks entirely**:

- Guard: `requireSuperAdmin()` requires **both** `User.role === "superAdmin"` **and** RBAC role name `"Super Admin"` (`src/lib/roles.ts`).
- Capabilities exercised today (all guarded by `requireSuperAdmin`):
  - `/api/super/orgs` GET — list every organization (unpaged), with usage counts.
  - `/api/super/orgs/:id/status` POST — set `pending | active | suspended`.
  - `/api/super/orgs/:id/plan` POST — force-set plan (`free | clinic | plus`).
  - `/api/super/orgs/:id/upgrade` POST — approve/decline an org's pending upgrade request.
- UI: dedicated `/super` route rendered by `SuperConsole` (custom header with logo + language switcher; **not** inside the clinic `DashboardWithCollapsibleSidebar` shell).

**GAP — Super Admin has no data-plane operations (by design) but also no isolation.** Because Super Admin is a platform-org user, it is a normal member of the platform org; there is no separate hard-but-cross-org audit surface for super-admin actions (all four routes do write `auditLog` rows with `organizationId = <target org>`, which is correct, but there is no dedicated platform audit view).

**SECURITY RISK — super-admin login uses the same credentials path as staff.** The `superadmin@acmeclinic.com` seed account uses the `admin123` password path; the platform account therefore shares the same brute-force surface as clinic accounts. Mitigated today by `src/proxy.ts` rate limiting (5/min per auth endpoint) — but worth a separate, stronger policy (Section 7, 24).

**VERDICT — adequate authority, needs hardening.** The dual `User.role` + RBAC check is a genuinely good control (two factors of role identification). Keep it. Do NOT add a second super-admin role.

**IMPLEMENTATION NEEDED**

- Add pagination + search to `/api/super/orgs` (today: `findMany` returns all orgs).
- Add a platform-scope audit read for super-admin actions.

---

# Section 4 — Should Super Admin have a dedicated dashboard/sidebar?

**CURRENT** — Super Admin effectively already has one: the `/super` page uses its own shell (`SuperConsole` with header + language switcher), distinct from the clinic sidebar. The clinic `DashboardWithCollapsibleSidebar` additionally appends a `Super Admin` nav item only when `isSuperAdmin` is true (i.e., the platform super admin can still see the clinic ORG sidebar for the platform org, plus the `/super` entry).

**RECOMMENDED** — Maintain a **fully separate platform console shell**, never nested inside clinic chrome:

- Platform route group `src/app/super/**` stays standalone (no `MedicalProvider`, no clinic sidebar).
- Add platform sections in the roadmap: Organization Lifecycle, Plan & Billing, Platform Health, System Wide Audit, Platform Staff, Support Actions (impersonation / suspend / reactivate).
- Clinic sidebar should **never** render for platform users; platform users should land on `/super` redirect.

**VERDICT — structure is right.** Keep a dedicated shell; extend its section coverage and add it to the roadmap (Section 28, P1).

---

# Section 5 — Owner authority: CURRENT scope and appropriateness

**CURRENT**

- Owner permission surface (12 perms): patients, appointments, encounters, inventory, billing — all R/W — plus `staff:read` and `staff:write`.
- Owner **cannot** touch lab or pharmacy directly (no `lab:*` / `pharmacy:*`).
- Owner is the only role that can: update org settings (`/api/settings` PATCH — `requireOwner`), manage staff operational profiles (`/api/staff` PATCH), assign roles (`/api/staff/roles` POST), and request plan upgrades (`/api/org/request-upgrade`).
- Ownership is **may-own-org-wide**: `isOwner()` is derived from role names + `User.role`, not from a `createdBy`/ownership record.

**GAP — no second-level management role.** There is no "Clinic Admin / Manager" between Owner and the clinician floor, so Owner is the single management path for staff, roles, settings, and plans. Single point of failure and supporter of privilege concentration.

**GAP — Owner cannot delegate.** Because there is no management role, any delegated administrative work (e.g., a clinic manager approving role changes) must be done by the Owner account itself.

**SECURITY RISK — owner self-service role assignment** (detailed in Section 17/18): because `staff/roles` POST grants **any org role except "Super Admin"** to **any org user**, the current owner may promote another user to the `"Owner"` role, creating multiple owners and eroding accountability.

**RECOMMENDED**

- Introduce **Clinic Admin** as a delegatable, non-owner management role (Section 6).
- Make staff/role management gate on `staff:write` **permission**, not the `Owner` role name, so a delegated admin (holding `staff:write`) can manage staff without org-owner escalation rights.
- Keep `org.plan`-level changes and org lifecycle strictly Owner (today already Owner → Super Admin approval).
- Consider a `ownerOf` marker (users.role = owner constrained to 1 or N) to bound how many owners exist (Section 18).

---

# Section 6 — Introduce Clinic Admin / Manager?

**GAP (missing today)** — N/A, reviewed below.

**RECOMMENDED — YES, introduce `Clinic Admin` (one management role).**

Rationale:

- Removes Owner-only operations from day-to-day operational management.
- Enables delegation of staff/profile management, settings, and patient-record administration without granting org ownership.
- Mirrors the persona split the sidebar already implies (System group) while keeping `Owner` as the accountable principal for billing/plan decisions.

Proposed `Clinic Admin` permission set (design target):

| Resource | Read | Write |
|---|---|---|
| patients | ✓ | ✓ |
| appointments | ✓ | ✓ |
| encounters | ✓ | ✓ |
| staff | ✓ | ✓ |
| inventory | ✓ | ✓ |
| billing | ✓ | — |
| lab | ✓ | — |
| pharmacy | ✓ | — |
| settings (org) | ✓ | ✓ |

**Clinic Admin explicitly does NOT get:** `org.plan` management (`/api/org/request-upgrade` stays Owner), org lifecycle, audit changes. Super Admin approval for plan stays as-is.

**Role-name compatibility:** seed the demo clinic with a `Clinic Admin` role; do not map it onto `Owner` — keep it as a separate Role row so permission lists stay explicit.

**IMPLEMENTATION NEEDED** — Roadmap P2 (role definition + seed) + P3 (migrations for scope, if adopted).

---

# Section 7 — Doctor scope analysis (14 permissions)

**CURRENT** — Doctor holds all 14 permissions, including `lab:write`, `pharmacy:write`, `inventory:write`, `billing:write`. This is intentionally "maximum clinical license" (`CLINICAL_ROLE_PERMISSIONS`), shared init-for-signup parity with Care Coordinator.

**GAP — excessive for least-privilege.** A clinician's day-to-day needs are: patients, appointments, encounters R/W; lab/pharmacy **read** (orders/results); inventory **read**; billing **read** (see charges). `inventory:write`, `pharmacy:write`, `lab:write`, and `billing:write` on the base Doctor role widen the blast radius of a compromised or careless clinician account.

**SECURITY RISK — write amplification via `clinical-orders`.** `clinical-orders` POST requires `encounters:write` + `patients:write` and validates `kind ∈ {diagnosis, followUp}` — good. But `lab-orders` POST requires `encounters:write` + `patients:write`, giving any Doctor the ability to order labs (product-correct) **and** Nurses are excluded from `lab:write` order creation (they read only) — the current model routes lab order creation through clinical write permission rather than a dedicated `lab:write`, which is acceptable for the MVP but defined more cleanly in the Recommendation.

**RECOMMENDED — split `Doctor` into a base scope + opt-in clinical writes:**

| Permission | Base Doctor (recommended) | Doctor + Lab Privelege (if separately defined) |
|---|---|---|
| patients/appointments/encounters R/W | ✓ | ✓ |
| lab:read / pharmacy:read / inventory:read / billing:read | ✓ | ✓ |
| lab:write / pharmacy:write | — | ✓ (opt-in) |
| inventory:write / billing:write | — | — |
| other custom roles | n/a | n/a |

Keep `Care Coordinator` aligned with Doctor **only if desired** (Section 8 disambiguates the two personae), and keep order-creation behavior intact (lab ordering stays available — implementer should condition the endpoint on `lab:write` OR `encounters:write` OR keep a dedicated ordering permission; **this is a compatibility decision for the roadmap, not a code change now**).

**VERDICT — reduce shortest-paths now.** Design the base Doctor as read-mostly on lab/pharmacy/inventory/billing, with explicit opt-in write roles for specialized clinical workflows.

---

# Section 8 — Care Coordinator vs Receptionist (naming decision)

**CURRENT** — two identifiers in the same persona:

- `User.role` classifier: `receptionist`
- RBAC role name: `Care Coordinator` (14 perms = same as Doctor)

Sidebar config matches **role names** (`Care Coordinator`, and in places `Receptionist`), so the two coexist and drift already produced inconsistencies noted in `SYSTEM_SIDEBAR_AUDIT.md`.

**RECOMMENDED — canonicalize `Care Coordinator`, treat `receptionist` as a legacy alias.**

- Rename the `User.role` classifier value to `care_coordinator` (displayed as "Care Coordinator") — keep a mapping/alias for any historical rows; do not keep the misnaming.
- Remove/replace `Receptionist` references in the sidebar config and capability guide with `Care Coordinator`.
- Decide the Care Coordinator scope explicitly: user-facing scheduling/front-desk + clinical coordination. Recommended scope = Doctor-base minus billing write, minus inventory write (approximately 10-12 perms), NOT automatically equal to Doctor.

**IMPLEMENTATION NEEDED** — Roadmap P1 (naming normalization): single source of truth for role display names; sidebar + capability guide regenerated from it.

---

# Section 9 — Biller and Pharmacist scope analysis

**CURRENT — Biller (4):**

- `patients:read`, `appointments:read`, `billing:read`, `billing:write`.
- Can read patient identity + see appointments + fully operate billing. Cannot see encounters/clinical data beyond what bill context surfaces.

**VERDICT — adequate, tight, keep.** The absence of `encounters:read` means Biller cannot browse SOAP notes (privacy-positive). Confirmed surfacing: Billing + Payments pages (`Payments` is Biller-only in sidebar). `Analytics` visibility for Biller is a UI-overreach (Section 22) — the *page* should be hidden, not the permission.

**CURRENT — Pharmacist (7):**

- `patients:read`, `appointments:read`, `inventory:read/write`, `pharmacy:read/write`, `lab:read`.
- Can dispense/manage pharmacy + adjust inventory, read lab results, no appointments write. Good isolation from scheduling and clinical notes.

**VERDICT — adequate, keep, minor refinement:** consider removing `lab:read` to a separate "view results" permission only if clinical-notes hiding is desired; today lab results read is coherent.

**GAP — Biller/Pharmacist lack a "self" patient-schedule view.** Appointments are readable, so schedule is fine. No change required.

**IMPLEMENTATION NEEDED** — none for Biller; optional `lab:read` split for Pharmacist (defer).

---

# Section 10 — Nurse scope analysis (9 permissions)

**CURRENT** — `patients:read/write`, `appointments:read/write`, `encounters:read/write`, `inventory:read`, `lab:read`, `pharmacy:read`.

**VERDICT — good clinical-workflow fit without billing/pharmacy writes.** Keep. Minor suggestion: Nurse should not hold `patients:write` by default if registration/intake is delegated to Care Coordinator; otherwise leave as-is.

**IMPLEMENTATION NEEDED** — none mandatory.

---

# Section 11 — Patient portal: separate domain or merged?

**CURRENT — completely separate.** Patients are **not** staff-RBAC principals:

- Auth: `POST /api/patient-auth/login` (email + MRN + password), issues `createPatientSession` → signed HTTP-only `patient_session` cookie; `/me` + `/logout` round out the flow. Public prefixes in `src/proxy.ts`.
- Portal pages under `/patient-portal` are public-but-session-gated, outside NextAuth entirely.
- `FeedbackSurvey`, appointment reminders, documents, communications already reference patient identity, so the portal is a consumer of org data, not a producer of org roles.

**RECOMMENDED — keep fully separate (explicit recommendation).**

- Do **not** route patient identities through `Role`/`RolePermission`.
- Model patient consent/portal capabilities as **per-patient capability flags** (e.g., canBookOnline, canViewRecords) in the patient record, not as roles.
- Keep `PatientSession` (tokens, expiry, device bind) separate from staff JWT.

**SECURITY RISK — concurrent auth surfaces.** Two independent cookie/session systems must not collide: the proxy already routes `/api/patient-*` and `/patient-*` into the public bucket. If anyone later imports doctor logic that assumes staff session — audit `patient-portal` server routes to enforce they only read `patient_session`.

**IMPLEMENTATION NEEDED** — document patient capability matrix (Section 28, P4) and add portal-server-route lint rule "no staff-session reads under /api/patient-portal".

---

# Section 12 — Role vs Permission vs Scope (three concepts)

**CURRENT — two concepts only.** `Role` (a named bundle) and `RolePermission` (action+resource rows). There is **no Scope concept**: all permissions are org-wide. Branch, room, and department exist as data (Branch has `staff`, `workingHours`, `rooms`), but no authorization is branch-scoped.

**GAP — org-wide-only permissions block branch-level delegation.**

- A multi-branch chain cannot give "nurse in Branch B" branch-B-only scheduler rights.
- `Appointment.providerId`, `branchId?`, `roomId?` exist; staff link to `branch`/`room`; but there is no `Scope` table or `RolePermission.scope` column.

**RECOMMENDED — three-layer model:**

1. **Scope** (new): an authorization boundary:
   - `platform` (Super Admin)
   - `org` (default for all current clinic roles)
   - `branch` (new; reference `OrganizationBranch`)
   - `self` (e.g., "Book an appointment" for patients) — optional, deferred
2. **Permission**: the existing `resource:action` pair, unchanged.
3. **Role**: now `(role, scope)` pairs stored via `ScopeRolePermission` or an added column — design target: `RoleScope` (roleId, scopeId, scopeType) joined to `RolePermission`.

**Migration note:** keep the existing `RolePermission` table working for `scopeType=org` rows; additive change only. The seed/guide's "known gaps" (`SYSTEM_SIDEBAR_AUDIT.md`) explicitly lists branch-scope as open — this document adopts it in the target model.

**SECURITY RISK (current, if unremediated for multi-branch):** every permitted user can access every branch's data because scope is always org. For single-clinic tenants this is fine; for future branches it is a data-isolation defect. Implement **before** any multi-branch rollout.

**IMPLEMENTATION NEEDED** — Roadmap P3 (schema: scope + role-scope; guard API extension) — highest-priority data-integrity item.

---

# Section 13 — Multi-tenancy and org isolation

**CURRENT (verified)**

- Every tenant owns its `Organization` row; **every major model carries `organizationId`** (users, patients, branches, appointments, encounters, tasks, communications, audit logs, roles, billing, inventory, campaigns, documents, waitlist, prescriptions, insurance claims, …).
- Sourced from the session (`requireOrgContext` → `session.user.organizationId`) and asserted via `assertOrgScope` where relevant.
- Query filtering is org-scoped in route handlers (verified on the audited routes: patients, appointments, encounters, billing, labs, lab-orders, clinical-orders, procedure-orders, documents, consents, communications, campaigns, tasks, waitlist, settings, notifications, inventory).
- Login gate: `authenticateUser` rejects users whose org.status ≠ "active"; layout redirects suspended orgs to `/suspended`.

**GAP — query-level isolation is convention, not structural.** In a few places (e.g., `prisma.user.findMany` scoped by `organizationId`) scoping is manual in each handler; there is no global Prisma middleware forcing `organizationId`. Risk of a future handler forgetting the filter.

**GAP — `/api/super/orgs` operates **across** orgs by design (fine), but platform Super Admin users live *inside* an org row (`platformOrgId`); the same `assertOrgScope` convention does not clearly distinguish platform vs clinic data flows.

**RECOMMENDED**

- Add a Prisma query-layer guard (middleware/extension) that injects `organizationId` on create/read/update for tenant models and refuses missing scope on rundown routes.
- Introduce a `platform` partition in code (super-admin routes must not go through tenant scoping).
- Keep the "status must be active" login + suspended layout redirect; add **notification on suspension side-effects** (kill active sessions/patient tokens) in roadmap (P5).

**IMPLEMENTATION NEEDED** — P3 + P5.

---

# Section 14 — Clinic onboarding & approval workflow

**CURRENT (verified)**

1. `POST /api/signup` — honeypot (`company`) + min-fill-time + email unicity; creates `Organization` with `status: "pending"`, `plan: "free"`, `timezone: UTC`, `currency: USD`, `onboardingSource: "self_serve"`, `settingsJson { appointmentDurationMins: 30 }`.
2. Creates owner user (`User.role = "owner"`, active, unverified email + 24h verify token) and `createDefaultRoles` → `Owner`, `Doctor`, `Care Coordinator`.
3. Emails verification link.
4. Org stays **pending** → `authenticateUser` blocks owner login until a **platform Super Admin** flips status to **active** in `/super`.
5. Payment/plan is entirely offline today (no Stripe adoption yet — `/api/webhooks/stripe` is public but unused).

**GAP — email verification is decoupled from org activation.** `authenticateUser` checks org status + `user.active`, **not** `emailVerified` (line 122). An unverified email can log in once an admin activates the org.

**GAP — org activation is manual and single-actor.** No SLA, no time-bound expiry of the pending state, no re-approval window.

**SECURITY RISK — static org approval.** A self-serve signup with no evidence of company ownership → an unauthenticated attacker can squat a clinic name/slug and freeze it pending forever, or a compromised sign-up path can stage tenants.

**RECOMMENDED**

- Gate login on `emailVerified` (owner must click link) **and** org `active` — two gates, not one.
- Add `pending` expiry: auto-archive pending orgs after N days; notify on email; allow re-signup.
- Add org-activation audit trail: approve/decline with actor + note (auditLog row already written — surface it in platform audit view, Section 3/24).
- Keep the disciplined order: signup → verify email → (super admin) activate org → first login → default roles present.

**IMPLEMENTATION NEEDED** — P1 (email gate), P5 (pending expiry + platform audit).

---

# Section 15 — Roles & permissions management UI

**CURRENT**

- UI exists only as: Settings → **Team** → staff list with a role **Select** per member (`StaffProfiles`).
- Assigning a role = `POST /api/staff/roles` (owner-only). Roles are looked up org-scoped, `Super Admin` excluded.
- **There is no UI to create, rename, or edit a role or its permissions.** Roles are seeded at signup and (for demo clinics) at seed.

**GAP — no permission editor, no custom roles, no scope assignment, no role-removal.** The permission model is effectively static per tenant.

**SECURITY RISK — UI lacks server-side "who may manage staff" granularity.** The *client* shows the role select to whoever can load the page (settings page + `/api/staff`); the server correctly gates the POST to `requireOwner`. But the GET `/api/staff` and GET `/api/staff/roles` require **no permission at all** (Section 17), so any staff member can enumerate the full team + roles even though their page would hide the select.

**RECOMMENDED**

- Add a **Roles builder** page (list roles, edit name, toggle permissions across the known resource matrix, set scope) restricted to `staff:write` holders (Owner, Super Admin, Clinic Admin).
- Extend `StaffProfiles` to multi-role assignment and role removal.
- Enforce permission checks on the GET endpoints too (Section 17).

**IMPLEMENTATION NEEDED** — P2 (Roles builder UI + endpoints; GET guards).

---

# Section 16 — Custom roles

**CURRENT** — not supported end-to-end. Data model allows arbitrary `Role` rows + `RolePermission` rows (Q: seed only), but no flow creates new ones post-signup.

**RECOMMENDED — support but scope carefully.**

- Phase 1: allow Owner/Admin to create **custom roles from the existing permission grid** (no new resources yet).
- Phase 2 (after branch scope, Section 12): allow scope-constrained clones (e.g., "Branch B Pharmacist").
- **Constraints to prevent privilege escalation:**
  - A role may never grant more than the **creator's own** permission set (can't clone a role you don't hold).
  - `RequireSuperAdmin` grant path: custom roles **cannot** include super-admin; role creation UI hides the `Super Admin` role and `staff/roles` POST continues to exclude it (already verified: `name: { not: "Super Admin" }`).
  - Plan limits: count custom roles against the tenant's plan where applicable.

**IMPLEMENTATION NEEDED** — P2/P3.

---

# Section 17 — Staff management authorization (esp. /api/staff)

**CURRENT (verified)**

| Endpoint | Guard | Verdict |
|---|---|---|
| `GET /api/staff` | `requireOrgContext` **only** — any logged-in member | **SECURITY RISK / GAP** |
| `PATCH /api/staff` (operational profile: branch, room, specialty, hours) | `requireOwner` | OK (owner-only), but role-by-name |
| `GET /api/staff/roles` | `requireOrgContext` only | **SECURITY RISK / GAP** |
| `POST /api/staff/roles` (assign role) | `requireOwner`; target user + role org-scoped; role ≠ Super Admin | OK, but owner-centric and no de-assignment |
| `GET /api/settings` | `requireAnyPermission(staff:read OR patients:write OR appointments:write OR encounters:write OR inventory:write)` | Broad but acceptable for settings display |
| `PATCH /api/settings` | `requireOwner` | OK |

**SECURITY RISK — staff enumeration (CURRENT).** Any authenticated staff member — including a Biller — can call `GET /api/staff` and read every colleague's name, email, role, specialty, license number, branch, and room. This is an information-disclosure defect.

**SECURITY RISK — owner-by-role-name.** Because POST is gated by `requireOwner` and `requireOwner` is name-based, **an Owner can assign the `"Owner"` role to any user**, creating additional owners with full management capability (see Section 18).

**RECOMMENDED**

- `GET /api/staff` and `GET /api/staff/roles` → require `staff:read`.
- `POST /api/staff/roles` and `PATCH /api/staff` → require `staff:write` **permission**, not the `Owner` role name (Owner, Super Admin, and Clinic Admin hold it).
- Add `DELETE /api/staff/roles` for role removal; add self-serve "leave role" guard (never allow removing your own last admin bit without password re-auth).
- Constrain Owner-role creation: only allow assigning `Owner` to a user when the `target` has definitely fewer than the assigner's own scopes (Section 18).

**IMPLEMENTATION NEEDED** — P1 (GET guards) + P2 (permission-based staff admin) + P4 (delete role endpoint).

---

# Section 18 — Owner escalation guard (SECURITY RISK)

**CURRENT** — the combination of:

1. `requireOwner()` name-based check,
2. `POST /api/staff/roles` grant-any-role-except-Super-Admin,
3. many-to-many `UserRole`,

…means a sole owner can promote any coworker to **Owner today**, with no approval. Duplicate owners are unmonitored (no alert), and there is no secondary control against a compromised owner account manufacturing staff with `staff:write`.

**Risk chain (concrete):** Compromised/Careless Owner → assigns `Owner` role to attacker/other → attacker now passes `requireOwner`, `isOwner`, gets plan-upgrade rights + staff admin.

**RECOMMENDED (defense in depth)**

1. **Single-Owner invariant by default:** software should not create a second `User.role = "owner"`; if a second `Owner` RBAC assignment is made, it must require two-factor confirmation (password + email or TOTP) and be logged as `staff_role_owner_escalation`.
2. **Deny self-demote-of-last-owner:** the last `owner` principal cannot have its owner role removed or its account deactivated without an escape-hatch flow (Super Admin override).
3. **Audit-driven alerting:** any `Owner`-role grant, `staff/roles` POST by role-name, and any `Role` mutation should emit an `auditLog` entry (already partially done) AND a platform/system notification for Super Admin review.
4. Consider `OwnerInvite` flow: the platform/repo-approved invite path is the only way to mint a second owner (deferred, Section 28).

**IMPLEMENTATION NEEDED** — P2 (escalation guards + alerts) — **gate** any multi-owner rollout on this.

---

# Section 19 — Plan/subscription × role interactions

**CURRENT (verified)**

- Plans: `free | clinic | plus` with limits for patients/staff/appointments (`src/lib/plans.ts`).
- Enforcement: `checkPlanLimit` on creation endpoints (patients, staff, appointments) server-side only.
- Upgrade request: `POST /api/org/request-upgrade` — **Owner only**; writes `upgradeRequestedPlan/At/Note`.
- Decision: `POST /api/super/orgs/:id/upgrade` — Super Admin approve/decline; clears the request fields.
- Plan page (`/plan`): **visible to every role**, shows usage vs limits; owner-only upgrade buttons (`isOwner`).

**GAP — non-owner visibility of plan page.** All members can see full org usage (patients/staff/appointments counts) on `/plan`. That is mildly sensitive; RECOMMENDED: keep visible for all (transparent usage) but hide all upgrade/plan-request controls and monetary details for non-owners.

**GAP — downgrade path.** `plan` route accepts `free | clinic | plus` freely; downgrading a clinic that exceeds free caps will hard-fail its next patient/staff/appt creation with a terse message. RECOMMENDED: measure current usage against the target plan before confirming a drop; warn in super console.

**RECOMMENDED**

- Keep enforcement as-is (server-side, deterministic). Add plan mismatch warnings + a hint to upgrade (not a hard 403) in UI.
- Owner-only: request upgrade, view billing; Super Admin-only: force-set plan, approve.
- Extend plan checks to **roles** when custom roles land (Section 16).

**IMPLEMENTATION NEEDED** — P5 (downgrade guard + owner-only UI details).

---

# Section 20 — Default roles at signup (GAP)

**CURRENT** — a self-serve tenant is born with **only 3 roles**: Owner, Doctor, Care Coordinator (each = existing permission rows). There is **no Nurse, Biller, Pharmacist** until manually assigned/created — and there is no UI to create them (Section 15). The seeded demo clinic has the full 6.

**GAP — feature misalignment.** The product's own sidebar/capability matrix assumes Nurse, Biller, Pharmacist exist; self-serve tenants start without them, and the roles builder doesn't exist yet to add them. Result: a fresh clinic cannot configure a Biller without an owner working around missing roles.

**RECOMMENDED**

- `createDefaultRoles` at signup should create the **full canonical set**: Owner, Clinic Admin (new), Doctor, Care Coordinator, Nurse, Biller, Pharmacist — each with its canonical permission list (single source of truth module shared with seed).
- Keep the platform-org Super Admin out of tenant role creation.

**IMPLEMENTATION NEEDED** — P2 (default-roles module + signup change).

---

# Section 21 — Sidebar architecture per role

**CURRENT (verified)** — `dashboard-with-collapsible-sidebar` derives entries from a `SOFTWARE_TEAM`… (config) structure where each nav group/item carries an explicit `roles: string[]` (role names). Access = role-name set membership + `isSuperAdmin` (adds the `Super Admin` console item) + Owner/SuperAdmin always-pass. Key effective visibility (verified):

| Nav item | Visible roles (reported) | API guard behind it |
|---|---|---|
| Dashboard | Doctor, Nurse, Receptionist, Biller, Care Coordinator | patients:read + appointments:read (all 6 have these) ✓ |
| Analytics | Doctor, Nurse, Biller, Care Coordinator | requires billing:read AND encounters:read → **Nurse, Biller 403** ⚠️ |
| Reports | Doctor, Nurse, Biller, Care Coordinator | same analytical guard → **Nurse, Biller lose data** ⚠️ |
| Payments | Biller | billing:write ✓ |
| Billing | Doctor, Biller, Care Coordinator | billing:read/write; Doctor & CC have it; ✓ |
| Locations/Settings/Waitlist | Doctor, Nurse, Receptionist, Care Coordinator | settings GET broad cap; waitlist own guard |
| Labs | Doctor, Nurse, Pharmacist, Care Coordinator | lab read / write etc. |
| Inventory | Doctor, Nurse, Receptionist, Pharmacist, Care Coordinator | inventory read/write ✓ |
| Super Admin console | only when isSuperAdmin | requireSuperAdmin ✓ |

**GAP — sidebar lists pages whose data APIs 403 for listed roles** (Analytics/Reports are visible to Nurse and Biller, but the API requires `billing:read` AND `encounters:read`, so **Nurse** (no `billing:read`) and **Biller** (no `encounters:read`) reach a 403 error state; Pharmacist is not listed for these items). Navigation to a denied page produces an error state, not a hidden entry. The `canAccess` logic and the API guard matrix use **different models** (role-name vs permission), so they drift.

**RECOMMENDED — drive the sidebar off permissions, not role names.**

1. Add a server-computed `canAccess(permissions)` per nav item using the same `hasAnyPermission` evaluator the APIs use.
2. Keep `roles` as a **display default** but never as the security boundary.
3. Derive the sidebar once per request (server) and pass to the client component, rather than baking role arrays in a static config.

**IMPLEMENTATION NEEDED** — P2/P3 (permission-driven nav; unify model).

---

# Section 22 — Dashboard architecture per role

**CURRENT (verified)** — one landing page (`/dashboard`, client) that pulls patients + appointments from `MedicalContext`. Roles holding `patients:read` + `appointments:read` can land; all six clinic roles do. Add-patient write attempts 403 for Nurse/Biller/Pharmacist (dialog exists but fails gracefully).

**GAP** — the dashboard is a single "care-board" regardless of persona. Biller lands on a patient/appointment board instead of a revenue board; Pharmacist lands on clinical flow instead of pharmacy queues; Owner lands on an ops board without admin controls surface.

**RECOMMENDED — persona-aware landing model (pure UI decision, no permission change):**

| Principal | Landing |
|---|---|
| Super Admin | `/super` (platform console) |
| Owner / Clinic Admin | ops overview + management shortcuts (staff, settings, plan) |
| Doctor / Care Coordinator | care-board (current) |
| Nurse | queue/today board |
| Biller | billing/payments board |
| Pharmacist | pharmacy/inventory board |
| Patient | `/patient-portal` (already separate) |

Implement as a route-group redirect map evaluated on the session roles, with the existing `/dashboard` page preserved as the care-board component. Do **not** change any API guard — this is presentation-only.

**IMPLEMENTATION NEEDED** — P4 (role-landing redirect map).

---

# Section 23 — Server-side enforcement matrix (verified)

| Route (method) | Required permission(s) — verified |
|---|---|
| appointments GET | appointments:read |
| appointments POST/PATCH | appointments:write |
| patients GET | patients:read |
| patients POST | patients:write |
| encounters GET | encounters:read |
| encounters POST | encounters:write |
| billing/invoices GET | billing:read |
| billing/invoices POST | billing:write |
| payments POST | billing:write |
| labs GET | encounters:read OR lab:read |
| labs POST | encounters:write + patients:write |
| lab-orders POST | encounters:write + patients:write |
| clinical-orders POST | encounters:write + patients:write (kind ∈ diagnosis\|followUp) |
| procedure-orders POST | encounters:write + patients:write |
| analytics/dashboard GET | billing:read + encounters:read |
| documents GET/POST | patients:read / patients:write |
| consents GET/POST | encounters:read + patients:write / patients:write |
| communications, campaigns | patients:write + appointments:write |
| tasks | patients:read + appointments:read (GET) / + write |
| waitlist | appointments/patients perms |
| settings GET | staff:read OR patients:write OR appointments:write OR encounters:write OR inventory:write |
| settings PATCH | requireOwner |
| audit GET | any of patients:read / encounters:read / billing:read |
| inventory | inventory:read / inventory:write |
| staff GET / roles GET | **NONE (requireOrgContext only)** → SECURITY RISK |
| staff PATCH / roles POST | requireOwner (name-based) → SECURITY RISK refactor |
| super/orgs * | requireSuperAdmin |
| request-upgrade POST | requireOwner |

**RECOMMENDED** — uniform rule: **every** mutating route and every staff/audit exposing route declares explicit `requireAnyPermission` (or `requireSuperAdmin`); no route may rely on `requireOrgContext` alone when it returns records or mutates; every returned record must be org-scoped by construction.

---

# Section 24 — Security rules (target)

1. **Deny by default.** All `requireAnyPermission` denies return 403; no default-open lists (see staff GET).
2. **Least privilege.** Role definitions sized by persona (Sections 7-10); base Doctor read-mostly; Biller keeps encounters off by default; Pharmacist read-only on clinical.
3. **Owner hardening.** Single-owner invariant + two-factor on owner escalation (Section 18).
4. **Gate login on BOTH email verification AND org active** (Section 14).
5. **Tenant scope is structural.** Prisma-layer `organizationId` injection (Section 13); no cross-org reads anywhere except the platform plane.
6. **Audit every privilege mutation.** `staff_role`, `staff_role_owner_escalation`, `role` create/update (custom roles), org status/plan changes — all already audit-logged; extend the pattern to custom-role editor.
7. **Rate limits on auth surface.** signup 3/hr/IP, auth 5/min/IP, high-volume list GETs 60/min — all active in `src/proxy.ts`.
8. **Sessions.** JWT for staff (short TTL recommended), `PatientSession` for patients (httpOnly, lax, expiry). Suspending an org must invalidate its staff JWT (session metadata check) and its patient tokens (P5).

---

# Section 25 — Consolidated GAP / RISK inventory

| # | Item | Type | Ref |
|---|---|---|---|
| G1 | `GET /api/staff` + `GET /api/staff/roles` unguarded → team enumeration | SECURITY RISK | §17 |
| G2 | Owner can mint additional Owners (name-based `requireOwner` + grant-any-role) | SECURITY RISK | §18 |
| G3 | User identity has 3 overlapping sources (`User.role`, RBAC name, permissions) | GAP | §2 |
| G4 | No Scope concept → org-wide-only permissions; multi-branch ungoverned | SECURITY RISK | §12 |
| G5 | Self-serve signup creates only 3 of 6 canonical roles | GAP | §20 |
| G6 | No role/permission management UI, no custom roles, no role removal | GAP | §15, §16 |
| G7 | Doctor base role carries read+write on lab/pharmacy/inventory/billing | SECURITY RISK / GAP | §7 |
| G8 | Sidebar lists pages whose APIs 403 for included roles (Analytics/Reports for Nurse/Biller/Pharmacist) | GAP | §21 |
| G9 | Single landing dashboard for all personae | GAP | §22 |
| G10 | Email verification not enforced as a login gate | SECURITY RISK | §14 |
| G11 | No pending-org expiry / re-approval window; manual activation | GAP | §14 |
| G12 | `email`/`User.role` naming drift (`receptionist` vs `Care Coordinator`) | GAP | §8 |
| G13 | `requireOwner` used as a permission (staff PATCH, roles POST) instead of `staff:write` | SECURITY RISK | §17 |
| G14 | `/api/super/orgs` unpaged; no platform audit view | GAP | §3 |
| G15 | Downgrade path not guarded against exceeding target caps | GAP | §19 |
| G16 | Multi-role users: UI shows only `userRoles[0]` | GAP | §2 |
| G17 | Doc-based permissions in `hasPermission` only short-circuit on role name "Super Admin" — new custom roles can never escalate (good) but role-name coupling remains | GAP | §12 |

---

# Section 26 — FINAL ROLE HIERARCHY (diagram)

```
                          ┌──────────────────────────────┐
                          │        PLATFORM PLANE         │
                          │    Organization: platform     │
                          └──────────────────────────────┘
                                      │
                          ┌───────────▼───────────┐
                          │   Super Admin        │  identity: User.role=superAdmin +
                          │   (hasPermission BYPASS)│  RBAC role "Super Admin" (dual check)
                          └───────────┬───────────┘
                                      │  governs (approve/suspend/plan/upgrade)
        ┌─────────────────────────────┼──────────────────────────────┐
        │                             ▼                               │
┌───────┴────────┐        ┌─────────────────────────┐       ┌─────────▼───────┐
│  (future)      │        │     CLINIC PLANE         │       │   PATIENT PLANE │
│  Platform      │        │   Organization per tenant │       │  (portal)       │
│  Operator      │        └────────────┬──────────────┘       └─────────────────┘
│  (optional)    │                      │                            │
└────────────────┘                      │               PatientSession cookie,
                                        │               email+MRN+password,
                                        │               NOT a RolePermission principal
┌───────────────────────────────────────▼────────────────────────────────────────────┐
│                         Tenant Roles (org scope; Super Admin excluded per org)     │
│                                                                                   │
│   Owner ──► Clinic Admin ──► Doctor ──► Care Coordinator ──► Nurse ──► Biller ──► Pharmacist │
│     ▲         (NEW, staff:write,                                     │            │
│     │          no plan/lifecycle)                                     │            │
│   Exactly one (invariant)                                             │            │
│                                                                                   │
│   ┌──────────────┐      ┌──────────────────────┐                                     │
│   │ Custom roles │      │ Scope layer (NEW):   │                                     │
│   │ (clones of   │      │   platform │ org │   │                                     │
│   │  tenant grid,│      │   branch (future)    │                                     │
│   │  never >     │      └──────────────────────┘                                     │
│   │  creator)    │                                                                   │
│   └──────────────┘                                                                   │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

Enforcement layers, top to bottom: NextAuth JWT (staff) / PatientSession (patients) → `src/proxy.ts` (session + rate limit) → server `requireAnyPermission` / `requireOwner` / `requireSuperAdmin` → org-scoped Prisma queries → audit log. Sidebar = permission-derived display (recommended), not a security boundary.

---

# Section 27 — FINAL DECISION TABLE

| Principal | Source of authority (target) | Read surface | Write surface | System access | Apps (pages) | Decision |
|---|---|---|---|---|---|---|
| **Super Admin** | `User.role=superAdmin` AND RBAC "Super Admin"; bypass | All orgs (platform) | Org status, plan, upgrade, platform audit | `/super` console | Org Lifecycle, Plan, Health, Audit | Keep + harden (§3, §4) |
| **Owner** | RBAC "Owner" (single); `staff:write` | Patients, appts, encounters, billing, inventory, staff | patients, appts, encounters, inventory, billing, staff, settings, plan-request | plan (request), settings, staff | Dashboard-Ops, staff, settings, plan | Keep; add single-owner invariant (§5, §18) |
| **Clinic Admin (NEW)** | RBAC "Clinic Admin"; `staff:write`, `settings:*` | All clinic records (non-plan) | patients, appts, encounters, staff write; billing/lab/pharmacy read | settings (non-plan), staff | team/settings | ADD (§6, §20) |
| **Doctor** | RBAC "Doctor"; base = clinical R/W + read-mostly lab/pharmacy/inventory/billing | same | patients, appts, encounters | — | care-board, encounters, labs read, pharmacy read | Trim write surface (§7) |
| **Care Coordinator** | RBAC "Care Coordinator" (canonical; alias receptionist) | patients, appts, encounters, inventory read | patients, appts, encounters | waitlist, queue, days/rooms | scheduling | Canonicalize name + rights (§8) |
| **Nurse** | RBAC "Nurse" | patients, appts, encounters, inventory/lab/pharmacy read | patients, appts, encounters | queue, vitals | — | Keep (§10) |
| **Biller** | RBAC "Biller" | patients, appts, billing | billing | payments | billing, payments | Keep; hide Analytics (§9, §21) |
| **Pharmacist** | RBAC "Pharmacist" | patients, appts, inventory, pharmacy, lab read | inventory, pharmacy | inventory | pharmacy, inventory | Keep (§9) |
| **Patient** | PatientSession (separate) | portal capabilities (opt-in flags) | bookings (opt-in), surveys, comms | patient portal | portal | Keep separate (§11) |

Sources for CURRENT facts: `roles.ts`, `auth.ts`, seed, guards verified per route (§17, §23).

---

# Section 28 — IMPLEMENTATION ROADMAP

Phases are ordered so that security-critical controls land first. Each phase = code change (this document does not perform them now) + tests + verification check (`tsc`, vitest, `next build`, guard-spot-check).

| Phase | Scope | Work items | Depends on | Definition of done |
|---|---|---|---|---|
| **P1** | Emergency hardening | (a) `staff:read` on `GET /api/staff` + `GET /api/staff/roles`; (b) login gate `emailVerified`; (c) naming normalization (`receptionist` → `care_coordinator` alias map); (d) sidebar/guide regenerated from single source | — | No 200-on-non-granted list endpoints; unverified email cannot log in; single display-name source |
| **P2** | Management roles + UI | (a) `Clinic Admin` role (canonical permission list, shared seed+signup module); (b) full default-role suite on signup (Owner, Clinic Admin, Doctor, CC, Nurse, Biller, Pharmacist); (c) Roles builder page + endpoints guarded by `staff:write`; (d) permission-based staff admin (replace name-based `requireOwner` on staff routes); (e) single-owner invariant + escalation guard + alerts | P1 | Custom roles creatable; no second owner without 2FA; staff admin works for Clinic Admin |
| **P3** | Scope layer + nav | (a) schema: `Scope` + role-scope join (+ `branch` type); (b) Prisma `organizationId` injection middleware; (c) permission-driven sidebar (eval per request) | P2 | Branch-scoped authorizations possible; cross-org reads impossible by construction |
| **P4** | Persona UX | (a) persona landing redirect map; (b) hide Analytics/Reports for Nurse/Biller/Pharmacist (fix sidebar vs API drift); (c) multi-role display + role removal endpoint; (d) patient capability flags + portal-route lint | P2 | One landing per principal; sidebar never shows page that 403s; portal server routes staff-session-free |
| **P5** | Lifecycle + platform | (a) pending-org expiry + re-approval; (b) suspended-org session/token invalidation; (c) platform audit view; (d) `/api/super/orgs` pagination/search; (e) downgrade-guard (measure usage vs target plan) | P1 | Pending orgs auto-archive; suspension kills sessions; super console paginates |
| **P6** | Doctor least-privilege rollout | Split Doctor base vs opt-in `lab:write`/`pharmacy:write`; migrate clinical-orders to a named ordering permission | P2 | Base Doctor cannot write lab/pharmacy/inventory/billing |
| **P7** | Multi-tenant hardening | Branch-scope authorizations in query paths; branch admin variant (optional); branch data-isolation test suite | P3 | Multi-branch branch-level isolation exercised in CI |
| **P8** | Custom-role power guard | Creator-scope ceiling, plan-count cap, custom-role audit trail | P2 | Custom role cannot exceed creator perms |
| **P9** | Payments/plan integration | Optional; wire Stripe webhook (already public path) + plan checkout; enforce plan on roles | P5 | Plan checkout works; webhook updates plan |
| **P10** | Patient portal capability matrix | Formalize opt-in flags + consent surface (canBookOnline, canViewRecords) | P4 | Documented matrix + tests |
| **P11** | Final hardening sweep | Re-run `ROLE_CAPABILITY_GUIDE.md` regen, full guard-spot-check, pentest-style role matrix tests (extend `tests/unit/role-matrix.test.ts`), tag release | All | Role-matrix tests expanded; no unaudited handler |

---

## EXECUTIVE SUMMARY

OpenHealthCRM already has a sound, verified foundation: a dual-check Super Admin (platform plane), org-scoped tenant RBAC with role-name sessions, a broad server-side permission-guard layer, full org isolation on every tenant model, strict org-lifecycle gating at login, and a completely separated patient portal identity domain.

The core problems are **enforcement ergonomics**, not missing capability:

1. **Two security defects must be fixed first (P1):** staff/roles list endpoints are readable by every logged-in member (team enumeration), and owner authority is checked by *role name* while a name-based grant path lets owners mint additional owners. Both follow from using `requireOwner`/role-name checks instead of `staff:read` / `staff:write` permissions.
2. **The permission model is static and org-wide (P2/P3):** no role editor, no custom roles, tenants only get 3 of 6 canonical roles on signup, and there is no branch/scope layer — blocking multi-branch data isolation.
3. **UI/authorization drift (P2/P4):** the sidebar is role-name-driven while APIs are permission-driven, so pages like Analytics/Reports are visible to Nurse/Biller/Pharmacist but 403 on data. Sidebar visibility should be derived from the same permission evaluator as the APIs.
4. **Least privilege (P6):** the base Doctor role carries write access on lab/pharmacy/inventory/billing; the target flattens this to read-mostly with explicit opt-in writes.
5. **Design decisions adopted:** Super Admin stays dual-check and platform-only; Owner becomes single-owner with an invariant guard; introduce Clinic Admin; canonicalize Care Coordinator; keep Patient fully separate; require email verification plus active-org at login; and gate every stage behind permission checks, audit, and tests — 11 implementation phases, security-critical ones first.

No code was modified to produce this document.