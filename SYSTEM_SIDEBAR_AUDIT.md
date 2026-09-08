# SYSTEM & SIDEBAR AUDIT — HealthCRM (OpenHealthCRM)

**Type:** Analysis only — no code, database, or permission changes were made by this document.
**Audit date:** 2026-09-08
**Scope:** All modules, routes, sidebar hierarchy, dashboards, RBAC, seed-vs-system, and security of the current codebase.
**Method:** Direct source review of `src/app/**`, `src/components`, `src/lib`, `src/context`, `prisma/schema.prisma`, and `prisma/seed.js`. Every finding below is tied to a real file path.

> **Update (2026-09-08, Phase 4–5):** Several findings below were remediation-targeted in later
> commits (`1484d4e` Phase 4, `e5c24cf` Phase 5). Changed state is annotated inline
> with **FIXED** / **RESOLVED** / **REVISED**. The current role/permission model is
> documented authoritatively in [`ROLE_CAPABILITY_GUIDE.md`](./ROLE_CAPABILITY_GUIDE.md).

---

## 1. Module Inventory & Status

Legend: **Implemented** = real UI wired to data · **Partial** = real UI with hardcoded/incomplete parts · **Static** = fixed content · **Hidden** = fits a module but not linked in the sidebar.

| Module | Route | Type | Status | Data source | Sidebar link |
|---|---|---|---|---|---|
| Dashboard | `/dashboard` | Client | Implemented (Phase 4: fabricated stats removed, metrics computed) | `MedicalContext` (`/api/patients`, `/api/appointments`) | Yes |
| Patients / Records | `/patients` · `/patients/[id]` | Client / Server | Implemented | Context (list) · Prisma (timeline: appointments, encounters, prescriptions, invoices, labs, diagnoses, follow-ups, procedures, documents) | Yes |
| Appointments / Scheduling | `/appointments` | Client | Implemented | Context + `/api/staff` | Yes |
| Queue | `/queue` | Client | Implemented | `/api/queue` | Yes |
| Encounters | `/encounters` | Client (thin server wrapper) | Implemented | `/api/patients`, `/api/encounters`, `/api/encounters/{id}/notes` | Yes |
| Analytics | `/analytics` | Client | Implemented | `/api/analytics/dashboard` | Yes |
| Automation | `/automation` | Client | Implemented | `/api/automation/signals` | Yes |
| Billing | `/billing` | Client | Implemented (Phase 4: summary cards computed, New Invoice dialog wired) | `/api/billing/invoices` | Yes |
| Payments | `/payments` | Client | Implemented | `/api/payments` | Yes |
| Labs (Orders & Results) | `/labs` | Client | Implemented | `/api/labs` | Yes |
| Inventory | `/inventory` | Client | Implemented (Phase 4: "Add Item" wired via dialog) | `/api/inventory` | Yes |
| Tasks | `/tasks` | Client | Implemented (Phase 4: "Create" wired via dialog) | `/api/tasks` | Yes |
| Plan & Usage | `/plan` | Server | Implemented | Prisma + `getOrgUsage`/`getPlanLimits` | Yes |
| Reports | `/reports` | Server → Client | Implemented | `/api/reports/monthly?month=` | Yes |
| My Availability | `/availability` | Server | Implemented | Prisma (own user record) | Yes |
| Branches & Rooms | `/locations` | Client | Implemented | `/api/branches`, `/api/rooms` | Yes |
| Catalogs | `/catalogs` | Client | Implemented | `/api/catalogs?kind=service|clinical` | Yes |
| Settings | `/settings` | Client | Implemented | `/api/settings`, `/api/staff`, `/api/staff/roles` | Yes |
| Help | `/help` | Client | **Partial** — static FAQ, hardcoded English, "Send Message" submit is a placeholder comment | none | Yes |
| Super Admin Console | `/super` | Server | Implemented | `/api/super/orgs`, `/api/super/orgs/{id}/status|plan|upgrade` | Yes (super admins only) |
| Documents | `/documents` | Client | Implemented | `/api/documents` | Yes (Phase 4: now in Operations) |
| Communications | `/communications` | Client | Implemented | `/api/communications` | Yes (Phase 4: now in Operations) |
| Campaigns | `/campaigns` | Client | Implemented | `/api/communications/campaigns` | Yes (Phase 4: now in Operations) |
| Audit Trail | `/audit` | Client | Implemented | `/api/audit` | Yes (Phase 4: now in Overview) |
| Consents | `/consents` | Client | Implemented | `/api/consents` | Yes (Phase 4: now in Overview) |
| Waitlist | `/waitlist` | Client | Implemented | `/api/waitlist` | Yes (Phase 4: now in System) |
| Print Receipt | `/print/receipt/[invoiceId]` | Server | Implemented | Prisma (org-scoped) | n/a |
| Print Prescription | `/print/prescription/[id]` | Server | Implemented | Prisma (org-scoped) | n/a |
| Landing | `/` | Server | Static | none | n/a |
| Auth | `/login`, `/signup`, `/forgot-password`, `/verify-email`, `/reset-password` | Server → Client forms | Implemented | `src/components/auth/*` | n/a |
| Suspended | `/suspended` | Server | Static | none | n/a |
| Patient Login / Portal | `/patient-login`, `/patient-portal` | Client | Implemented (some portal buttons non-functional) | `/api/patient-auth/login`, `/api/patient-portal/overview`, `/api/patient-auth/logout` | n/a |

