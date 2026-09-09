# User Flow Guide - OpenHealthCRM

This guide describes the supported journeys for each user type. The role and module names follow `ROLE_CAPABILITY_GUIDE.md`, which is the source of truth for clinic access. The sidebar controls what is shown for usability; server-side page and API guards enforce the actual authorization.

## 1. Identity and entry points

The platform has three identity surfaces:

1. **Clinic staff**
   - Sign in at `/login`.
   - Uses NextAuth and organization-scoped clinic access.
   - Starts at `/dashboard` after authentication.

2. **Platform administration**
   - Super Admin signs in at `/login` and is redirected to `/super`.
   - Requires both the RBAC role `Super Admin` and `User.role = "superAdmin"`.
   - Super Admin is a platform role, not a clinic role, and does not receive the clinic sidebar.

3. **Patients**
   - Sign in at `/patient-login`.
   - Uses the separate patient-session flow and enters `/patient-portal`.
   - Cannot use staff routes or staff RBAC sessions.

### Public and authentication routes

- Landing: `/`
- Staff login: `/login`
- Clinic signup: `/signup`
- Password recovery: `/forgot-password`, `/reset-password`
- Email verification: `/verify-email`
- Patient login: `/patient-login`
- Patient portal: `/patient-portal`
- Suspended organization page: `/suspended`

## 2. Role vocabulary

| Display name | Internal RBAC role | Scope | Main entry |
|---|---|---|---|
| Super Admin | `Super Admin` | Platform | `/super` |
| Owner | `Owner` | Clinic | `/dashboard` |
| Doctor | `Doctor` | Clinic | `/dashboard` |
| Receptionist | `Care Coordinator` | Clinic | `/dashboard` |
| Nurse | `Nurse` | Clinic | `/dashboard` |
| Biller | `Biller` | Clinic | `/dashboard` |
| Pharmacist | `Pharmacist` | Clinic | `/dashboard` |
| Patient | Patient session | Patient portal | `/patient-portal` |

**Receptionist naming rule:** Receptionist is the user-facing label. `Care Coordinator` is the persisted RBAC role. They are one clinic role, not two separate roles.

## 3. Shared staff journey

1. The user opens `/` or `/login`.
2. The user submits staff credentials.
3. NextAuth creates a session containing the user, organization, and RBAC roles.
4. The user is redirected to `/dashboard` unless the account is a Super Admin.
5. The proxy checks authentication and page-level access.
6. The sidebar shows the modules allowed for the user's displayed role.
7. API routes independently check organization scope and module/resource permissions.
8. A user may have read access without write access. A write request without permission returns `403`.

The dashboard provides organization-scoped operational data such as patients, appointments, queue information, and current metrics. It is a shared dashboard, not a separate role-specific dashboard.

## 4. Approved clinic access by role

The lists below describe the approved sidebar/module access. Access to a module does not automatically grant every write action inside it.

### Owner

**Purpose:** Full clinic administration.

**Modules:** All clinic modules, including Patients, Appointments, Queue, Encounters, Analytics, Consents, Audit, Billing, Payments, Labs, Inventory, Tasks, Documents, Communications, Campaigns, Plan, Reports, Availability, Locations, Catalogs, Settings, Automation, and Help.

**Can perform:** Manage clinic settings, staff and roles, branches and rooms, catalogs, plan ownership actions, patients, appointments, clinical operations, billing, and operational reporting according to the owner guards.

### Doctor

**Purpose:** Clinical care and patient records.

**Modules:** Dashboard, Patients, Appointments, Queue, Encounters, Analytics, Consents, Audit, Labs, Tasks, Documents, Reports, Availability, Catalogs, and Help.

**Typical actions:** Read and update permitted clinical information, document encounters and notes, review patient history and lab data, review documents, manage availability, and coordinate the clinical schedule.

**Boundary:** Doctor does not receive owner-only settings, staff administration, plan management, billing, payments, inventory administration, communications campaigns, or waitlist management by default.

### Receptionist (Care Coordinator)

**Purpose:** Front-desk operations and patient coordination.

**Modules:** Dashboard, Patients, Appointments, Queue, Consents, Tasks, Documents, Communications, Locations, Waitlist, and Help.

**Typical actions:** Create and update patients and appointments, manage queue and waitlist activity, coordinate intake, manage front-office documents and communications, and hand off information to clinical staff.

**Boundary:** Receptionist does not receive Encounters, Labs, Inventory, Billing, Payments, Reports, Analytics, Settings, Plan, or Catalog administration by default.

### Nurse

**Purpose:** Clinical support and care operations.

**Modules:** Dashboard, Patients, Appointments, Encounters, Analytics, Consents, Labs, Inventory, Tasks, Documents, Reports, Availability, Catalogs, and Help.

