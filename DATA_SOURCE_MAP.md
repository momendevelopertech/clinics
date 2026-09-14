# DATA_SOURCE_MAP.md — Phase A: Data Provenance & Source-of-Truth Mapping

> Date: 2026-09-14 — Branch: `main`. Scope: every Prisma model + every visible field/dropdown in UI.
> Rule: each row links to real code `file:line`. No assumptions — ambiguous cases go to "Architectural decisions required" at the end.
> Relation to prior work: builds on `SYSTEM_MAP.md` G1–G21. New findings appended as G22+ and mirrored there.

Scope key: `Platform` = shared across orgs (Super Admin only) | `Organization` = one clinic (`organizationId`) | `User` = personal to one user | `Derived` = no own FK, scoped via parent.

---

## 1) Catalog / master data (the confusing fields)

| Model | Field/property | Added by (role) | From where in UI (page/button exactly) | Scope | Who can edit | Who can delete | Notes / issues + code |
|---|---|---|---|---|---|---|---|
| (no model) `Medication` | drug name, dosage, frequency | Nobody as catalog — free text per prescription; stock rows added by Nurse/Pharmacist (+Owner bypass) | Rx composer `src/components/prescriptions/new-prescription-dialog.tsx:119-124` combobox + `384-403` items; stock add `src/components/inventory/add-item-dialog.tsx:50,93-96` on `src/app/(dashboard)/inventory/page.tsx:117` | Organization (via `InventoryItem`) + free text (no scope) | Prescription author via `PATCH /api/prescriptions/[id]` `src/app/api/prescriptions/[id]/route.ts:31`; stock via `PATCH /api/inventory/[id]` `:19` | Same as edit (no separate guard) | **No `Medication` model in `prisma/schema.prisma` (grep = 0).** Rx stores `medicationName: String` (`src/app/api/prescriptions/route.ts:45-183`). Search merges favorites + stock: `src/app/api/medications/search/route.ts:24-48` (`InventoryItem where:{organizationId, category:"medication"}`) + `src/app/api/prescriptions/favorites/route.ts:24-43`. Guard `medications/search:17` = `inventory` module (note: Rx flow gated on `labs` elsewhere). = G1/G9. **Needs architectural decision Q1.** |
| `InventoryItem` | name, sku, category, quantity, reorderLevel, unit, expiryDate, batchNumber | Nurse, Pharmacist (module `inventory` + `inventory:write`); Owner/Super Admin bypass page gate | `src/app/(dashboard)/inventory/page.tsx:117` → `AddItemDialog` → `POST /api/inventory` (`add-item-dialog.tsx:50`); category input free-text `:133-143` placeholder "Medication" | Organization (`where:{organizationId}` `src/app/api/inventory/route.ts:22`) | Same writers via `PATCH /api/inventory/[id]` (`[id]/route.ts:19`) + stock moves via `POST /api/inventory/[id]/transaction` (`transaction/route.ts:18`) | `DELETE /api/inventory/[id]` (same guard) | `reorderLevel` set in the **same** add dialog — no split-brain (the example in the prompt does not occur). Category is free text (`src/lib/validations/ops.ts:38-47`), filter dropdown derived from data (`inventory/page.tsx:77`). Seed: 15 rows. Page gate `src/proxy.ts:62` = Nurse/Pharmacist. |
| `PrescriptionTemplate` | name, specialty, isShared, items(Json), usageCount | Doctor, Nurse, Pharmacist (module `labs` + `encounters:write`\|`patients:write`) | Same Rx dialog `new-prescription-dialog.tsx:574-583` "save as template" → `POST /api/prescription-templates` (`:371-409`); list `328-337` + dropdown `529-572` | Organization + author (`organizationId` + `createdById`, `src/app/api/prescription-templates/route.ts:88-98`) | **Author or Owner/Super Admin only** — `resolveTemplateAuthorization` `src/app/api/prescription-templates/[id]/route.ts:29-64` (`OWNER_ROLES:23`) | Same as edit (`DELETE :115-143`) | `isShared` stored but **GET ignores it** — returns all 100 org templates (`route.ts:34-53`), `mine` filter is opt-in only. So "private" templates leak to the whole org. Visibility = org-wide in practice. Seed = 0 rows (G2). **Q2.** |
| `MedicationFavorite` | medicationName + defaults, usageCount, lastUsedAt | Same writers as templates (per-user) | Implicitly via Rx combobox results (`new-prescription-dialog.tsx:119-124` → `GET /api/prescriptions/favorites`) | User (`where:{organizationId, userId}` `src/app/api/prescriptions/favorites/route.ts:24`) | Owner of the favorite (same endpoint scope) | Same | Seed = 0. Personal shortcut layer, not a catalog. |
| `ServiceCatalog` | code, name, category, durationMins, price, active | **Owner only** (`requireOwner` `src/app/api/catalogs/route.ts:41`) | **No add/edit UI** — `src/app/(dashboard)/catalogs/page.tsx:26,94-99` is read-only tables | Organization (`where:{organizationId}` `:29`) | **No PATCH/DELETE endpoint exists** — immutable after create | Same (no endpoint) | Invoice composer does NOT use it: `new-invoice-dialog.tsx:86-102,170-180` free-text description/price; API accepts optional `serviceCatalogId` (`billing/invoices/route.ts:86-98`) but UI never sends it = G18/G19. **Q3.** |
| `ClinicalCatalog` (diagnoses ICD-10) | system, code, name, category | **Owner only** (same `catalogs/route.ts:41`) | Same read-only `catalogs/page.tsx:30,114-121` | Organization (`:26`) | No endpoint | No endpoint | Seed 7 ICD-10 rows. Same Q3. |
| `ClinicalTemplate` (SOAP) | name, specialty, noteType, subjective/objective/assessment/plan, isDefault | Doctor, Nurse (module `encounters` + `encounters:write`) | `src/components/encounters/encounters-workspace.tsx:309-313` inputs + save → `POST /api/clinical-templates` (`:135-148`); select `:261-273`; delete `:150-157` | Organization **shared, no author column** (`src/app/api/clinical-templates/route.ts:55-67` — no `createdById`, no `isShared`) | Any writer via `PATCH /api/clinical-templates/[id]` (`[id]/route.ts:60`) | Any writer via `DELETE` (`:68`) | Shared-by-design (unlike Rx templates). Seed = 0 (G2/G9). **Q2 applies.** |
| `PricingTier` | name, description | Owner (settings/pricing) | Settings pricing UI → `/api/pricing` (upsert by `orgId-name`) | Organization | Owner | Owner | Seed 3 rows (family/gold/silver). Display-only tiers, not a price engine. |
| `Coupon` | code, kind, value, active, expiresAt | Biller (`billing:write`) — `src/app/api/coupons/route.ts:36-41` | **No UI** — API only (`POST /api/coupons`); invoice dialog sends `couponCode` string | Organization | `PATCH /api/coupons/[id]` (`[id]/route.ts:20`) | No DELETE endpoint | Seed = 0. G20. |
| `ServicePackage` / `PatientPackage` | package def + per-patient consumption | Owner/Biller (`packages:write`-ish `src/app/api/packages/route.ts:38`) | `packages-section.tsx` → `/api/packages`; consume `/api/patient-packages/[id]/consume` | Organization | `PATCH /api/patient-packages/[id]` | `DELETE` same | Seed = 0 both. |

