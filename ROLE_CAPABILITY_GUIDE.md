# Role Capability Guide — OpenHealthCRM

**Status:** Final state after Parts A, B, and C (2026-09-08)
**Scope:** Clinic roles, the approved sidebar, and the enforcement and demo-seed
behavior that backs it.

## 1. Role model

There are six clinic roles:

| Displayed role | Persisted RBAC role | Purpose |
|---|---|---|
| Owner | `Owner` | Full access to the clinic |
| Doctor | `Doctor` | Clinical access |
| Receptionist | `Care Coordinator` | Scheduling and front-desk coordination |
| Nurse | `Nurse` | Clinical support and inventory/lab read access |
| Biller | `Biller` | Billing and payment operations |
| Pharmacist | `Pharmacist` | Inventory, pharmacy, and lab read access |

**Receptionist is a display label only.** The role persisted in `Role.name` and
assigned through `UserRole` is `Care Coordinator`. The denormalized
`User.role` value for this account is `receptionist`. Role matching and the
sidebar translate `Care Coordinator` to `Receptionist` where required.

`Super Admin` is not a clinic role. It is a platform account role and is
limited to the platform console described in §4.

## 2. Approved sidebar matrix

`✓` means the item is shown in the clinic sidebar. Owner is intentionally
granted every clinic item. The Receptionist column represents the persisted
`Care Coordinator` role.

| Sidebar item | Owner | Doctor | Receptionist | Nurse | Biller | Pharmacist |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Patients | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Appointments | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Queue | ✓ | ✓ | ✓ | ✓ | — | — |
| Encounters | ✓ | ✓ | — | ✓ | — | — |
| Analytics | ✓ | ✓ | — | ✓ | ✓ | — |
| Consents | ✓ | ✓ | ✓ | ✓ | — | — |
| Audit | ✓ | ✓ | — | — | ✓ | — |
| Billing | ✓ | — | — | — | ✓ | — |
| Payments | ✓ | — | — | — | ✓ | — |
| Labs | ✓ | ✓ | — | ✓ | — | ✓ |
| Inventory | ✓ | — | — | ✓ | — | ✓ |
| Tasks | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Documents | ✓ | ✓ | ✓ | ✓ | — | — |
| Communications | ✓ | — | ✓ | — | — | — |
| Plan | ✓ | — | — | — | — | — |
| Reports | ✓ | ✓ | — | ✓ | ✓ | — |
| Availability | ✓ | ✓ | — | ✓ | — | — |
| Locations | ✓ | — | ✓ | — | — | — |
| Catalogs | ✓ | ✓ | — | ✓ | — | ✓ |
| Settings | ✓ | — | — | — | — | — |
| Waitlist | ✓ | — | ✓ | — | — | — |
| Help | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

The sidebar is a usability filter, not a security boundary. A user can
manually request a route that is not shown, but the route's server/API guards
still apply.

## 3. Server enforcement

### Clinic modules and APIs

Org-scoped API routes resolve the organization from the authenticated session
before accessing data. Module routes use
`requireModulePermission(organizationId, module, action)`, which delegates to
`requireAnyPermission` and returns HTTP 403 when the required permission is
missing. Read and write checks use `<module>:read` and `<module>:write`.

`ROLE_MODULE_ACCESS` in `src/lib/permissions.ts` is the module-access
allow-list used by the final role model. It is also used by the demo seed:

| RBAC role | Seeded modules |
|---|---|
| Owner | All clinic modules |
| Doctor | Dashboard, Patients, Appointments, Queue, Encounters, Analytics, Consents, Audit, Labs, Tasks, Documents, Reports, Availability, Catalogs, Help |
| Care Coordinator (displayed Receptionist) | Dashboard, Patients, Appointments, Queue, Consents, Tasks, Documents, Communications, Locations, Waitlist, Help |
| Nurse | Dashboard, Patients, Appointments, Encounters, Analytics, Consents, Labs, Inventory, Tasks, Documents, Reports, Availability, Catalogs, Help |
| Biller | Dashboard, Patients, Appointments, Analytics, Audit, Billing, Payments, Tasks, Reports, Help |
| Pharmacist | Dashboard, Patients, Appointments, Labs, Inventory, Tasks, Catalogs, Help |