**Typical actions:** Review patients and appointments, update permitted encounter and care information, review labs, inspect inventory availability, document observations, and support clinical handoffs.

**Boundary:** Inventory and lab access includes the permissions granted to the role; clinic settings, staff administration, billing, payments, and plan ownership remain restricted.

### Biller

**Purpose:** Revenue, invoices, and payments.

**Modules:** Dashboard, Patients, Appointments, Analytics, Audit, Billing, Payments, Tasks, Reports, and Help.

**Typical actions:** Read patient and appointment information needed for billing, create or update invoices and payments where permitted, review financial metrics, and follow billing audit history.

**Boundary:** Patient and appointment access is primarily read-oriented. Biller does not receive clinical encounter, lab, inventory, settings, or plan administration access by default.

### Pharmacist

**Purpose:** Inventory and pharmacy operations.

**Modules:** Dashboard, Patients, Appointments, Labs, Inventory, Tasks, Catalogs, and Help.

**Typical actions:** Read the patient, appointment, and lab information needed for medication workflows, manage inventory and pharmacy records, and review catalog information.

**Boundary:** Patient and appointment access is read-oriented. Pharmacist does not receive encounter editing, billing, settings, or plan administration access by default.

## 5. Super Admin journey

1. Super Admin signs in through `/login`.
2. The system validates the `Super Admin` RBAC role and `User.role = "superAdmin"`.
3. The user is redirected to `/super`.
4. The platform console provides Organizations, Approvals, Billing, Audit, and Settings sections.
5. The Super Admin reviews organizations, statuses, plan requests, platform billing, and platform audit information.
6. The Super Admin does not become a clinic Owner and is not given the clinic sidebar.

All `/api/super/*` routes apply their own Super Admin guard.

## 6. Patient journey

1. The patient opens `/patient-login`.
2. The patient authenticates with patient-specific credentials.
3. The system creates a separate signed, HTTP-only patient session.
4. The patient enters `/patient-portal`.
5. The portal displays the patient's own overview, appointments, available lab results, and available vital information.
6. The patient can sign out through the patient session flow.

The portal is isolated from staff RBAC. Booking, messaging, profile editing, and some additional self-service functions remain explicitly unavailable or marked as coming soon where the current portal does not provide the corresponding workflow.

## 7. Authorization model

Authorization is layered:

- Public pages handle landing and authentication.
- The proxy protects authenticated pages and applies the approved page-level role map.
- Organization-scoped APIs resolve the authenticated organization.
- Module/resource permissions enforce read and write operations on the server.
- The sidebar is a usability filter, not a security boundary.

Opening a hidden route directly does not grant permission. The page may be redirected or its API calls may return `403`. A user may also see a page while specific write controls are unavailable because their role is read-only for that operation.

## 8. Practical journeys

### Owner onboarding

1. Sign in at `/login`.
2. Review `/dashboard`.
3. Configure `/settings`.
4. Manage staff, roles, branches, rooms, and catalogs.
5. Review `/plan` and operational reports.

### Doctor clinical visit

1. Sign in and open `/patients`.
2. Select a patient.
3. Review the patient timeline and appointment.
4. Open `/encounters` and document the visit.
5. Review labs and documents.
6. Update permitted clinical information.

### Receptionist scheduling

1. Sign in and open `/appointments`.
2. Create or update a patient and appointment.
3. Check the patient in or place the patient on `/queue` or `/waitlist`.
4. Manage consent, documents, and communications as permitted.
5. Coordinate the handoff to the clinical team.

### Biller payment follow-up

1. Sign in and open `/billing` or `/payments`.
2. Find the relevant patient or appointment.
3. Review or update invoice and payment information according to billing permissions.
4. Use `/reports` and `/audit` for permitted financial follow-up.

### Patient self-service

1. Sign in at `/patient-login`.
2. Review the portal overview and appointments.
3. Review available lab and vital information.
4. Sign out from the patient portal.

## 9. Known limitations for handoff

The following items are not described as completed user capabilities:

- Prescriptions and lab orders do not have separate standalone list pages; related workflows are embedded in Encounters or Labs.
- Insurance Claims and Feedback/Surveys do not currently have dedicated modules.
- The patient portal has disabled or coming-soon actions for workflows not yet implemented.
- Help remains a partial module, including its contact submission flow.
- The dashboard is shared rather than fully role-specific.
- Read-only and forbidden states can still be improved in some screens.

These limitations should remain visible in the client handoff notes until the corresponding product decisions and implementation work are complete.

## 10. Source of truth

- Role and module capability model: `ROLE_CAPABILITY_GUIDE.md`
- System and sidebar audit: `SYSTEM_SIDEBAR_AUDIT.md`
- Page-level access map: `src/proxy.ts`
- Module access fallback and role matrix: `src/lib/permissions.ts`
- Display label translation: `src/lib/role-labels.ts`