## 2) Org structure & staff

| Model | Field | Added by | UI location | Scope | Edit | Delete | Notes + code |
|---|---|---|---|---|---|---|---|
| `Branch` | name, address, city, phone, status, workingHours | **Owner only** (`requireOwner` `src/app/api/branches/route.ts:34`) | `src/app/(dashboard)/locations/page.tsx:40-45` `addBranch()` + `:91-97` Add button | Organization | **Owner only** `PATCH /api/branches/[id]` (`[id]/route.ts:13`) | No DELETE endpoint (status toggle only) | **Trap:** page gate allows Receptionist (`src/proxy.ts:57`) but POST 403s for non-Owner = G21. GET is staff-readable (`branches/route.ts:13-18`). |
| `Room` | name, number, type, status, branchId | **Owner only** (`src/app/api/rooms/route.ts:32`) | `locations/page.tsx:47-53` + `:123-129` | Organization | **Owner only** `PATCH` (`[id]/route.ts:13`) | No DELETE | Same G21 trap. Appointment `roomId` optional (`src/lib/validations/appointment.ts:17`). |
| `Equipment` / `EquipmentMaintenance` | name, type, calibration, status | Nurse/Pharmacist + write perm (`src/app/api/equipment/route.ts:49`) | `/equipment` page | Organization | Same writers | Same | Maintenance seed = 0. |
| `User` (staff account) | email, name, role, specialty, branchId, roomId, fees | **No invite endpoint.** Accounts enter via public `POST /api/signup` (`src/app/api/signup/route.ts:212` `user.create` — the only one) then Owner assigns role | `src/app/(dashboard)/staff/page-client.tsx:209-233` Assign-Role dialog → `POST /api/staff/roles` (`src/app/api/staff/roles/route.ts:27` `requireOwner`); profile `PATCH /api/staff` (`staff/route.ts:39` `requireOwner`); shifts `POST /api/shifts` (`shifts/route.ts:39` `requireOwner`) | Organization | Owner only | Deactivate only (no hard delete) | **Confirmed: Owner-only staffing; no self-signup-to-org.** `settings_addTeamMember` button has no backend = G17. Page gate `src/proxy.ts:40` Owner. |
| `Role` / `RolePermission` / `UserRole` | role defs + grants | Seeded + Owner assign | Staff page role select (`page-client.tsx:224` ← `GET /api/staff/roles` → `prisma.role.findMany` `staff/roles/route.ts:12`) | Organization (Role has orgId; permissions link via roleId only — G16) | Owner | Owner | Seed 7 roles + ~118 grants. |
| `Shift` | userId, branchId, weekday, times | Owner only | Staff page `:302` weekday select + `:314` branch select + `:317` add → `POST /api/shifts` | Organization | Owner (`PATCH` if present) | Owner `DELETE /api/shifts/[id]` (`[id]/route.ts:16`) | Weekday options hardcoded `WEEKDAY_KEYS` (`page-client.tsx:47-55`). Seed = 0. |

