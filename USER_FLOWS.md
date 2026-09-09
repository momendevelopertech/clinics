# User Flow Guide — Healthcare CRM

This document maps the end-to-end user journeys for each role in the platform and shows how each account type enters the system, what pages they can access, and what actions they are expected to perform.

## 1. Entry points and authentication model

The system has two main identity domains:

1. Staff users (clinic employees and platform admins)
   - Login through `/login`
   - Authenticated by NextAuth
   - Role-based access enforced by the dashboard proxy and API guards

2. Patients
   - Login via `/patient-login`
   - Use a separate patient session flow
   - Access the patient portal only through the patient-specific area

### Core auth flows

- Public landing page: `/`
- Staff login: `/login`
- Sign-up: `/signup`
- Forgot password: `/forgot-password`
- Verify email: `/verify-email`
- Reset password: `/reset-password`
- Patient login: `/patient-login`
- Patient portal: `/patient-portal`
- Admin console: `/super`
- Clinic dashboard: `/dashboard`

---

## 2. User roles in the system

| Role | Type | Main purpose | Main entry area |
|---|---|---|---|
| Super Admin | Platform | Global management, org approvals, platform oversight | `/super` |
| Owner | Clinic | Full clinic administration | `/dashboard` |
| Doctor | Clinic | Clinical patient and encounter work | `/dashboard` |
| Receptionist / Care Coordinator | Clinic | Front desk, schedule, waitlist, coordination | `/dashboard` |
| Nurse | Clinic | Patient care, vitals, encounters, inventory read | `/dashboard` |
| Biller | Clinic | Billing and payment workflows | `/dashboard` |
| Pharmacist | Clinic | Inventory and pharmacy operations | `/dashboard` |
| Patient | Portal | Personal portal, appointment and record access | `/patient-portal` |

---

## 3. Shared staff flow

### Staff login flow

1. User lands on `/`
2. Chooses staff login or uses demo login buttons
3. Enters email and password on `/login`
4. NextAuth validates credentials
5. Session is created and user is redirected to `/dashboard`
6. Proxy guards check the user role and route permissions
7. Sidebar displays only approved navigation items

### Staff dashboard flow

1. User enters `/dashboard`
2. System loads real data from context/API
3. Dashboard displays:
   - active patients
   - appointments
   - queue and waitlist
   - quick operational metrics
4. User clicks a navigation item such as Patients, Appointments, Encounters, Billing, Settings, or Reports
5. Route-level and API-level permissions decide whether access is allowed

---

## 4. Super Admin flow

### Goal
The platform owner manages multi-tenant organizations and system-wide approvals.

### Flow
1. Super Admin logs in through `/login`
2. User is recognized as having both:
   - RBAC role `Super Admin`
   - denormalized `User.role = "superAdmin"`
3. System redirects to `/super`
4. Super Admin can access platform console screens such as:
   - org list
   - org status controls
   - plan approval/upgrade actions
   - audit and platform metrics
5. Super Admin can approve or manage clinics without becoming a clinic owner
6. Super Admin is not treated as a normal clinic role in app routes

### Typical actions
- review organizations
- monitor plan requests
- upgrade orgs
- manage platform-level approval workflows
- supervise platform audit logs

---

## 5. Owner flow

### Goal
Owner is the clinic-level administrator who controls the full clinic setup.

### Flow
1. Owner logs in through `/login`
2. Redirected to `/dashboard`
3. Owner sees full clinic sidebar
4. Can access:
   - Patients
   - Appointments
   - Encounters
   - Billing
   - Inventory
   - Tasks
   - Reports
   - Settings
   - Plan
   - Branches / rooms / location management
   - staff management and role assignment
5. Owner can configure clinic-wide settings and manage staff permissions
6. Owner can access restricted pages like `/settings` and `/plan`

### Typical actions
- create/update staff profiles
- assign roles
- configure org settings
- review billing and operational metrics
- manage memberships and plan status
- manage patient and appointment workflows end-to-end

---

## 6. Doctor flow

### Goal
The doctor works mainly on clinical task execution and patient care.

### Flow
1. Doctor logs in through `/login`
2. Enters `/dashboard`
3. Sees clinical tools and patient data access
4. Can access pages such as:
   - Patients
   - Appointments
   - Encounters
   - Labs
   - Documents
   - Reports
   - Analytics
   - Tasks
   - Availability
5. Doctor can create and update patient encounter data and clinical records
6. Doctor may review patient history and lab records as permitted

### Typical actions
- check patient schedule
- open patient chart
- add encounter notes
- review or upload documents
- work with lab results
- manage availability and clinical calendar

---

## 7. Receptionist / Care Coordinator flow