The read path has an intentional **legacy role fallback**. If a legacy clinic
does not yet have the new module permission rows, `requireModulePermission`
checks the user's RBAC role name against `ROLE_MODULE_ACCESS`; denormalized
`owner` and `superAdmin` users are also recognized. This avoids requiring a
data migration. Write checks continue to require the normal permission path.

Owner-only operations (including staff, settings, branches/rooms, catalog
administration, plan ownership actions, and upgrade requests) use
`requireOwner`. Owner means the `Owner` RBAC role or the denormalized owner
flag; it is not a synonym for platform administration.

The seeded resource-action grants that complement the module list are:

| Role | Additional resource actions |
|---|---|
| Owner | Read/write patients, appointments, encounters, inventory, billing, lab, and pharmacy; read/write staff |
| Doctor | Read/write patients, appointments, encounters, and lab |
| Care Coordinator (displayed Receptionist) | Read/write patients and appointments |
| Nurse | Read/write patients, appointments, and encounters; read inventory and lab |
| Biller | Read patients and appointments; read/write billing |
| Pharmacist | Read patients, appointments, and lab; read/write inventory |

### Proxy page guards

`src/proxy.ts` applies the approved page-level guard map before rendering
clinic pages. The guarded pages are:

- Owner: `/plan`, `/settings`, `/automation`, `/campaigns`
- Doctor, Nurse, Receptionist: `/queue` (Receptionist is the displayed
  Care Coordinator role)
- Doctor, Nurse: `/encounters`, `/availability`
- Doctor, Nurse, Biller: `/analytics`, `/reports`
- Doctor, Nurse, Receptionist: `/consents`
- Doctor, Biller: `/audit`
- Doctor, Nurse, Pharmacist: `/labs`, `/catalogs`
- Doctor, Nurse, Receptionist, Biller, Pharmacist: `/tasks`
- Doctor, Nurse, Receptionist: `/documents`
- Receptionist: `/communications`, `/locations`, `/waitlist`
- Biller: `/billing`, `/payments`
- Nurse, Pharmacist: `/inventory`

Owner and Super Admin bypass the clinic page map. APIs remain authoritative
even for pages that are reachable by URL.

## 4. Super Admin platform access

Super Admin is platform-only. A valid platform account must have both:

1. the RBAC role `Super Admin`, and
2. the denormalized `User.role === "superAdmin"` flag, with an active user.

`requireSuperAdmin` enforces both conditions for `/super` and every
`/api/super/*` route. The platform sidebar contains only these `/super`
sections:

- Organizations
- Approvals
- Billing
- Audit
- Settings

The proxy redirects an authenticated Super Admin away from clinic pages to
`/super` (API requests are handled by their own guards). Super Admin does not
receive the clinic sidebar merely because the RBAC permission short-circuit
allows permission checks.

## 5. Demo tenants and seed command

The public demo data is created by the separate additive script:

```bash
npm run db:seed:demo
# equivalent: node scripts/seed-demo-tenants.js
```

This script is deliberately separate from `prisma/seed.js`. It creates or
updates exactly two demo clinics:

- **Harborview Family Clinic** — Seattle, United States
- **Northstar Wellness & Pediatrics** — Denver, United States

Each clinic receives six staff accounts—Owner, Doctor, Receptionist,
Nurse, Biller, and Pharmacist. The Receptionist account is assigned the
persisted `Care Coordinator` RBAC role and is displayed as Receptionist.
The stable account prefixes are `owner`, `doctor`, `reception`, `nurse`,
`biller`, and `pharmacist` at each clinic's demo email domain. The demo
password is `DemoClinic!2026`.

The script seeds the role module permissions listed in §3 plus representative
clinic data: a branch and room, four patients, service and clinical catalogs,
past and upcoming appointments, an encounter with vitals/diagnosis/note,
lab order and result, prescription, invoices and payment, inventory and
transaction data, task, waitlist entry, consent, document, communication, and
campaign.

The demo seed is **additive and idempotent**. It uses stable slugs, emails,
MRNs, content markers, and idempotency keys; it does not delete existing rows.
No schema migration is required for Parts A, B, or C.