## 3) Clinical & billing records (who creates the row vs who picks from catalog)

| Model | Created by | UI | Scope | Edit | Delete | Source-of-truth notes |
|---|---|---|---|---|---|---|
| `Patient` | Reception (Doctor/Nurse/Biller/Pharmacist read) — `patients:write` | `/patients` + portal signup | Organization | `PATCH /api/patients/[id]` (`[id]/route.ts:108` `hasPermission patients:write`) | Archive (no hard delete) | Master record; everything hangs off it. Seed 20. |
| `Appointment` | Reception (+ portal self-book) | `/appointments`, `book-appointment-dialog.tsx:330-346` providers ← `GET /api/staff` (`appointments/page.tsx:220`) | Organization | `PATCH /api/appointments` + check-in/out/no-show via `src/lib/reception.ts:41-43` | Cancel (status) | Provider dropdown = API (`staff/route.ts:13`); room/branch optional. |
| `Encounter` + `EncounterNote` | Doctor/Nurse | `encounters-workspace.tsx:74-85` | Organization (Note: no orgId, via encounter — G16) | `PATCH /api/encounters/[id]` | No delete | G3: close does not spawn invoice. |
| `Prescription` + `PrescriptionItem` | Doctor (+Nurse/Pharmacist per page gate `src/proxy.ts:50`) | `new-prescription-dialog.tsx` | Organization (Item: via prescription — G16) | `PATCH /api/prescriptions/[id]` (`[id]/route.ts:31`) any writer in org — **Owner override holds** | Same | `medicationName` free text (G1); `send` API unlinked (G5). |
| `LabOrder` / `LabResult` | Doctor/Nurse | `/labs` | Organization | `PATCH lab-orders/[id]`; results via verbs | Same | No lab-test catalog table — `testName` free text. Same class as G1. |
| `ProcedureOrder` | Doctor/Nurse | clinical-orders | Organization | `PATCH` | Same | G6: no `performedByRole` distinction (prompt's G6; schema has `performedByRole?` per audit — verify before build). |
| `Invoice` + `InvoiceLineItem` + `Payment` | Biller | `new-invoice-dialog.tsx:131-135` on `billing/page-client.tsx:225` → `POST /api/billing/invoices` (`invoices/route.ts:56-64` `billing:write`) | Organization (LineItem/Payment via invoice — G16) | Invoice status via payments engine `src/lib/payments.ts:34-38` | Refund `POST /api/payments/[id]/refund` | G7: manual single-line, no auto-generate; catalog lookup optional server-side only. |
| `InsurancePolicy` | Biller (`billing:write` `policies/route.ts:49-54`) | `src/app/(dashboard)/insurance/page.tsx:450-490` New Policy card → `POST` (`:132-144`); **provider = free-text `<Input>` `:462`** | Derived via `patient.organizationId` (`policies/route.ts:30-34`) — G16 | No PATCH endpoint | No DELETE endpoint | **No provider catalog table exists.** Type dropdown hardcoded `[{primary},{secondary}]` (`:478`). |
| `InsuranceClaim` | Biller | Same page `:492-535` → `POST /api/insurance/claims` (`:173-183`) | Organization | `PATCH /api/insurance/claims/[id]` (`[id]/route.ts:23`) | Same | Status dropdown hardcoded `CLAIM_STATUSES` (`:49` submitted/pending/paid/denied/appeal); transitions via `canTransitionClaim`. |
| `Task` | Any clinical role (`tasks` module + `patients:write`\|`appointments:write` `tasks/route.ts:57-63`); page all five roles (`src/proxy.ts:51`) | `tasks/page.tsx:100` → `CreateTaskDialog` → `POST /api/tasks` (`create-task-dialog.tsx:72-82`) | Organization | `PATCH /api/tasks/[id]` (`[id]/route.ts:18`) — any writer, **Owner override holds** | Same | **No category table.** `taskType` in schema/API (`validations/ops.ts:35`, `tasks/route.ts:81`) but **no dropdown renders it**; priority hardcoded `["low","medium","high","urgent"]` (`:31`); status hardcoded `open/in_progress/completed/cancelled` (`tasks/page.tsx:67-72`). |
| `Consent` | Doctor/Nurse/Receptionist (`consents` module + `patients:write` `consents/route.ts:67-72`) | `add-consent-dialog.tsx:135-139` on `/consents` (`consents/page.tsx:63`) → `POST` (`:101-111`); patient select ← `GET /api/patients` (`:73-83`) | `organizationId` field, no FK (G16) | `PATCH /api/consents/[id]` | No revoke endpoint (use PATCH `isGranted=false`) | **No consent-template model.** Type dropdown hardcoded `CONSENT_TYPE_OPTIONS` 9 items (`:36-46`); validation free string (`validations/ops.ts:67-73`); portal required list hardcoded 3 (`REQUIRED_PATIENT_CONSENT_TYPES`, `patient-portal/consents/route.ts:22`). Document print templates are a **hardcoded registry** (`src/lib/documents/templates.tsx:95-145` 7 ids; `documents/templates/route.ts:21`). |
| `Document` | Doctor/Nurse/Receptionist | `/documents` + generate dialog (`templates` ← hardcoded registry, select `:167`) | Organization | Token-based download (HMAC) | Same | Template choice ≠ DB table. |
| `Communication` / `Campaign` | Receptionist (+Owner) | `/communications`, `/campaigns` (Owner/Receptionist `src/proxy.ts:43`) | Organization | Campaign launch `POST .../[id]/launch` | Same | Channel/type hardcoded in UI. |
| `WaitlistEntry` | Receptionist | `/waitlist` + `POST /api/waitlist/[id]/book` ($transaction) | Organization | `PATCH /api/waitlist/[id]` | Same | Seed 12. |
| `Vital` | Nurse/Doctor (`encounters:write`\|`patients:write`) | Raw `POST /api/vitals` only — **no dedicated Nurse input in Queue/Encounter** (G4) | Via patient/encounter (G16) | No edit (append-only) | No delete | Stream SSE consumed by portal only. |
| `Diagnosis` / `FollowUp` / `PatientHistory` / `PatientAllergy` | Doctor/Nurse | Encounter workspace / patientiles | Organization (Allergy seed 0) | PATCH | Same | Diagnosis `code/name` free text vs `ClinicalCatalog` not wired — same class as G18. |
| `AuditLog` / `Notification` | System / any writer | `/audit` read-only; notifications self-inbox (`where:{organizationId, recipientId:userId}` `notifications/route.ts:12`, `notifications/[id]/route.ts:7-11`) | Organization | Self-only (notifications) | Self-only | **Owner cannot read others' inbox — by design, not a violation.** |
| `IntakeForm`/`IntakeField`/`IntakeResponse`, `TreatmentPlan(+Step)`, `ServicePackage`, `PatientPackage`, `InstallmentPlan(+Installment)`, `Expense`, `ReportSchedule`, `ApiKey`, `Webhook(+Delivery)`, `PushSubscription`, `Feedback`, `FeedbackSurvey`, `Coupon`, `EquipmentMaintenance`, `Shift`, `PatientSession`, `EmergencyContact` | Owner or role per route (forms/reports/webhooks/keys = Owner-only; treatment/intake = clinical writers) | Various (intake builder, reports card, integrations) | Organization except Session/EmergencyContact/Field/Step/Installment/Delivery (G16) | Per route | Per route | **All seed 0** except EmergencyContact (20, auto per patient) and FeedbackSurvey (6). See seed report (Phase C). |

## 4) Every dropdown/select — where its options come from

| Dropdown in UI | Options source | Code |
|---|---|---|
| Rx drug name combobox | API: favorites + `InventoryItem(category=medication)` | `new-prescription-dialog.tsx:119-124`; `medications/search/route.ts:24-48`; `favorites/route.ts:24-43` |
| Rx template picker | API: `PrescriptionTemplate` (org) | `new-prescription-dialog.tsx:328-337,529-572` |
| Dispense stock picker | API: `medications/search` | `dispense-dialog.tsx:59-68,148-159` |
| Inventory category filter | **Derived from data** (distinct `category` values) | `inventory/page.tsx:77,173-189` |
| Invoice line description/price | **Free text** (catalog not wired) | `new-invoice-dialog.tsx:86-102,170-180` |
| Appointment provider | API: `GET /api/staff` | `appointments/page.tsx:220-230,373-387`; `book-appointment-dialog.tsx:330-346` |
| Staff branch filter / shift branch | API: `GET /api/branches` | `staff/page-client.tsx:91-94,241,314` |
| Staff role assign | API: `GET /api/staff/roles` | `staff/page-client.tsx:92,224` |
| Shift weekday | **Hardcoded** `WEEKDAY_KEYS` | `staff/page-client.tsx:47-55,302` |
| Insurance claim status | **Hardcoded** 5 statuses | `insurance/page.tsx:49,287-302` |
| Insurance policy type | **Hardcoded** primary/secondary | `insurance/page.tsx:478` |
| Insurance provider | **Free-text Input** (no table) | `insurance/page.tsx:462` |
| Insurance/claim patient pickers | API: `GET /api/patients` | `insurance/page.tsx:86-88,267-282,458,499` |
| Consent type | **Hardcoded** 9 options | `add-consent-dialog.tsx:36-46,166-178` |
| Document print template | **Hardcoded registry** 7 ids | `documents/templates.tsx:95-145`; `templates/route.ts:21`; `generate-document-dialog.tsx:77-80,167` |
| SOAP template picker | API: `ClinicalTemplate` | `encounters-workspace.tsx:54,261-273` |
| Task priority | **Hardcoded** 4 | `create-task-dialog.tsx:31,158-169` |
| Task status filter | **Hardcoded** 4 | `tasks/page.tsx:67-72,122-137` |
| Task `taskType` | **No dropdown** (API accepts, UI never sends) | `validations/ops.ts:35`; `tasks/route.ts:81,97` |
| Lab `testName`, diagnosis code, procedure name | **Free text** (no catalog wiring) | `labs/route.ts:74`; catalogs read-only |
| Catalog tables (service/clinical) | API read-only | `catalogs/page.tsx:26,30,94-121`; `catalogs/route.ts:26-30` |

## 5) Owner override audit (Phase D pre-check)

- No `createdById === session.user.id` gate blocks Owner anywhere. Sole author-aware route (`PATCH|DELETE /api/prescription-templates/[id]`, `resolveTemplateAuthorization` `[id]/route.ts:29-64`) explicitly passes Owner/Super Admin (`OWNER_ROLES:23`).
- All other edit/delete paths are org-scoped (`where:{organizationId}`) + module/permission checks; any permitted writer (incl. Owner with grant) can act on others' rows. Endpoint inventory with guards in subagent audit (prompt Phase D).
- Self-scoped exceptions (by design, NOT violations): notification inbox (`notifications/route.ts:12`, `[id]/route.ts:7-11`), profile avatar/availability (`profile/avatar/route.ts:26`, `profile/availability/route.ts:9`), patient-portal own-id routes, public/cron/webhook routes.
- Caveat: `hasPermission` bypasses only Super Admin (`src/lib/auth.ts:24,67`), not Owner — Owner relies on its 36 RBAC grants (`RolePermission` seed). Owner-override formalization = add explicit `isOwner → allow` short-circuit or document grant coverage in `PERMISSIONS_MATRIX.md`.

## 6) New gaps found (mirror to SYSTEM_MAP.md as G22+)

| ID | Severity | Description | Exact location |
|---|---|---|---|
| G22 | 🟡 | `PrescriptionTemplate.isShared` ignored by GET — private templates visible org-wide | `src/app/api/prescription-templates/route.ts:34-53` |
| G23 | 🟡 | No provider catalog — insurance `provider` free text, duplicates inevitable | `src/app/(dashboard)/insurance/page.tsx:462`, no model in schema |
| G24 | 🟡 | No lab-test / diagnosis-code wiring — `testName`/`code` free text while `ClinicalCatalog` sits unused | `src/app/api/labs/route.ts:74`, `catalogs/page.tsx` |
| G25 | 🟢 | `taskType` accepted by API but never rendered — dead schema field | `src/lib/validations/ops.ts:35`, `tasks/route.ts:81`, `create-task-dialog.tsx` (absent) |

---

## 8) Decisions on G25–G27 (2026-09-14, approved scope)

- **G25 → ACTIVATED (revised 2026-09-14): canonical dropdown** (`follow_up`, `lab_review`, `claim_followup`) added to `CreateTaskDialog` and sent in POST. Reason for revision: the field is load-bearing — `src/app/api/cron/follow-up-escalation/route.ts:96` writes `taskType: "follow_up"` and the schema comment defines the canonical set. Deletion would have broken the cron job.
- **G26 → Leave as internal cache, no management UI.** Reason: per-user learning cache, self-maintained by upsert on Rx save, negligible storage, zero clinical value in managing it. Documented as internal.
- **G27 → Build simple coupon management UI inside `/billing` (Biller + Owner).** Reason: API + invoice `couponCode` path already work; deleting would remove a functioning discount path. Small UI makes the feature real and discoverable.

---

## 7) Architectural decisions required (ANSWER BEFORE BUILD — questions in English)

> Rule from the prompt: no unilateral calls on ambiguous ownership. Please answer Q1–Q5; Phase B/C/D proceed after.

- **Q1 — Medication catalog: Platform-level shared catalog (Super Admin managed) vs Organization-level catalog (each clinic manages its own) vs hybrid (platform base + org custom items)?** Current code: no Medication model; drugs are org-level `InventoryItem{category:"medication"}` + free text. Recommendation: hybrid (platform base RxNorm-like list read-only + org `InventoryItem` overrides), but needs your call because it changes schema + seed (50–100 drugs) + dispense linkage (G1/G8/G9).
- **Q2 — PrescriptionTemplate and ClinicalTemplate: per-doctor private by default vs org-shared by default? Should Owner see/edit/delete all templates?** Current: Rx templates carry `isShared` but GET ignores it (G22); clinical templates are org-shared with no author. Proposed: `isShared=false` → author-only; `true` → org-visible; Owner overrides both. Confirm?
- **Q3 — ServiceCatalog and ClinicalCatalog: Owner-only management OK? Add PATCH/DELETE endpoints + a real management UI (currently read-only, G19)? Should the invoice/lab/diagnosis composers be forced to pick from catalog (kill free text)?** Proposed: yes to all three; needs your approval because it restricts Biller/Doctor input.
- **Q4 — Insurance providers: free-text provider names OK, or a managed provider list (Owner-managed, org-level)?** Current: free-text Input, no table (G23). Proposed: org-level `InsuranceProvider` catalog (or reuse a generic catalog) managed by Owner, dropdown in policy form. Confirm or keep free text?
- **Q5 — Task categories and consent types: keep hardcoded enums, or make them Owner-managed lookup tables?** Current: hardcoded priority/status/consent-types/document-registry with no admin UI. Proposed: keep hardcoded for v1 (stable sets), add `taskType` dropdown OR drop the dead field (G25). Confirm?