### Goal
Front desk and coordination work: scheduling, patient check-in, communication, waitlist, and operational support.

### Flow
1. Receptionist logs in through `/login`
2. Redirected to `/dashboard`
3. Has access to patient and scheduling modules
4. Can access pages such as:
   - Dashboard
   - Patients
   - Appointments
   - Queue
   - Consents
   - Tasks
   - Documents
   - Communications
   - Locations
   - Waitlist
5. This user is usually the one handling front-office coordination and patient flow

### Typical actions
- schedule appointments
- update patient contact info
- manage queue and waitlist
- coordinate patient intake
- communicate with patients or staff
- support operational handoff to clinicians

---

## 8. Nurse flow

### Goal
Support clinical operations and patient care execution.

### Flow
1. Nurse logs in through `/login`
2. Redirected to `/dashboard`
3. Can access patient, appointment, encounter, and care-management pages
4. Main pages include:
   - Patients
   - Appointments
   - Encounters
   - Labs
   - Inventory
   - Documents
   - Reports
   - Analytics
   - Tasks
5. Nurse usually works with patient care, intake, continuity, and inventory awareness

### Typical actions
- review patient cases and schedule
- update encounter details
- inspect lab and inventory availability
- document patient observations
- support patient treatment workflow

---

## 9. Biller flow

### Goal
Billing and payments workflows for clinic operations.

### Flow
1. Biller logs in through `/login`
2. Redirected to `/dashboard`
3. Access is focused on revenue and financial operations
4. Main pages include:
   - Dashboard
   - Patients
   - Appointments
   - Analytics
   - Billing
   - Payments
   - Audit
   - Reports
   - Tasks
5. Biller focuses on invoices, charges, reconciliation, and payment follow-up

### Typical actions
- open patient billing records
- generate or review invoices
- monitor payment status
- work with financial reports
- track billing audit history

---

## 10. Pharmacist flow

### Goal
Inventory and pharmacy handling, with limited clinical support access.

### Flow
1. Pharmacist logs in through `/login`
2. Redirected to `/dashboard`
3. Access is focused on medication and stock workflows
4. Main pages include:
   - Dashboard
   - Patients
   - Appointments
   - Labs
   - Inventory
   - Tasks
   - Catalogs
5. Pharmacist may view patient and appointment data needed to fulfill medication or stock tasks

### Typical actions
- view inventory stock
- manage pharmacy records and catalogs
- support medication-related workflow
- review lab-related information when needed

---

## 11. Patient flow

### Goal
Patients manage their own information and portal interactions without staff access.

### Flow
1. Patient opens `/patient-login`
2. User authenticates with patient-specific credentials
3. Patient is redirected to `/patient-portal`
4. Portal shows:
   - personal overview
   - appointment information
   - medical records or summaries
   - vitals/portal data where available
   - upcoming or current treatment views
5. Patient can view own records and check appointment condition
6. Patient session is isolated from clinic staff RBAC

### Typical actions
- sign in to portal
- view appointment history
- review healthcare overview
- access patient-specific record pages
- view personalized portal data

---

## 12. Route protection summary

The app uses a layered access model:

- public routes: landing pages and auth pages
- staff protected routes: clinic dashboard and admin pages
- patient protected routes: patient login and portal routes
- API-level permissions remain the real security boundary

### Example permission rule

- Owner can reach almost all clinic modules
- Doctor can reach clinical-related pages
- Receptionist has operational front-office access
- Biller has billing-only access
- Nurse has clinical support access
- Pharmacist has inventory and medication access
- Super Admin is platform-level only

---

## 13. Practical user journey examples

### Example A — Owner onboarding
1. Login as owner
2. Open `/dashboard`
3. Go to `/settings`
4. Configure clinic preferences
5. Navigate to staff management
6. Assign roles to other staff members
7. Review plan and operational metrics

### Example B — Doctor patient workflow
1. Login as doctor
2. Open `/patients`
3. Select a patient
4. Open encounters and notes
5. Review labs and documents
6. Update chart and plan care

### Example C — Receptionist scheduling workflow
1. Login as receptionist
2. Open `/appointments`
3. Create or edit appointment
4. Add patient to queue/waitlist if needed
5. Coordinate with doctor or nurse
6. Confirm patient intake and follow-up

### Example D — Patient self-service flow
1. Login at `/patient-login`
2. Open `/patient-portal`
3. Review appointments and overview
4. Check personal health information and portal updates
5. Log out safely

---

## 14. Final note

This project separates staff identity, patient identity, and platform-level administration. The principal rule is:

- staff users are governed by RBAC and route permissions
- patients use a dedicated patient session model
- Super Admin is platform-only and not a clinic role

That separation keeps the platform safe while allowing each user type to operate within a clear workflow.
