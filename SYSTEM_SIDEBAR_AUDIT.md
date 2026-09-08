# SYSTEM & SIDEBAR AUDIT — HealthCRM (OpenHealthCRM)

**Type:** Analysis only — no code, database, or permission changes were made.
**Audit date:** 2026-09-08
**Scope:** All modules, routes, sidebar hierarchy, dashboards, RBAC, seed-vs-system, and security of the current codebase.
**Method:** Direct source review of `src/app/**`, `src/components`, `src/lib`, `src/context`, `prisma/schema.prisma`, and `prisma/seed.js`. Every finding below is tied to a real file path.

---

## 1. Module Inventory & Status

Legend: **Implemented** = real UI wired to data · **Partial** = real UI with hardcoded/incomplete parts · **Static** = fixed content · **Hidden** = fits a module but not linked in the sidebar.

| Module | Route | Type | Status | Data source | Sidebar link |
|---|---|---|---|---|---|
| Dashboard | `/dashboard` | Client | Implemented (some hardcoded stats) | `MedicalContext` (`/api/patients`, `/api/appointments`) | Yes |
| Patients / Records | `/patients` · `/patients/[id]` | Client / Server | Implemented | Context (list) · Prisma (timeline: appointments, encounters, prescriptions, invoices, labs, diagnoses, follow-ups, procedures, documents) | Yes |
| Appointments / Scheduling | `/appointments` | Client | Implemented | Context + `/api/staff` | Yes |
| Queue | `/queue` | Client | Implemented | `/api/queue` | Yes |
| Encounters | `/encounters` | Client (thin server wrapper) | Implemented | `/api/patients`, `/api/encounters`, `/api/encounters/{id}/notes` | Yes |
| Analytics | `/analytics` | Client | Implemented | `/api/analytics/dashboard` | Yes |
| Automation | `/automation` | Client | Implemented | `/api/automation/signals` | Yes |
| Billing | `/billing` | Client | **Partial** — real invoices, but summary cards hardcoded `$0`/`0`; "New Invoice" has no handler | `/api/billing/invoices` | Yes |
| Payments | `/payments` | Client | Implemented | `/api/payments` | Yes |
| Labs (Orders & Results) | `/labs` | Client | Implemented | `/api/labs` | Yes |
| Inventory | `/inventory` | Client | Implemented (a few "Add Item" buttons have no handlers) | `/api/inventory` | Yes |
| Tasks | `/tasks` | Client | Implemented | `/api/tasks` | Yes |
| Plan & Usage | `/plan` | Server | Implemented | Prisma + `getOrgUsage`/`getPlanLimits` | Yes |
| Reports | `/reports` | Server → Client | Implemented | `/api/reports/monthly?month=` | Yes |
| My Availability | `/availability` | Server | Implemented | Prisma (own user record) | Yes |
| Branches & Rooms | `/locations` | Client | Implemented | `/api/branches`, `/api/rooms` | Yes |
| Catalogs | `/catalogs` | Client | Implemented | `/api/catalogs?kind=service|clinical` | Yes |
| Settings | `/settings` | Client | Implemented | `/api/settings`, `/api/staff`, `/api/staff/roles` | Yes |
| Help | `/help` | Client | **Partial** — static FAQ, hardcoded English, "Send Message" submit is a placeholder comment | none | Yes |
| Super Admin Console | `/super` | Server | Implemented | `/api/super/orgs`, `/api/super/orgs/{id}/status|plan|upgrade` | Yes (super admins only) |
| Documents | `/documents` | Client | Implemented | `/api/documents` | **Hidden** |
| Communications | `/communications` | Client | Implemented | `/api/communications` | **Hidden** |
| Campaigns | `/campaigns` | Client | Implemented | `/api/communications/campaigns` | **Hidden** |
| Audit Trail | `/audit` | Client | Implemented | `/api/audit` | **Hidden** |
| Consents | `/consents` | Client | Implemented | `/api/consents` | **Hidden** |
| Waitlist | `/waitlist` | Client | Implemented | `/api/waitlist` | **Hidden** |
| Print Receipt | `/print/receipt/[invoiceId]` | Server | Implemented | Prisma (org-scoped) | n/a |
| Print Prescription | `/print/prescription/[id]` | Server | Implemented | Prisma (org-scoped) | n/a |
| Landing | `/` | Server | Static | none | n/a |
| Auth | `/login`, `/signup`, `/forgot-password`, `/verify-email`, `/reset-password` | Server → Client forms | Implemented | `src/components/auth/*` | n/a |
| Suspended | `/suspended` | Server | Static | none | n/a |
| Patient Login / Portal | `/patient-login`, `/patient-portal` | Client | Implemented (some portal buttons non-functional) | `/api/patient-auth/login`, `/api/patient-portal/overview`, `/api/patient-auth/logout` | n/a |