**Page implementation status (from scan of all 39 `page.tsx`):** 31 Implemented, 3 Partial (`/help`, `/billing`, and dashboard's hardcoded stat tiles), 5 Static/entry (`/`, `/suspended`, auth pages). No placeholder "under construction" pages exist.
**REVISED (Phase 4):** `/billing` and the dashboard stat tiles are now wired to real data; the remaining Partial pages are `/help` (static FAQ) and `/patient-portal` buttons (intentionally disabled with coming-soon state).

### Modules from the original vision that have NO dedicated page
- **Prescriptions list** — exists only as records + print page; no module page (authoring is inside the Encounters workspace).
- **Lab Orders list** — aggregated into `/labs`; no standalone orders page.
- **Insurance Claims** — `InsurancePolicy` + `InsuranceClaim` models exist (schema lines 567/579); the old hardcoded `claimsPending: 0` billing card was removed (Phase 4) but **no list/CRUD page** exists yet.
- **Feedback/Surveys** — `FeedbackSurvey` model exists (schema line 695); no page at all.
- **Clinical follow-ups / diagnoses / procedure orders** — embedded entirely in the Encounters workspace; no standalone views.

---

## 2. Routes Analysis

### 2a. Accessible routes (all work)
27 authenticated app routes + 5 print/portal routes + 6 public auth/landing routes (listed above). The middleware (`src/proxy.ts`) protects everything except: `/`, `/login`, `/signup`, `/forgot-password`, `/verify-email`, `/reset-password`, `/patient-login`, `/patient-portal`, and unknown assets — so **every dashboard/settings/super route is behind a session check**.

### 2b. Routes reachable by URL but missing from the sidebar (orphaned)
`/documents`, `/communications`, `/campaigns`, `/audit`, `/consents`, `/waitlist`, `/print/receipt/[invoiceId]`, `/print/prescription/[id]`. The header-title registry (`routeTitleKeys` in `src/components/ui/dashboard-with-collapsible-sidebar.tsx`) **does** include keys for `/documents`, `/communications`, `/campaigns`, `/audit`, `/consents`, `/waitlist` — i.e. the titles exist, but the sidebar navigation items were never added. These pages are only reachable by typing the URL (or via notifications/links).
**RESOLVED (Phase 4):** the six orphaned modules were added to the sidebar (Overview: Consents, Audit; Operations: Documents, Communications, Campaigns; System: Waitlist). Only the `/print/*` routes remain non-nav, which is intended (print views).

### 2c. Routes that need modification (per module audit)
- `/billing` — summary cards (`totalRevenue`, `outstanding`, `claimsPending`) are hardcoded `$0`/`0`; should come from `/api/billing/*` aggregate. **RESOLVED (Phase 4):** summary cards now compute collected / outstanding / open-invoice counts from real invoices; New Invoice dialog + POST wired to `billing:write`.
- `/help` — hardcoded English; contact submit is a "would integrate with support API" placeholder. *(still open)*
- `/dashboard` — `avgWait: "14 min"`, `+12%/+4%/+2%/−2%` changes, and quick stats `92% / 4.2% / 8.7/mo` are hardcoded; "View all" activity link points to `href="#"`. **RESOLVED (Phase 4):** hardcoded deltas/quick-stats/activity feed removed in favor of real active-patients, today-visits, cancellation-rate, visited-this-month, and last-visit metrics computed from context; "View all" → `/patients`.
- `/patients/[id]` — implemented server-side timeline; partial data (baseline of key events) — full vitals graphs/lab chart history not yet drawn. *(still open)*
- `/patient-portal` — "Book Appointment", "View Medical Records", "Message Provider", "Update Profile" buttons have no handlers. **REVISED (Phase 4):** buttons now scroll to real sections (appointments, lab results) and the four non-available actions are disabled with `portal_comingSoon` state.

### 2d. Same-screen / overlapping-route pairs (candidates to consolidate or clearly distinguish)
- `/analytics` (client KPI cards from `/api/analytics/dashboard`) ↔ `/reports` (monthly report) ↔ `/dashboard` hero tiles — overlapping metrics (revenue, no-show, completion rate) appear in multiple places.
- `/queue` (today's checked-in room flow) ↔ `/waitlist` (walk-in list) ↔ `/availability` (provider schedule) — three different "day operations" screens.
- `/billing` ↔ `/payments` — separate lists; neither shows a combined patient statement (that exists only in `/print/receipt/[invoiceId]`).
- `/labs` ↔ lab-orders inside Encounter charts — two entries for the same data.
- `/communications` ↔ `/campaigns` — communications list vs campaign builder; no linking between them.

### 2e. Routes that mismatch the original vision
- Original vision had a **Doctor (role-specific) Dashboard**; today `/dashboard` is a single generic screen shown to every authenticated role (sidebar never hides it). No role-parameterized dashboard exists.
- Original vision had **Insurance Claims** and **Feedback/Surveys**; neither has a route (see §1).
- Original vision implied a **Prescriptions** and **Lab Orders** module endpoint; both were folded into Encounters + print pages only.

---

## 3. Sidebar Hierarchy

Source: `src/components/ui/dashboard-with-collapsible-sidebar.tsx`. Role names supported: `Super Admin`, `Owner`, `Doctor`, `Nurse`, `Receptionist`, `Biller`, `Pharmacist`, `Care Coordinator`. `Owner`/`Super Admin` always pass `canAccess`; an item with **no `roles` array is visible to every role**. Gating is **client-side only** (cosmetic).

### Current structure (REVISED — Phase 4 added the six orphaned modules)

**Overview** (`nav_overview`) — Dashboard *(all)* · Patients `[Doctor, Nurse, Receptionist, Biller, Pharmacist, Care Coordinator]` · Appointments `[Doctor, Nurse, Receptionist, Care Coordinator]` · Queue `[Doctor, Nurse, Receptionist, Care Coordinator]` · Encounters `[Doctor, Nurse, Care Coordinator]` · Analytics `[Doctor, Nurse, Biller, Care Coordinator]` · Consents `[Doctor, Nurse, Receptionist, Care Coordinator]` · Audit `[Doctor, Nurse, Biller, Care Coordinator]` · Automation *(all)*

**Operations** (`nav_operations`) — Billing `[Doctor, Biller, Care Coordinator]` · Payments `[Biller]` · Labs `[Doctor, Nurse, Pharmacist, Care Coordinator]` · Inventory `[Doctor, Nurse, Receptionist, Pharmacist, Care Coordinator]` · Tasks `[Doctor, Nurse, Receptionist, Biller, Pharmacist, Care Coordinator]` · Documents `[…all staff roles…]` · Communications `[Doctor, Nurse, Receptionist, Care Coordinator]` · Campaigns `[Doctor, Nurse, Receptionist, Care Coordinator]`

**System** (`nav_system`) — Plan & Usage *(all)* · Reports `[Doctor, Nurse, Biller, Care Coordinator]` · My Availability `[Doctor, Nurse]` · Branches & Rooms `[Doctor, Nurse, Receptionist, Care Coordinator]` · Catalogs *(all)* · Settings `[Doctor, Nurse, Receptionist, Care Coordinator]` · Waitlist `[Doctor, Nurse, Receptionist, Care Coordinator]` · Help *(all)* · **Super Admin** `/super` appended only when `isSuperAdmin`

### Findings (REVISED)
1. **Five items are never hidden** (no role filter): Dashboard, Automation, Plan, Catalogs, Help — so Pharmacist/Biller still see Plan/Usage and Automation. *(still open)*
2. **Inconsistent role windows across related features** *(still open, unchanged from the original audit):*
   - Labs `[Doctor, Nurse, Pharmacist, Care Coordinator]` vs Inventory `[Doctor, Nurse, Receptionist, Pharmacist, Care Coordinator]` — Inventory admits Receptionist/Biller-excluded-receptionists while Labs excludes Receptionists; the clinical supply chain split remains uneven.
   - Reports (`[Doctor, Nurse, Biller, Care Coordinator]`) vs Analytics (`[Doctor, Nurse, Biller, Care Coordinator]`) — aligned in Phase 4.
   - Branches & Rooms open to `[Doctor, Nurse, Receptionist, Care Coordinator]` — Doctors can see room assignment info (was `[Receptionist, Care Coordinator]`).
3. **Corporate-role support is asymmetric:** sidebar supports `Nurse`/`Pharmacist`/`Receptionist` role names — **RESOLVED (Phase 5):** seed now creates `Owner`, `Nurse`, `Pharmacist` roles and assigns all staff accounts (see §5b).
4. **Naming drift:** the sidebar exposes "Care Coordinator", but `User.role` denormalization uses `receptionist` (seed), producing `ops@/receptionist@`: `role="receptionist"` + RBAC `Care Coordinator`. Two vocabularies for one person. *(still open)*
5. **Orphaned routes unreachable from navigation** — **RESOLVED (Phase 4):** Documents, Communications, Campaigns, Audit Trail, Consents, Waitlist were added to the sidebar.
6. **No icon/order for Patient Portal** — the portal is a separate app surface (own login), correctly not in the staff sidebar. *(unchanged)*

---

## 4. Dashboards & Widgets

### 4a. `/dashboard` (client, `src/app/(dashboard)/dashboard/page.tsx`)
Data comes from `MedicalContext` (`src/context/MedicalContext.tsx`), which on mount hits `GET /api/patients` and `GET /api/appointments` in parallel (no dashboard-specific API).
**REVISED (Phase 4):** fabricated widgets replaced by computed real values; deltas/quick-stats/activity feed removed.

Widgets:
1. **Hero careboard** — live queue count, today's visits, "low no-show" momentum (2/3 values real from context; "momentum" is cosmetic).
2. **Stat cards (4)** — Total patients (real), Appointments today (real), Active encounters (real: status confirmed/"in waiting room"), **Average wait "14 min" hardcoded**; deltas `+12%/+4%/+2%/-2%` hardcoded. **REVISED:** wait/delta tiles now show honest computed metrics (confirmed today, cancelled today, no-show count) — no fabricated numbers.
3. **Recent Activity feed** — fabricated client-side: first 3 patients + first 2 appointments + 2 fake "system update / care campaign" entries. **Not a real activity/audit feed.** **REVISED:** fake feed entries removed; activity now shows real last-visit timestamps from patient data.
4. **Quick Stats** — retention `92%`, no-show `4.2%`, visit frequency `8.7/mo` — **all hardcoded**. **REVISED:** replaced with real active-patient count, cancellation rate, and visitation % this month computed from context.
5. **Upcoming appointments** — real (next 5, sorted by start time from context).
6. **Recent patients table** — real (first 5), with profile sheet + Add Patient dialog.

### 4b. `/analytics` (client, `src/app/(dashboard)/analytics/page.tsx`)
Fetches `GET /api/analytics/dashboard` (`{kpis}`) once on mount. Widgets: 4 KPI cards (active patients, appointments today, encounters this month, avg visit min) + operational metric grid (completion %, no-show %, revenue this month, outstanding balance). All from the one API; `averageVisitMinutes`/rates are computed server-side. **REVISED:** the endpoint now requires `billing:read` + `encounters:read` (see §5a).

### 4c. Gaps
- No real activity/feed endpoint backing the dashboard feed; no notifications integration (the bell menu reads `Notification` model links, separate).
- Dashboard has no branch filter and mixes the whole organization's appointments into "today".
- Analytics lacks time-range controls, charts, per-provider breakdowns; it is a KPI board only.

---

## 5. RBAC & Authorization Audit

### 5a. How it works today
- **Two parallel models:** denormalized `User.role` string (`superAdmin|owner|doctor|receptionist|biller|nurse|pharmacist` — `prisma/schema.prisma:98`) **and** RBAC `UserRole → Role → RolePermission` (schema lines 114/125/134).
- **Session roles** come from `src/auth.ts` `authenticateUser`: org status must be `active` (else login blocked), user attached; `session.roles` = names of RBAC Roles via `userRoles`.
- **Server guards:**
  - `requireSuperAdmin()` (`src/lib/roles.ts`) — user must have `User.role === "superAdmin"` **AND** an RBAC role named "Super Admin". Used by `/super` page + `/api/super/*`.
  - `requireOwner()` — `User.role === "owner"` or RBAC name "Owner". Used only by `/plan` (sets `isOwner`, does **not** block — non-owners still view the page; upgrade actions gated in `PlanDashboard`). **REVISED:** an "Owner" RBAC role is now seeded (Phase 5).
  - API tenant gate `requireOrgContext()`/`getOrgId()` (`src/lib/org.ts`) blocks every org-scoped API without a valid `organizationId`.
  - Permission level: `hasPermission`/`hasAnyPermission` (`src/lib/auth.ts`) with `Super Admin` short-circuit and resource*-wildcard `resource:null`; wrapped by `requireAnyPermission(orgId, [...])` (`src/lib/authorization.ts`) returning a 403 `NextResponse`.
- **Where permission checks are actually applied:** **REVISED (Phase 3 + 4):** `requireAnyPermission` is now applied across nearly every org-scoped API — patients, appointments (read/write/recurrence), encounters (+ notes, `[id]`), billing/invoices + payments, labs + lab-orders, clinical-orders (diagnosis/follow-up), procedure-orders, prescriptions, vitals + `/vitals/stream`, inventory (+ transactions), documents, consents, communications + campaigns, tasks (+ `[id]`), waitlist, settings, queue, branches, rooms, reports/monthly, analytics/dashboard, notifications, audit. See `ROLE_CAPABILITY_GUIDE.md` §4 for the per-module permission map.

### 5b. Seed vs. system
From `prisma/seed.js` (org "مركز الإسكندرية الطبي" + platform org "إدارة المنصة"):
**REVISED (Phase 5):** the seed now provisions 9 staff accounts with dedicated roles.

| Seeded login | `User.role` | RBAC Role(s) | Permissions granted |
|---|---|---|---|
| `superadmin@acmeclinic.com` | `superAdmin` | Super Admin | all read/write via short-circuit + platform console |
| `owner@acmeclinic.com` | `owner` | Owner | 12 perms: patients/appointments/encounters/inventory/billing r+w + staff r+w |
| `admin@acmeclinic.com` | `doctor` | Doctor | 14 perms (full clinical stack incl lab/pharmacy) |
| `dr.fatma@acmeclinic.com` | `doctor` | Doctor | 14 perms; pediatric specialist on branch 2 |
| `nurse@acmeclinic.com` | `nurse` | Nurse | 9 perms: clinical r+w + inventory:read/lab:read/pharmacy:read |
| `ops@acmeclinic.com` | `receptionist` | Care Coordinator | 14 perms (full clinical stack) |
| `receptionist@acmeclinic.com` | `receptionist` | Care Coordinator | 14 perms (full clinical stack) |
| `billing@acmeclinic.com` | `biller` | Biller | patients:read, appointments:read, billing:read, billing:write |
| `pharmacist@acmeclinic.com` | `pharmacist` | Pharmacist | 7 perms: patients:read, appointments:read, inventory r+w, pharmacy r+w, lab:read |

- **Super Admin role exists only in the platform org** ("إدارة المنصة"); clinic org users get Owner/Doctor/Care Coordinator/Nurse/Biller/Pharmacist.
- **All sidebar-supported RBAC names are now seeded** (Owner, Doctor, Nurse, Care Coordinator, Biller, Pharmacist) except a literal "Receptionist" Role (receptionist display accounts use "Care Coordinator").
- `User.role` vocabulary (`doctor`, `receptionist`) still differs from RBAC names (`Doctor`, `Care Coordinator`) — two sources of truth in code (§3 finding 4, still open).
- Patient portal uses a separate `PatientSession` token path (`/api/patient-auth/*`) — patients are `Patient` records with passwords, not `User` rows; portal session is a signed HTTP-only cookie, not a NextAuth session.

### 5c. RBAC gaps
1. **Layout-only enforcement:** the entire `(dashboard)` tree is gated only by `auth()` (+ org-suspended redirect) in `src/app/(dashboard)/layout.tsx`. All client pages under it inherit that, but **none** check roles/permissions themselves. **REVISED:** page shells remain layout-gated, but the data APIs behind every page now enforce permissions server-side (§5a), so direct-URL access surfaces a functionality-less page whose data calls 403 without the right permission.
2. **Page gating by role is cosmetic:** sidebar `roles` arrays are pure UI. Any authenticated staff member (incl. Biller) can open `/patients`, `/encounters`, `/analytics`, `/billing`, `/documents`, `/consents`, etc. by URL. **REVISED:** the page may open, but each API behind it is permission-checked — a Biller opening `/billing` can read, a Pharmacist opening `/patients` can read but a `patients:write` action (edit/add) 403s.
3. **GET endpoints generally unguarded by permission** (§6) — the API layer is org-scoped but not role-aware for reads, so the cosmetic sidebar is the only role filter in the whole stack. **RESOLVED (Phase 3/4):** read endpoints are permission-guarded across the modules listed in §5a.

---

## 6. Security Findings

Severity Triage:
- **[RESOLVED] Role-based access control is frontend-only.** No longer true: server-side `requireAnyPermission` guards were added across org-scoped APIs (Phase 3 + Phase 4 invoices). Direct URL navigation still opens a page shell, but its data calls 403 without the right permission. Sidebar role-filtering remains cosmetic and is best considered a UX affordance.
- **[RESOLVED] Permission checks applied to only 2 API surfaces.** Now applied broadly — see §5a and `ROLE_CAPABILITY_GUIDE.md` §4.
- **[RESOLVED] Analytics endpoint exposes org-wide finances to any staff role.** `/api/analytics/dashboard` and `/api/reports/monthly` now require `billing:read` + `encounters:read`, so Biller/CC/Doctor and platform roles (with those perms) only.
- **[MED, still open] Wire-level authorization vs trust:** actions guarded by `requireAnyPermission` remain per-request correct; but the sidebar can still show a page whose write actions will 403 for that role (e.g. Biller sees Appointments but lacks `appointments:write`) → UX mismatch; no inline "read-only/forbidden" affordance in the UI yet.
- **[LOW] Dual auth pathways complexity** — NextAuth (staff) + `PatientSession` (portal). Risk of confusion in ownership; portal overview endpoint must always assert the token maps to the same patient/org (it does today via orgId from token).
- **[LOW, REVISED] Patient portal buttons are inert** — "Book Appointment / Message Provider / View Medical Records / Update Profile" are now explicitly disabled with a coming-soon state rather than silently dead; still no booking surface yet, so no booking abuse surface opens.
- **[RESOLVED] Hardcoded metrics are misleading** — dashboard "14 min", retention/no-show percentages, billing `$0` summaries, and analytics deltas were placeholders. Phase 4 replaced dashboard + billing fabrications with computed values; no fabricated numbers remain in those surfaces.
- **[INFO, still open] Environment hygiene** — `.vercelignore` excludes `.env`; `NEXTAUTH_SECRET`/`AUTH_SECRET` set in Vercel. Credentials are not committed to git.

---

## 7. UI Inconsistencies Introduced by Recent Module/Naming Changes

- **RESOLVED — Stale default-route text in the login form:** now shows "Default route: **Dashboard**" (`t["nav_dashboard"]`) matching post-login routing.
- **Sidebar role mismatch with actual role behavior** (see §5): Biller sees Appointments/Patients pages in the sidebar yet is denied `appointments:write` server-side — no inline warning/graceful "forbidden" state exists; the page renders and the action silently 403s or simply isn't offered. *(still open — see §6 MED)*
- **REVISED — Multi-cycle confusion in screens/composites:** dashboard no longer mixes real + fake numbers; billing no longer shows `$0` next to real rows.
- **Localization:** `/help`, `/campaigns`, `/communications`, `/consents`, `/documents` are hardcoded English while the rest of the app is bilingual (en/ar via `useLocale`); `/documents`/`/consents` include neither `useLocale` nor `getDictionary`. *(still open)*
- **Orphan-route titles:** header shows real titles for `/documents`, `/communications`, `/campaigns`, `/audit`, `/consents`, `/waitlist` but there is no nav item → pages look "hidden on purpose" while actually being fully built. **REVISED (Phase 4):** these six orphaned modules were added to the sidebar (Overview: Consents, Audit; Operations: Documents, Communications, Campaigns; System: Waitlist).

---

## 8. New Modules Recommendation (future backlog, not applied)

Given the current gaps, the highest-value next modules, in order of appear-to-user-value:

1. **Doctor/Role Dashboard** — parameterize `/dashboard` by role: clinical view (today's appointments, encounters, vitals flag) for Doctor; ops view (queue/rooms) for Receptionist; revenue view for Biller. Removes the "one dashboard for everyone" mismatch with the original vision.
2. **Prescriptions & Lab Orders module pages** — move authoring/list/status out of the Encounter popover into dedicated `/prescriptions` and `/lab-orders` pages (stable links for print + patient portal).
3. **Insurance Claims module** — build the missing page over the existing `InsurancePolicy`/`InsuranceClaim` models; wire the hardcoded `claimsPending` card to real aggregates.
4. **Feedback/Surveys module** — new page over `FeedbackSurvey` (model already exists); link into portal "View Health Summary".
5. **Real activity/notification feed** — the fabricated dashboard Activity feed was removed (Phase 4); a true server feed from `AuditLog`/`Notification` remains to be built.
6. **Server-enforced permission checks** — **DONE (Phase 3–5):** `requireAnyPermission` retrofitted on the read surfaces flagged in §6 (patients, encounters, billing, analytics, documents, consents, labs, inventory, waitlist, tasks, queue, communications, campaigns, settings, branches/rooms, reports, prescriptions, clinical-orders, procedure-orders, vitals, notifications). The sidebar's role filtering is now backed by a real server authority.
7. **Sidebar cleanup** — **DONE (Phase 4):** the six orphaned routes were added to the sidebar; Labs/Inventory role arrays remain to be aligned.

---

## Recommended Next Step

**DONE (Phase 3–5).** The two highest-value recommendations are now implemented:
1. **Permission matrix locked and mirrored to the seed** — authoritative table in `ROLE_CAPABILITY_GUIDE.md` §2; `prisma/seed.js` creates Owner/Nurse/Pharmacist + existing roles from those exact sets, and the signup route mirrors the Owner/Doctor/Care Coordinator defaults.
2. **Server-side guards applied** across the org-scoped APIs flagged by this audit (patients, encounters, billing, analytics/dashboard, documents, consents, labs, inventory, waitlist, tasks, queue, communications, campaigns, settings, branches/rooms, reports, prescriptions, clinical-orders, procedure-orders, vitals, notifications) — closing the HIGH-severity frontend-only finding.
3. **Cosmetic/UI inconsistencies (§7) fixed** — stale "Analytics" default-route text, hardcoded billing `$0` + dashboard `14 min`/quick-stats/feed, and orphan-route nav items added to the sidebar.

Remaining backlog (from §8, in priority order):
- Sidebar read-only/forbidden affordance for view-but-no-write roles (Biller on Appointments, Pharmacist on Patients writes, Nurse on stock).
- Doctor/Role Dashboard, Prescriptions & Lab Orders module pages, Insurance Claims module, Feedback/Surveys module, real activity/notification feed.
- `/help` localization and contact integration; `/documents` `/consents` bilingual support.

*This audit was updated on 2026-09-08 after Phase 4/5. No source files, schemas, permissions, or deployment settings were changed beyond what the annotated Phase 4 (`1484d4e`) and Phase 5 (`e5c24cf`) commits already contain.*