# Patient Access Model

A patient is a **separate identity type** — not a staff `User` and never a clinic `Role`. Patients authenticate with their own session cookies; they are intentionally isolated from the staff app.

This document is evidence-based: every claim maps to code in this repo at the time of writing.

## Identity model

- `Patient` rows belong to exactly one `Organization` (`organizationId`, `prisma/schema.prisma:213`).
- Portal credentials live on the patient row itself: `email`, `mrn` (unique), `passwordHash` (`schema.prisma:217-233`). There is **no `User` row and no RBAC role** for patients.
- Sessions are `PatientSession` rows: server stores only a SHA-256 `tokenHash` of the raw bearer token (`src/lib/patient-auth.ts:4`). Raw tokens are never persisted.
- Source of truth for demo portal patients: `scripts/seed-demo-tenants.js` (`ensurePatient`, portal patients get `passwordHash`) and `src/lib/demo-accounts.ts` (`DEMO_PATIENTS`/`DEMO_TENANTS`).

## Session rules

- Token source: `Authorization: Bearer <token>` **or** the `patient_session` cookie (`getPatientSessionFromRequest`, `src/lib/patient-auth.ts:75`).
- A session is valid only if all of the following hold (`findActivePatientSession`, `src/lib/patient-auth.ts:53`):
  - `revokedAt IS NULL` — logout sets `revokedAt` (`logout/route.ts:8`).
  - `expiresAt > now` — default lifetime 24h (`patient-auth.ts:19`).
  - The patient's `organization.status === "active"` — suspended/pending tenants lose access instantly.
- Login sets an HTTP-only, `sameSite: "lax"`, `secure`-in-prod cookie with the session expiry (`login/route.ts:70-76`).
- Logout is idempotent: it always clears the cookie and revokes the session if one exists (`logout/route.ts:10-20`).
- `POST /api/patient-auth/login` is rate-limited to 5 req/min per IP (`src/lib/rate-limit.ts:68-75`) and returns generic `"Invalid credentials"` for missing/wrong email+MRN+password or inactive org — it never reveals whether an account exists (`login/route.ts:29-47`).

## Allowed routes

| Route | Method | Auth | Data |
| --- | --- | --- | --- |
| `/api/patient-auth/login` | POST | public (rate-limited) | creates session + cookie |
| `/api/patient-auth/logout` | POST | any valid patient session | revokes session |
| `/api/patient-auth/me` | GET | valid patient session | own identity + expiry |
| `/api/patient-portal/overview` | GET | valid patient session | own appointments / lab results / latest vital |
| `/api/vitals/stream?patientId=` | GET (SSE) | valid **patient** session *or* staff w/ `patients:read`/`encounters:read` | latest vital snapshot |

Pages: `/patient-login` (public), `/patient-portal` (public page, data loads client-side from the routes above), `/demo-accounts` (public dev page).

## Ownership checks

- Every portal data route anchors on `session.patient.id` — the client cannot select another patient.
- `/api/patient-portal/overview` queries appointments, lab results, and vitals **only** by `patientId = session.patient.id` (`overview/route.ts:15-32`).
- `/api/vitals/stream` accepts a `patientId` param, but for patient sessions it rejects any `patientId` that does not equal the session's patient with 403 (`stream/route.ts:22-25`). Staff access uses the staff tenant scope path.
- There is deliberately no patient-facing route that takes a patient id as a path/query parameter and returns that patient's data.

## Organization checks

- Organization scoping is enforced via the session's patient → organization relation. `findActivePatientSession` requires the org to be active, and every portal route resolves the patient through that session, so cross-tenant access is impossible by construction.
- Staff routes keep their own org scoping (`getOrgId()` + `assertOrgScope` + `requireModulePermission` in `src/proxy.ts` / API routes). Patient sessions never satisfy staff guards; conversely `/api/auth` (NextAuth / staff) never accepts a patient session token.

## Read-only permissions (what a patient can do)

A patient session grants **read access to its own data only**:

- See own profile, appointments, lab results, and latest vital in `/patient-portal`.
- Subscribe to own vitals stream.
- Create (`login`) and revoke (`logout`) **its own** sessions.

There are no patient write routes for clinical or billing data (see README patterns under `src/app/api/patient-portal/*`).

## Forbidden staff access

A patient session cannot reach staff endpoints or pages:

- Staff auth is NextAuth (`next-auth`), a different token/session namespace with its own JWT (`getToken` in `src/proxy.ts:102`).
- `/api/auth/*`, staff API routes, `/dashboard`, `/patients`, `/appointments`, `/encounters`, `/queue`, `/labs`, `/billing`, `/payments`, `/inventory`, `/settings`, `/plan`, `/super`, `/audit`, `/reports`, `/analytics` etc. all require staff auth or staff RBAC permissions.
- Proxy protects staff pages/APIs; the patient portal prefixes happen to be public at the proxy because they self-authenticate per request (`src/proxy.ts:18-30`). No patient identity can spawn a staff session.

## Known unavailable portal actions

- Book/reschedule/cancel appointments — disabled, "coming soon" in UI.
- Contact provider ("message provider") — disabled.
- View full medical records / health summary — disabled.
- Update own profile — disabled.
- No patient-facing billing/payment, prescriptions refills, or document downloads exist yet.

These are intentional boundaries: the portal is read-only today, and disabled actions may be delivered later without relaxing the ownership/org checks above.