**Page implementation status (from scan of all 39 `page.tsx`):** 31 Implemented, 3 Partial (`/help`, `/billing`, and dashboard's hardcoded stat tiles), 5 Static/entry (`/`, `/suspended`, auth pages). No placeholder "under construction" pages exist.

### Modules from the original vision that have NO dedicated page
- **Prescriptions list** — exists only as records + print page; no module page (authoring is inside the Encounters workspace).
- **Lab Orders list** — aggregated into `/labs`; no standalone orders page.
- **Insurance Claims** — `InsurancePolicy` + `InsuranceClaim` models exist (schema lines 567/579); only exposed as a hardcoded `claimsPending: 0` card on `/billing`. No list/CRUD page.
- **Feedback/Surveys** — `FeedbackSurvey` model exists (schema line 695); no page at all.
- **Clinical follow-ups / diagnoses / procedure orders** — embedded entirely in the Encounters workspace; no standalone views.

---

## 2. Routes Analysis

### 2a. Accessible routes (all work)
27 authenticated app routes + 5 print/portal routes + 6 public auth/landing routes (listed above). The middleware (`src/proxy.ts`) protects everything except: `/`, `/login`, `/signup`, `/forgot-password`, `/verify-email`, `/reset-password`, `/patient-login`, `/patient-portal`, and unknown assets — so **every dashboard/settings/super route is behind a session check**.

### 2b. Routes reachable by URL but missing from the sidebar (orphaned)
`/documents`, `/communications`, `/campaigns`, `/audit`, `/consents`, `/waitlist`, `/print/receipt/[invoiceId]`, `/print/prescription/[id]`. The header-title registry (`routeTitleKeys` in `src/components/ui/dashboard-with-collapsible-sidebar.tsx`) **does** include keys for `/documents`, `/communications`, `/campaigns`, `/audit`, `/consents`, `/waitlist` — i.e. the titles exist, but the sidebar navigation items were never added. These pages are only reachable by typing the URL (or via notifications/links).

### 2c. Routes that need modification (per module audit)
- `/billing` — summary cards (`totalRevenue`, `outstanding`, `claimsPending`) are hardcoded `$0`/`0`; should come from `/api/billing/*` aggregate. (Needs the original + payments data.)
- `/help` — hardcoded English; contact submit is a "would integrate with support API" placeholder.
- `/dashboard` — `avgWait: "14 min"`, `+12%/+4%/+2%/−2%` changes, and quick stats `92% / 4.2% / 8.7/mo` are hardcoded; "View all" activity link points to `href="#"`.
- `/patients/[id]` — implemented server-side timeline; partial data (baseline of key events) — full vitals graphs/lab chart history not yet drawn.
- `/patient-portal` — "Book Appointment", "View Medical Records", "Message Provider", "Update Profile" buttons have no handlers.

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

### Current structure

**Overview** (`nav_overview`) — Dashboard *(all)* · Patients `[Doctor, Nurse, Receptionist, Biller, Pharmacist, Care Coordinator]` · Appointments `[Doctor, Nurse, Receptionist, Care Coordinator]` · Queue `[Doctor, Nurse, Receptionist, Care Coordinator]` · Encounters `[Doctor, Nurse, Care Coordinator]` · Analytics `[Doctor, Biller, Care Coordinator]` · Automation *(all)*

**Operations** (`nav_operations`) — Billing `[Biller]` · Payments `[Biller]` · Labs `[Doctor, Nurse, Pharmacist, Care Coordinator]` · Inventory `[Pharmacist, Nurse, Receptionist]` · Tasks `[Doctor, Nurse, Receptionist, Biller, Pharmacist, Care Coordinator]`

**System** (`nav_system`) — Plan & Usage *(all)* · Reports `[Doctor, Biller]` · My Availability `[Doctor, Nurse]` · Branches & Rooms `[Receptionist, Care Coordinator]` · Catalogs *(all)* · Settings *(all)* · Help *(all)* · **Super Admin** `/super` appended only when `isSuperAdmin`

### Findings
1. **Six items are never hidden** (no role filter): Dashboard, Automation, Plan, Catalogs, Settings, Help. That is likely intentional (Staff/Settings are shared), but means a Pharmacist or Biller sees Plan/Usage and Automation despite role-restricted peers.
2. **Inconsistent role windows across related features:**
   - Inventory excludes **Doctors** but includes Nurses/Pharmacists/Receptionists — while Labs (same clinical supply chain) excludes Receptionists/Billers. A Doctor sees Labs but not Inventory; a Receptionist sees Inventory but not Labs.
   - Reports (`[Doctor, Biller]`) excludes Nurses/Pharmacists/Receptionists/Care Coordinators, while Analytics (`[Doctor, Biller, Care Coordinator]`) excludes Nurses/Pharmacists/Receptionists — metrics visibility is not aligned.
   - Branches & Rooms restricted to `[Receptionist, Care Coordinator]`, so a Doctor refreshing their own availability screen cannot see room assignment info even though the Encounters workspace assigns rooms.
3. **Corporate-role support is asymmetric:** the sidebar supports `Nurse`/`Pharmacist`/`Receptionist` role names, but the seed data (§5) contains **no** `Nurse`, `Receptionist`, `Pharmacist`, or `Owner` Role records — only `Super Admin`, `Doctor`, `Care Coordinator`, `Biller`. So those sidebar entries are effectively dead code until roles are seeded/created.
4. **Naming drift:** the sidebar exposes "Care Coordinator", but `User.role` denormalization uses `receptionist` (seed), producing `ops@acmeclinic.com`: `role="receptionist"` + RBAC `Care Coordinator`. Two vocabularies for one person.
5. **Orphaned routes unreachable from navigation** (§2b): Documents, Communications, Campaigns, Audit Trail, Consents, Waitlist — full pages exist (with header titles) but no nav entry, so users cannot discover them.
6. **No icon/order for Patient Portal** — the portal is a separate app surface (own login), correctly not in the staff sidebar.

### Recommended sidebar decisions (future, not applied)
- Add the six orphaned modules into groups (e.g. Overview: Audit Trail, Consents; Operations: Documents, Communications, Campaigns; System: Waitlist under Queue) or decide to remove them.
- Align role arrays per module pair (Labs↔Inventory, Reports↔Analytics, Locations↔Availability).
- Replace "Care Coordinator" confusion by either renaming the Role to "Receptionist" in seed/sidebar or keep CC but update `User.role` mapping accordingly.

---

## 4. Dashboards & Widgets

### 4a. `/dashboard` (client, `src/app/(dashboard)/dashboard/page.tsx`)
Data comes from `MedicalContext` (`src/context/MedicalContext.tsx`), which on mount hits `GET /api/patients` and `GET /api/appointments` in parallel (no dashboard-specific API).

Widgets:
1. **Hero careboard** — live queue count, today's visits, "low no-show" momentum (2/3 values real from context; "momentum" is cosmetic).
2. **Stat cards (4)** — Total patients (real), Appointments today (real), Active encounters (real: status confirmed/"in waiting room"), **Average wait "14 min" hardcoded**; deltas `+12%/+4%/+2%/-2%` hardcoded.
3. **Recent Activity feed** — fabricated client-side: first 3 patients + first 2 appointments + 2 fake "system update / care campaign" entries. **Not a real activity/audit feed.**
4. **Quick Stats** — retention `92%`, no-show `4.2%`, visit frequency `8.7/mo` — **all hardcoded**.
5. **Upcoming appointments** — real (next 5, sorted by start time from context).
6. **Recent patients table** — real (first 5), with profile sheet + Add Patient dialog.

### 4b. `/analytics` (client, `src/app/(dashboard)/analytics/page.tsx`)
Fetches `GET /api/analytics/dashboard` (`{kpis}`) once on mount. Widgets: 4 KPI cards (active patients, appointments today, encounters this month, avg visit min) + operational metric grid (completion %, no-show %, revenue this month, outstanding balance). All from the one API; `averageVisitMinutes`/rates are computed server-side. API has **no permission check** (§6).

### 4c. Gaps
- No real activity/feed endpoint backing the dashboard feed; no notifications integration (the bell menu reads `Notification` model links, separate).
- Dashboard has no branch filter and mixes the whole organization's appointments into "today".
- Analytics lacks time-range controls, charts, per-provider breakdowns; it is a KPI board only.

---

## 5. RBAC & Authorization Audit

### 5a. How it works today
- **Two parallel models:** denormalized `User.role` string (`superAdmin|owner|doctor|receptionist|biller` — `prisma/schema.prisma:98`) **and** RBAC `UserRole → Role → RolePermission` (schema lines 114/125/134).
- **Session roles** come from `src/auth.ts` `authenticateUser`: org status must be `active` (else login blocked), user attached; `session.roles` = names of RBAC Roles via `userRoles`.
- **Server guards:**
  - `requireSuperAdmin()` (`src/lib/roles.ts`) — user must have `User.role === "superAdmin"` **AND** an RBAC role named "Super Admin". Used by `/super` page + `/api/super/*`.
  - `requireOwner()` — `User.role === "owner"` or RBAC name "Owner". Used only by `/plan` (sets `isOwner`, does **not** block — non-owners still view the page; upgrade actions presumably gated in `PlanDashboard`). No "Owner" role record is seeded.
  - API tenant gate `requireOrgContext()`/`getOrgId()` (`src/lib/org.ts`) blocks every org-scoped API without a valid `organizationId`.
  - Permission level: `hasPermission`/`hasAnyPermission` (`src/lib/auth.ts`) with `Super Admin` short-circuit and resource*-wildcard `resource:null`; wrapped by `requireAnyPermission(orgId, [...])` (`src/lib/authorization.ts`) returning a 403 `NextResponse`.
- **Where permission checks are actually applied:** only `/api/appointments` POST/PATCH (`appointments:write`), `/api/audit` GET (any of `patients:read|encounters:read|billing:read`). That's it.

### 5b. Seed vs. system
From `prisma/seed.js` (org "مركز الإسكندرية الطبي" + platform org "إدارة المنصة"):

| Seeded login | `User.role` | RBAC Role(s) | Permissions granted |
|---|---|---|---|
| `superadmin@acmeclinic.com` | `superAdmin` | Super Admin (10 perms) | all read/write (patients, appointments, encounters, inventory, billing) |
| `admin@acmeclinic.com` | `doctor` | Doctor | 14 perms incl lab/add-on/pharmacy |
| `ops@acmeclinic.com` | `receptionist` | Care Coordinator | 14 perms incl lab/clinical |
| `billing@acmeclinic.com` | `biller` | Biller | patients:read, appointments:read, billing:read, billing:write |

- **Super Admin role exists only in the platform org** ("إدارة المنصة"); clinic org users get Doctor/CC/Biller.
- **No seeded Nurse, Receptionist, Pharmacist, Owner, or Patient RBAC roles** — sidebar supports those names; data does not.
- `User.role` vocabulary (`doctor`, `receptionist`) does not match RBAC names (`Doctor`, `Care Coordinator`) — two sources of truth in code.
- Patient portal uses a separate `PatientSession` token path (`/api/patient-auth/*`) — patients are `Patient` records with passwords, not `User` rows; portal session is a signed HTTP-only cookie, not a NextAuth session.

### 5c. RBAC gaps
1. **Layout-only enforcement:** the entire `(dashboard)` tree is gated only by `auth()` (+ org-suspended redirect) in `src/app/(dashboard)/layout.tsx`. All client pages under it inherit that, but **none** check roles/permissions themselves.
2. **Page gating by role is cosmetic:** sidebar `roles` arrays are pure UI. Any authenticated staff member (incl. Biller) can open `/patients`, `/encounters`, `/analytics`, `/billing`, `/documents`, `/consents`, etc. by URL.
3. **GET endpoints generally unguarded by permission** (§6) — the API layer is org-scoped but not role-aware for reads, so the cosmetic sidebar is the only role filter in the whole stack.

---

## 6. Security Findings

Severity Triage:
- **[HIGH] Role-based access control is frontend-only.** Sidebar hides items by role name (client), but there is no server-side permission gate on most dashboard pages or their GET endpoints. Direct URL navigation sidesteps the sidebar. (Mitigating factor: all queries are org-scoped via `organizationId`, so an attacker staff account stays inside their own org.)
- **[HIGH→MED] Permission checks applied to only 2 API surfaces** (`/api/appointments` write ops, `/api/audit`). Verdict on the highest-value read surfaces — `/api/patients`, `/api/encounters`, `/api/analytics/dashboard`, `/api/billing/invoices`, `/api/documents`, `/api/consents`, `/api/waitlist`, `/api/labs` — is **no permission check; session + org scope only**.
- **[MED] Analytics endpoint exposes org-wide finances to any staff role** — `/api/analytics/dashboard` returns revenue + outstanding balance to every authenticated user (incl. Biller/Pharmacist) with zero permission check and no write-gating.
- **[MED] Wire-level authorization vs trust:** actions guarded by `requireAnyPermission` (appointments POST/PATCH, audit GET) rely on `hasAnyPermission`, which is per-request correct; but a Biller creating appointments would be **blocked even though the sidebar lets Biller see Appointments page** (Biller lacks `appointments:write`) → UX mismatch (see §7).
- **[LOW] Dual auth pathways complexity** — NextAuth (staff) + `PatientSession` (portal). Risk of confusion in ownership; portal overview endpoint must always assert the token maps to the same patient/org (it does today via orgId from token).
- **[LOW] Patient portal buttons are inert** — "Book Appointment / Message Provider" have no handlers; a patient cannot actually book, so no SSRF/booking abuse surfaces yet, but must be permission-checked when built.
- **[INFO] Hardcoded metrics are misleading** — dashboard "14 min", retention/no-show percentages, billing `$0` summaries, and analytics deltas are placeholders; stakeholders may act on fabricated numbers.
- **[INFO] Environment hygiene:** `.vercelignore` now excludes `.env` (the earlier root cause of the production login loop — `NEXTAUTH_URL=http://localhost:3000` was baked into the middleware bundle); `NEXTAUTH_SECRET`/`AUTH_SECRET` are set in Vercel. Credentials are not committed to git.

---

## 7. UI Inconsistencies Introduced by Recent Module/Naming Changes

- **Stale default-route text in the login form:** `src/components/auth/login-form.tsx:~175` shows "Default route: **Analytics**" (`t["nav_analytics"]`), but post-login routing now lands on `/dashboard`. Cosmetic, but confusing.
- **Sidebar role mismatch with actual role behavior** (see §5): Biller sees Appointments/Patients pages in the sidebar yet is denied `appointments:write` server-side — no inline warning/graceful "forbidden" state exists; the page renders and the action silently 403s or simply isn't offered.
- **Multi-cycle confusion in screens/composites:**
  - `Dashboard` mixes real numbers (patients, appts) with fake ones (14 min, 92%) in the same visual language — users can't tell which is live.
  - `Billing` shows real invoice rows next to hardcoded `$0` summaries.
  - `/locations` merges Branches AND Rooms into one nav item label ("Branches & rooms") even though they are two data sets.
- **Localization:** `/help`, `/campaigns`, `/communications`, `/consents`, `/documents` are hardcoded English while the rest of the app is bilingual (en/ar via `useLocale`); `/documents`/`/consents` include neither `useLocale` nor `getDictionary`.
- **Orphan-route titles:** header shows real titles for `/documents`, `/communications`, `/campaigns`, `/audit`, `/consents`, `/waitlist` but there is no nav item → pages look "hidden on purpose" while actually being fully built.

---

## 8. New Modules Recommendation (future backlog, not applied)

Given the current gaps, the highest-value next modules, in order of appear-to-user-value:

1. **Doctor/Role Dashboard** — parameterize `/dashboard` by role: clinical view (today's appointments, encounters, vitals flag) for Doctor; ops view (queue/rooms) for Receptionist; revenue view for Biller. Removes the "one dashboard for everyone" mismatch with the original vision.
2. **Prescriptions & Lab Orders module pages** — move authoring/list/status out of the Encounter popover into dedicated `/prescriptions` and `/lab-orders` pages (stable links for print + patient portal).
3. **Insurance Claims module** — build the missing page over the existing `InsurancePolicy`/`InsuranceClaim` models; wire the hardcoded `claimsPending` card to real aggregates.
4. **Feedback/Surveys module** — new page over `FeedbackSurvey` (model already exists); link into portal "View Health Summary".
5. **Real activity/notification feed** — replace the fabricated Activity feed with a server feed from `AuditLog`/`Notification`; gives the dashboard honest data and lets the orphan pages (Audit Trail) share one source.
6. **Server-enforced permission checks** — retrofit `requireAnyPermission` on the read surfaces flagged in §6 (patients, encounters, billing, analytics, documents, consents) so the sidebar's role filtering actually means something.
7. **Sidebar cleanup** — decide the fate of the six orphaned routes (§3) and align role arrays for Labs/Inventory, Reports/Analytics, Locations/Availability.

---

## Recommended Next Step

**Implement server-side permission enforcement first** (recommendation #6): add `requireAnyPermission` guards to the read-only endpoints currently protected by session+org scope only (patients, encounters, billing, analytics/dashboard, documents, consents, labs, inventory, waitlist, tasks, queue, communications, campaigns, settings, branches/rooms, catalog). It is the single change that converts the current cosmetic role-based sidebar into real RBAC, closes the HIGH-severity frontend-only finding, and unblocks safe delivery of the future dashboard/prescriptions/claims modules — without touching the UI.

Follow-up tasks locked to this audit, in order:
1. Lock the permission matrix (action/resource per module) in one table and mirror it to the `RolePermission` seed.
2. Apply the guards above to the flagged routes.
3. Then fix the cosmetic/UI inconsistencies (§7: stale "Analytics" default-route text, hardcoded billing `$0`/`14 min` stats, English-only pages, orphan-route nav items).

*This audit modified only this document. No source files, schemas, seeds, permissions, or deployment settings were changed.*