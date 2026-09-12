# User Story — Prescriptions (الروشتات)

> OpenHealthCRM · Module: `prescriptions` (API gated under the `labs` module key)
> Status: **Implemented end-to-end** (backend + UI) — 2026-09-12
> Audience: product owner / developers. This file is the single reference for *where* the
> feature lives, *how* it works, and *what the user can do* at every step.

---

## 1. The user story (what the doctor experiences)

> **As a** doctor (or nurse/pharmacist),
> **I want to** write a prescription (روشتة) for a patient in a couple of taps,
> **so that** the patient walks out with a printable, sendable medication sheet and the
> pharmacy/doctor's records have a permanent, audited copy.

**Acceptance criteria (the full happy path):**

1. The doctor opens **Prescriptions** from the sidebar (or the Encounters workspace, or a
   patient's timeline) and taps **"New Prescription"**.
2. A dialog opens: choose the patient, type the medication lines (each with
   dosage / frequency / duration / instructions), and save.
3. The system screens the medication names against the patient's active allergies and
   **warns (never blocks)** if a conflict is found.
4. The prescription is saved (audited), appears in:
   - the **Prescriptions list page** (sidebar) with status, prescriber, and date,
   - the **patient's timeline** (clickable → print page),
   - the **doctor dashboard** "My prescriptions" counter,
   - any **encounter PDF / AI summary** that includes medications.
5. The doctor can **print** the A5 Rx sheet (with clinic letterhead) or **send** it to the
   patient via SMS/WhatsApp.
6. The doctor can later **complete** or **cancel** the prescription (lifecycle) and flag it
   as **sent to pharmacy**.
7. Access control: only clinical roles (Doctor/Nurse/Pharmacist + Owner) see the module.

---

## 2. Where the code lives (map)

### Data model
| Concern | Location |
|---|---|
| `Prescription` model | `prisma/schema.prisma:583` |
| `PrescriptionItem` (خطوط الدواء) | `prisma/schema.prisma:606` |
| relations on `Organization` / `User` / `Patient` / `Encounter` | `prisma/schema.prisma:48 / 198 / 275 / 538` |

### API (backend)
| Route | Method | Purpose | File |
|---|---|---|---|
| `/api/prescriptions` | GET | list (optional `?patientId=`) | `src/app/api/prescriptions/route.ts:11` |
| `/api/prescriptions` | POST | create Rx (patient + main med + items, idempotency, allergy warnings, audit) | `src/app/api/prescriptions/route.ts:43` |
| `/api/prescriptions/[id]` | PATCH | lifecycle: `status` (active/completed/cancelled), `sentToPharmacy` | `src/app/api/prescriptions/[id]/route.ts` |
| `/api/prescriptions/[id]` | DELETE | hard-delete **only** a `cancelled` Rx (409 otherwise) | `src/app/api/prescriptions/[id]/route.ts` |
| `/api/prescriptions/[id]/send` | POST | send via SMS/WhatsApp (+ `Communication` row) | `src/app/api/prescriptions/[id]/send/route.ts` |

Guard pattern (every route): `getOrgId()` → `assertOrgScope()` → module permission `labs`
→ `encounters:write` / `patients:write` (write ops) → org-scoped queries → `createAuditLog`.

### UI
| Surface | File |
|---|---|
| **List page `/prescriptions`** (sidebar) | `src/app/(dashboard)/prescriptions/page.tsx` |
| **New Prescription dialog** | `src/components/prescriptions/new-prescription-dialog.tsx` |
| Rx authoring inside an encounter | `src/components/encounters/encounters-workspace.tsx` (Prescribe card) |
| Patient timeline (clickable Rx rows) | `src/app/(dashboard)/patients/[id]/page.tsx` |
| Print (A5 Rx sheet) | `src/app/(dashboard)/print/prescription/[id]/page.tsx` |
| Send button (SMS/WhatsApp) | `src/components/print/send-rx-button.tsx` |
| Doctor board "My prescriptions" stat | `src/components/dashboard/doctor-board.tsx` |
| Sidebar nav + route titles | `src/components/ui/dashboard-with-collapsible-sidebar.tsx` |

### Supporting libraries
- Validation schemas: `src/lib/validations/encounter.ts:31` (`prescriptionSchema`, `prescriptionItemSchema`)
- Allergy screening: `src/lib/allergies.ts` (`findMedicationAllergyWarnings`)
- Message rendering: `src/lib/communications.ts:220` (`renderPrescriptionMessage`)
- i18n keys: `src/lib/i18n/dictionaries/en.ts` + `ar.ts` (`nav_prescriptions`, `rx_*`, existing `print_*`, `rx_send`)

### Tests
- `tests/unit/prescription-message.test.ts` — SMS/WhatsApp message builder
- `tests/unit/i18n-parity.test.ts` — en/ar key parity
- (vitest unit suite covers the pure libs the feature depends on)

---

## 3. The data model (fields you will meet)

`Prescription`:
`id · organizationId (tenant) · patientId · encounterId? · prescribedById (→User) ·`
`medicationName (main med, required, legacy scalar) · dosage? · frequency? · duration? ·`
`instructions? · status (active|completed|cancelled, default "active") ·`
`sentToPharmacy (bool, default false) · idempotencyKey? (unique) · createdAt · updatedAt · items[]`

`PrescriptionItem` (one row per additional drug line):
`id · prescriptionId · medicationName · dosage? · frequency? · duration? · instructions? · createdAt`

> **Layout convention:** the **first** medication line written in the UI populates the
> top-level `medicationName` fields; any **additional** lines are stored as `items[]`.
> The print page renders `items[]` as a table, and falls back to the single top-level med
> when `items[]` is empty.

---

## 4. End-to-end flow (the full journey)

```
Sidebar "Prescriptions" ──▶ List page (/prescriptions)
   │  "New Prescription" ──▶ NewPrescriptionDialog (patient select + med lines)
   │        │  POST /api/prescriptions
   │        │    ├─ validate (prescriptionSchema + items)
   │        │    ├─ allergy screen → allergyWarnings (advisory)
   │        │    ├─ idempotency check
   │        │    └─ $transaction: Prescription + items + AuditLog(CHANGE)
   │        ▼
   │  201 Rx saved ──▶ row appears in list · patient timeline · doctor board
   │        │
   │        ├─ "Print"  ──▶ /print/prescription/[id] (server-rendered A5 sheet)
   │        ├─ "Send"   ──▶ POST /api/prescriptions/[id]/send (SMS/WhatsApp + Communication)
   │        └─ "Complete/Cancel" ──▶ PATCH /api/prescriptions/[id] (audited)
   │                 └─ "Delete" (only if cancelled) ──▶ DELETE /api/prescriptions/[id]

Encounters workspace "Prescribe" card ──▶ same dialog, patient+encounter preselected
Patient timeline Rx row (clickable)   ──▶ /print/prescription/[id]
```

---

## 5. Rules & invariants

- **Tenant isolation:** every query is scoped `where: { organizationId }` — a prescription
  can never leak between clinics.
- **Audit:** CREATE (insert), UPDATE (status/pharmacy), DELETE — all write an `AuditLog` row.
- **Allergy warnings are advisory** — they never block the doctor from saving.
- **Idempotency:** a repeated POST with the same `idempotencyKey` returns the existing Rx.
- **Status machine:** `active` → `completed` (done) or `cancelled` (voided); only a
  `cancelled` Rx may be hard-deleted.
- **Print/send:** both use the same medication source of truth; send records a
  `Communication` row with per-channel delivery status.
- **Offline queue:** PWA already registers `POST/PATCH /api/prescriptions` for offline
  mutations (`src/lib/pwa/offline-mutations.ts`).

---

## 6. Future / not done (deliberately deferred)

- E-prescribe to a pharmacy network (no vendor).
- Patient portal view of Rx (portal is partial).
- Per-line drug/frequency pickers from a formulary catalog (currently free text).
- Cancel-delete confirmation flow is a client-side confirm via dialog/toast.

---

## 7. Quick verify checklist (after touching this feature)

- [ ] `npx vitest run` — unit suite green (incl. i18n parity)
- [ ] `npx tsc --noEmit` — no type errors
- [ ] `npm run lint` — 0 errors
- [ ] `npm run build` — routes compiled (`/prescriptions`, `/api/prescriptions/[id]`)
- [ ] Manually: open `/prescriptions` → New → save → appears in list + patient timeline →
      print page renders items table → send (SMS/WhatsApp) → complete/cancel works.