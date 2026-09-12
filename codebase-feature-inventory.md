# Codebase Feature Inventory — OpenHealthCRM / HealthCRM
> Inspection date: 2026-09-12
> Evidence policy: this inventory is based on the checked-in source, Prisma schema, migrations, dictionaries, and static references. It does not infer unimplemented product requirements.
> Stack: Next.js 16.1.6 App Router, React 19.2.3, TypeScript 5.9.3, Prisma 7.4.2, PostgreSQL, NextAuth 4, Tailwind CSS 4, Radix/shadcn-style UI, Zod 4, Vitest, Playwright.
> Primary evidence: [package.json](package.json), [prisma/schema.prisma](prisma/schema.prisma), `src/app/api/**/route.ts`, `src/app/**/page.tsx`, [dashboard-with-collapsible-sidebar.tsx](src/components/ui/dashboard-with-collapsible-sidebar.tsx), and [src/lib/i18n/dictionaries/en.ts](src/lib/i18n/dictionaries/en.ts).

## 1. General Structure and Technology

### Repository shape
- `src/app`: Next App Router pages, dashboard route group, public/auth pages, patient portal, super-admin pages, API routes, service worker, offline page.
- `src/components`: domain UI (`patients`, `appointments`, `encounters`, `prescriptions`, `labs`, `billing`, `documents`, `communications`, `reports`, `settings`, `super`, etc.) and shared UI primitives.
- `src/lib`: domain services, authorization, tenant context, audit, validation, integrations, i18n, PWA/offline, reporting, billing, messaging, AI, FHIR, and storage helpers.
- `prisma`: schema, seed scripts, and 46 SQL migrations.
- `tests/unit`, `tests/integration`, `e2e`: automated coverage for most major domains.
- Root configuration: Next, TypeScript, ESLint, PostCSS/Tailwind, Vitest, Playwright, Docker Compose, Vercel.

### Dependencies and integrations present in code
- Database: PostgreSQL through `@prisma/client`, `@prisma/adapter-pg`, and `pg`.
- Auth: NextAuth credentials/session flow, patient-auth sessions, email verification/reset, TOTP 2FA.
- Billing: Stripe SDK, Stripe webhook verification, payment/refund/idempotency logic.
- Messaging: Twilio SMS/WhatsApp; Nodemailer SMTP/Gmail transport; optional Resend dependency is declared but the inspected communication helper uses Nodemailer/Twilio.
- Files: Cloudinary uploads and deletion with purpose/MIME/size validation.
- Async/operations: BullMQ and ioredis are declared; Redis is optional for distributed rate limiting.
- AI: provider-configurable OpenAI-compatible or Anthropic HTTP calls; disabled by default when not configured.
- Interoperability: restricted FHIR R4-shaped proxy/read/write-back and API-key authentication.
- PWA: Serwist, service worker, offline mutation capture, push subscriptions, install/update UI.
- UI: Radix primitives, lucide-react, react-hook-form, Zod, Framer Motion, Sonner, PDF renderer, XLSX.

## 2. Complete Prisma Model Map

The schema contains 69 models. The field lists below include scalar and relation fields as declared in [prisma/schema.prisma](prisma/schema.prisma). `organizationId` plus `organization` is the normal tenant boundary where present.

| Model | All declared fields | Relations / lifecycle evidence |
|---|---|---|
| Organization | `id, name, slug, phone, address, city, country, status, plan, onboardingSource, settingsJson, upgradeRequestedPlan, upgradeRequestedAt, upgradeNote, timezone, currency, createdAt, updatedAt, users, patients, branches, appointments, encounters, tasks, communications, auditLogs, roles, rooms, equipment, equipmentMaintenances, invoices, insuranceClaims, inventoryItems, campaigns, documents, pricingTiers, waitlistEntries, prescriptions, serviceCatalogs, clinicalCatalogs, patientHistories, diagnoses, followUps, labOrders, labResults, notifications, procedureOrders, subscription, entitlementOverrides, pushSubscriptions, coupons, installmentPlans, shifts, expenses, clinicalTemplates, servicePackages, patientPackages, treatmentPlans, feedbacks, intakeForms, intakeResponses, patientAllergies, reportSchedules, apiKeys, webhooks, medicationFavorites, prescriptionTemplates` | Root tenant. `status`: pending/active/suspended; `plan`: free/clinic/plus. |
| Plan | `id, code, internalCode, nameEn, nameAr, descriptionEn, descriptionAr, price, billingCycle, status, displayOrder, popular, trialDays, modulesJson, featuresJson, upgradeTargetId, downgradeTargetIdsJson, downgradesAllowed, createdAt, updatedAt, upgradeTarget, upgradedFrom, subscriptions` | `status`: active/archived; self-relation is upgrade path. |
| Subscription | `id, organizationId, planId, status, currentPeriodStart, currentPeriodEnd, trialEndsAt, cancelAtPeriodEnd, canceledAt, billingCycle, notes, createdAt, updatedAt, organization, plan` | `status`: trialing/active/past_due/canceled/expired; one per organization. |
| EntitlementOverride | `id, organizationId, moduleKey, featureKey, kind, valueJson, reason, createdById, expiresAt, createdAt, updatedAt, organization` | Module/feature/limit override; expiry is data-driven. |
| WaitlistEntry | `id, organizationId, patientId, preferredDate, notes, status, createdAt, updatedAt, organization, patient` | `status`: waiting/offered/cancelled. |
| User | `id, organizationId, email, name, passwordHash, avatarUrl, avatarPublicId, active, emailVerified, verifyTokenHash, verifyTokenExp, resetTokenHash, resetTokenExp, specialty, licenseNumber, workingHours, branchId, roomId, consultationFee, availabilityType, availableDays, availableFrom, availableTo, role, totpSecret, totpEnabled, totpBackupCodes, totpEnabledAt, createdAt, updatedAt, organization, branch, room, userRoles, appointmentsAsProvider, tasksAssigned, tasksCreated, auditLogs, encounterNotes, prescriptions, labOrders, reviewedLabResults, procedureOrders, notifications, pushSubscriptions, shifts, medicationFavorites, prescriptionTemplates` | Staff identity, provider, RBAC, availability and 2FA. `active`/`emailVerified` are operational gates. |
| Role | `id, organizationId, name, createdAt, updatedAt, organization, permissions, userRoles` | Tenant-scoped role. |
| RolePermission | `id, roleId, action, resource, createdAt, role` | Permission leaf; no direct route handler uses this model. |
| UserRole | `id, userId, roleId, createdAt, user, role` | Unique user/role assignment. |
| Patient | `id, organizationId, mrn, firstName, lastName, dateOfBirth, gender, email, phone, phoneSecondary, marketingOptOut, address, city, state, zip, country, bloodType, allergies, primaryCareProvider, passwordHash, sensitiveDataEncrypted, familyHistory, status, createdAt, updatedAt, organization, appointments, encounters, tasks, communications, consents, vitals, prescriptions, labResults, labOrders, procedureOrders, insurancePolicies, invoices, documents, waitlistEntries, sessions, histories, diagnoses, followUps, insuranceClaims, installmentPlans, patientPackages, treatmentPlans, feedbacks, intakeResponses, patientAllergies, emergencyContact` | `status`: Active/Inactive/Archived. Full patient profile, portal identity, clinical and billing aggregate. |
| PatientAllergy | `id, organizationId, patientId, allergen, severity, reaction, onset, active, createdAt, updatedAt, organization, patient` | `active`: true/false; CRUD routes exist. |
| PatientSession | `id, patientId, tokenHash, expiresAt, revokedAt, ipAddress, userAgent, createdAt, updatedAt, patient` | Patient portal session; no direct staff route. |
| PatientHistory | `id, organizationId, patientId, category, title, details, onsetDate, resolvedAt, status, createdAt, updatedAt, organization, patient` | `status`: active by default; GET/POST history routes. |
| EmergencyContact | `id, patientId, name, relationship, phone, email, contactDataEncrypted, patient` | Embedded patient contact; no dedicated route. |
| Consent | `id, patientId, organizationId, consentType, isGranted, documentUrl, signedAt, createdAt, updatedAt, patient` | Staff and patient-portal consent routes; `isGranted` is the state. |
| Branch | `id, organizationId, name, address, city, state, zip, country, phone, email, status, workingHours, createdAt, updatedAt, organization, rooms, appointments, staff, shifts, expenses` | `status`: active/inactive. |
| Shift | `id, organizationId, userId, branchId, weekday, startTime, endTime, note, createdAt, updatedAt, organization, user, branch` | Weekly staff rota; CRUD split across GET/POST and DELETE. |
| Appointment | `id, organizationId, branchId, patientId, providerId, roomId, startTime, endTime, bufferMinutes, appointmentType, telehealthUrl, status, notes, tokenNumber, isWalkIn, cancellationReason, checkedInAt, checkedOutAt, idempotencyKey, isRecurring, recurrenceRule, reminder24hSent, reminder1hSent, createdAt, updatedAt, organization, branch, patient, provider, room, encounter, equipmentSlots, feedbacks` | `status`: scheduled/arrived/in_progress/completed/cancelled/no_show. Check-in/out/no-show, recurrence, telehealth and booking routes exist. |
| AppointmentEquipment | `id, appointmentId, equipmentId, allocatedAt, appointment, equipment` | Join model; no direct API. |
| Room | `id, organizationId, branchId, name, number, type, status, workingHours, createdAt, updatedAt, organization, branch, appointments, staff` | `status`: active/inactive. |
| Equipment | `id, organizationId, name, type, lastCalibrationAt, nextCalibrationAt, status, createdAt, updatedAt, organization, appointmentSlots, maintenances` | `status`: active/warning/maintenance_required/inactive. Equipment route and maintenance subroute exist. |
| EquipmentMaintenance | `id, organizationId, equipmentId, type, status, description, technician, performedAt, dueAt, cost, notes, createdAt, updatedAt, organization, equipment` | `type`: preventive/corrective/calibration; `status`: scheduled/completed/overdue. |
| Encounter | `id, organizationId, patientId, appointmentId, startTime, endTime, status, encounterType, createdAt, updatedAt, organization, patient, appointment, notes, vitals, prescriptions, diagnoses, followUps, labOrders, procedureOrders, invoiceLineItems, treatmentPlans` | `status`: in_progress/completed; clinical workspace root. |
| EncounterNote | `id, encounterId, authorId, noteType, subjective, objective, assessment, plan, text, templateId, createdAt, updatedAt, encounter, author` | SOAP/freeform note types. |
| Vital | `id, patientId, encounterId, weightKg, heightCm, bloodPressureSystolic, bloodPressureDiastolic, heartRate, bmi, spO2, temperature, recordedAt, patient, encounter` | Append/read/trend/stream routes. |
| Prescription | `id, organizationId, patientId, encounterId, prescribedById, medicationName, dosage, frequency, duration, instructions, status, idempotencyKey, sentToPharmacy, createdAt, updatedAt, organization, patient, encounter, prescriber, items` | `status`: active/completed/cancelled; send/print/clone/template flows. |
| PrescriptionItem | `id, prescriptionId, medicationName, dosage, frequency, duration, instructions, createdAt, prescription` | Structured medication line; no direct route. |
| Diagnosis | `id, organizationId, patientId, encounterId, system, code, name, notes, status, createdAt, updatedAt, organization, patient, encounter` | `status`: active by default; represented through clinical order/encounter flows. |
| FollowUp | `id, organizationId, patientId, encounterId, dueDate, reason, instructions, status, createdAt, updatedAt, organization, patient, encounter` | `status`: planned by default; surfaced by automation signals. |
| LabResult | `id, organizationId, patientId, orderId, testName, resultValue, unit, referenceRange, status, performedAt, reportUrl, reviewedById, reviewedAt, reviewNote, createdAt, updatedAt, organization, patient, order, reviewedBy` | `status`: pending/completed/abnormal/reviewed. |
| LabOrder | `id, organizationId, patientId, encounterId, orderedById, orderType, testName, priority, indication, transmittedAt, externalRef, status, orderedAt, results, createdAt, updatedAt, organization, patient, encounter, orderedBy` | `status`: ordered/collected/resulted/reviewed/cancelled; `priority`: routine/urgent/stat. |
| Invoice | `id, organizationId, patientId, invoiceNumber, currency, status, totalAmount, amountPaid, dueDate, idempotencyKey, couponCode, orderDiscount, createdAt, updatedAt, organization, patient, lineItems, payments, insuranceClaims, installmentPlans` | `status`: draft/sent/partially_paid/paid/overdue. |
| InvoiceLineItem | `id, invoiceId, serviceCatalogId, description, quantity, unitPrice, discountAmount, taxAmount, amount, cptCode, createdAt, encounterId, invoice, serviceCatalog, encounter` | Billing detail linked optionally to encounter/service. |
| Coupon | `id, organizationId, code, kind, value, active, expiresAt, createdAt, updatedAt, organization` | `kind`: percent/fixed; `active` and expiry are enforced by billing logic. |
| InstallmentPlan | `id, organizationId, invoiceId, patientId, totalAmount, downPayment, status, notes, createdAt, updatedAt, organization, invoice, patient, installments` | `status`: active/completed/cancelled. |
| Installment | `id, planId, dueDate, amount, status, paidAt, paymentId, createdAt, updatedAt, plan, payment` | `status`: pending/paid/overdue/cancelled; payment route exists through parent operation. |
| Expense | `id, organizationId, branchId, category, amount, spentAt, notes, createdAt, updatedAt, organization, branch` | Expense API is GET/POST plus DELETE by id. |
| ClinicalTemplate | `id, organizationId, name, specialty, noteType, subjective, objective, assessment, plan, isDefault, createdAt, updatedAt, organization` | SOAP/freeform template CRUD. |
| ServicePackage | `id, organizationId, name, serviceCatalogId, procedureName, totalSessions, price, active, createdAt, updatedAt, organization, serviceCatalog, patientPackages` | Prepaid package catalog; `active` boolean. |
| PatientPackage | `id, organizationId, patientId, packageId, sessionsTotal, sessionsUsed, status, pricePaid, createdAt, updatedAt, organization, patient, package` | `status`: active/completed/cancelled; consume route increments usage. |
| TreatmentPlan | `id, organizationId, patientId, encounterId, title, notes, status, createdAt, updatedAt, organization, patient, encounter, steps` | `status`: draft/active/completed/cancelled. |
| TreatmentPlanStep | `id, planId, kind, refId, title, dueDate, status, createdAt, updatedAt, plan` | `kind`: diagnosis/prescription/procedure/followup/note; `status`: pending/done/skipped. |
| Feedback | `id, organizationId, patientId, appointmentId, providerId, rating, comment, source, createdAt, organization, patient, appointment` | `source`: portal/staff/auto; rating 1-5; portal/staff read/request APIs. |
| IntakeForm | `id, organizationId, name, description, active, createdAt, updatedAt, organization, fields, responses` | `active` boolean; form/field CRUD and response read routes. |
| IntakeField | `id, formId, key, label, labelAr, kind, required, options, position, createdAt, form` | `kind`: text/multiline/number/date/boolean/choice. |
| IntakeResponse | `id, organizationId, formId, patientId, appointmentId, answers, createdAt, organization, form, patient` | JSON answer payload; staff and portal reads/writes. |
| ReportSchedule | `id, organizationId, frequency, dayOfMonth, recipients, active, lastSentAt, createdAt, updatedAt, organization` | Scheduled monthly/report delivery configuration. |
| Payment | `id, invoiceId, amount, paymentMethod, stripePaymentId, status, refundedAmount, refundKey, updatedAt, createdAt, invoice, installments` | `status`: pending/completed/failed/refunded; Stripe events and manual refund. |
| InsurancePolicy | `id, patientId, provider, policyNumber, groupNumber, type, createdAt, updatedAt, patient` | `type`: primary/secondary; policy and eligibility routes. |
| InsuranceClaim | `id, organizationId, patientId, invoiceId, claimNumber, status, amountClaimed, amountPaid, denialReason, submittedAt, paidAt, createdAt, updatedAt, organization, patient, invoice` | `status`: submitted/pending/paid/denied/appeal. |
| PricingTier | `id, organizationId, name, description, createdAt, organization` | No direct API route found; likely seed/catalog support only. |
| ServiceCatalog | `id, organizationId, code, name, description, category, durationMins, price, active, createdAt, updatedAt, organization, procedureOrders, invoiceLineItems, servicePackages` | Service catalog CRUD through `/api/catalogs`; `active` boolean. |
| ClinicalCatalog | `id, organizationId, system, code, name, category, description, active, createdAt, updatedAt, organization` | Clinical coding catalog CRUD through `/api/catalogs`. |
| InventoryItem | `id, organizationId, name, sku, category, quantity, reorderLevel, unit, expiryDate, batchNumber, createdAt, updatedAt, organization, transactions` | Stock API, expiry/batch and alert logic. |
| InventoryTransaction | `id, itemId, type, quantity, reason, createdAt, item` | `type`: restock/usage/adjustment; operation is nested under inventory item. |
| Communication | `id, organizationId, patientId, channel, type, status, content, scheduledFor, sentAt, createdAt, updatedAt, organization, patient` | `channel`: sms/email/whatsapp; `status`: pending/sent/delivered/failed. |
| Campaign | `id, organizationId, name, type, status, triggerType, createdAt, updatedAt, organization` | `type`: drip/broadcast; `status`: draft by default; launch route exists. |
| FeedbackSurvey | `id, patientId, encounterId, npsScore, feedback, sentAt, respondedAt, createdAt` | No route-level use found; distinct from `Feedback`. |
| Task | `id, organizationId, title, description, status, priority, dueDate, patientId, assigneeId, creatorId, taskType, createdAt, updatedAt, organization, patient, assignee, creator` | `status`: open/in_progress/completed/cancelled; `priority`: low/medium/high/urgent. |
| Document | `id, organizationId, patientId, procedureOrderId, name, type, storageKey, publicId, mimeType, createdAt, organization, patient, procedureOrder` | `type`: imaging/lab_report/consent/id; Cloudinary storage key. |
| ProcedureOrder | `id, organizationId, patientId, encounterId, orderedById, serviceCatalogId, procedureName, status, scheduledAt, notes, completedAt, createdAt, updatedAt, organization, patient, encounter, orderedBy, serviceCatalog, documents` | `status`: ordered by default; completion fields exist. |
| AuditLog | `id, organizationId, userId, actorType, actorIdentifier, action, entityType, entityId, beforeState, afterState, ipAddress, userAgent, createdAt, organization, user` | Append-only migration; actorType user/patient/system/webhook; actions CREATE/UPDATE/DELETE. |
| Notification | `id, organizationId, recipientId, channel, title, body, entityType, entityId, status, deliveredAt, readAt, failureReason, createdAt, organization, recipient` | `status`: unread by default; notification read/update and push routes. |
| PushSubscription | `id, userId, organizationId, endpoint, p256dh, auth, userAgent, createdAt, updatedAt, user, organization` | Browser push subscription lifecycle. |
| ApiKey | `id, organizationId, name, prefix, keyHash, scopes, active, lastUsedAt, createdAt, updatedAt, organization` | API key create/list/revoke; scopes JSON, e.g. `fhir:write`. |
| Webhook | `id, organizationId, url, secretHash, eventTypes, active, createdAt, updatedAt, organization, deliveries` | Webhook CRUD; delivery is emitted by FHIR/payment paths. |
| WebhookDelivery | `id, webhookId, eventType, attempt, status, payload, responseStatus, responseBody, error, deliveredAt, createdAt, webhook` | `status`: pending/delivered/failed; no direct route, managed by delivery helper. |
| MedicationFavorite | `id, organizationId, userId, medicationName, defaultDosage, defaultFrequency, defaultDuration, usageCount, lastUsedAt, createdAt, organization, user` | Read route and prescription usage support. |
| PrescriptionTemplate | `id, organizationId, createdById, name, specialty, isShared, items, usageCount, createdAt, updatedAt, organization, createdBy` | Template CRUD/use; shared vs private behavior in prescription UI/API. |

### Schema/migration comparison
All 69 models have at least a textual reference in `src` or `prisma/seed.js`. The migration directory has 46 migrations covering the major model additions and later hardening. No model was found with zero source/seed references. However, the following models have no direct `prisma.<model>` reference in a route handler and should be treated as potential indirect/join/seed-only models until confirmed: `RolePermission`, `PatientSession`, `EmergencyContact`, `AppointmentEquipment`, `PrescriptionItem`, `Installment`, `PricingTier`, `InventoryTransaction`, `FeedbackSurvey`, and `WebhookDelivery`.

The repository contains migrations dated `20260913000000_lab_exchange` and `20260914000000_equipment_maintenance`, which are future-dated relative to the inspection date `2026-09-12`; this is a migration-history anomaly worth manual confirmation, not a claim that the database has or has not applied them.

## 3. Domains and Actual Features

The route inventory below is grouped by the domain implemented in the route body. Most tenant-facing handlers call the organization context helper and use organization-scoped Prisma predicates; most mutating handlers call the audit helper and Zod validation. Exceptions are called out.

### Authentication, tenant access, RBAC, plans
*Models:* `Organization`, `User`, `Role`, `RolePermission`, `UserRole`, `Plan`, `Subscription`, `EntitlementOverride`, `PatientSession`.

*Actual API:*
| Route | Method | Actual behavior | Audit | Tenant scoping |
|---|---|---|---|---|
| `/api/auth/[...nextauth]` | NextAuth handler | Credentials/session authentication. | Auth events via auth layer | Session carries org context |
| `/api/auth/forgot-password` | POST | Validates email and creates reset flow. | No mutation audit shown | Global email lookup |
| `/api/auth/reset-password` | POST | Validates reset token, changes password. | Yes | Token/user scoped |
| `/api/auth/verify-email` | POST | Verifies email token. | Yes | User/org scoped |
| `/api/auth/resend-verification` | POST | Resends verification. | No explicit mutation audit | User lookup |
| `/api/auth/2fa/setup` | POST | Creates TOTP setup material. | Yes | User/org |
| `/api/auth/2fa/verify` | POST | Verifies and enables TOTP. | Yes | User/org |
| `/api/auth/2fa/status` | GET | Reads TOTP state. | No | User/org |
| `/api/auth/2fa/disable` | POST | Verifies code and disables TOTP. | Yes | User/org |
| `/api/signup` | POST | Creates organization/owner and seed/onboarding data. | Yes | Creates tenant |
| `/api/plan/entitlements` | GET | Resolves current organization modules/features. | No | Org context |
| `/api/org/request-upgrade` | POST | Stores upgrade request. | Yes | Org context |
| `/api/super/plans` | GET, POST | Super-admin plan catalog list/create. | No explicit audit in route scan | Super-admin context |
| `/api/super/plans/{id}` | GET, PATCH, DELETE | Plan detail/edit/delete. | No explicit audit in route scan | Super-admin context |
| `/api/super/plans/{id}/duplicate` | POST | Duplicates a plan. | No explicit audit in route scan | Super-admin context |
| `/api/super/orgs` | GET | Lists organizations for console. | No | Super-admin context |
| `/api/super/orgs/{orgId}/detail` | GET | Organization detail. | No | Super-admin context |
| `/api/super/orgs/{orgId}/status` | POST | Changes organization status. | Yes | Super-admin context |
| `/api/super/orgs/{orgId}/plan` | POST | Changes organization plan. | Yes | Super-admin context |
| `/api/super/orgs/{orgId}/upgrade` | POST | Processes/approves upgrade. | Yes | Super-admin context |
| `/api/super/orgs/{orgId}/override` | GET, POST | Lists/creates entitlement overrides. | Yes on mutation | Super-admin context |
| `/api/super/orgs/{orgId}/override/{overrideId}` | DELETE | Deletes entitlement override. | Yes | Super-admin context |
| `/api/super/approvals` | GET | Lists pending organization approvals. | No | Super-admin context |
| `/api/super/audit` | GET | Platform audit view with filters. | Read of audit | Super-admin context |
| `/api/super/settings` | GET, PUT | Reads/updates platform settings. | Yes on update | Super-admin context |

*Frontend linkage:* [src/app/(dashboard)/plan/page.tsx](src/app/(dashboard)/plan/page.tsx), [src/app/super/page.tsx](src/app/super/page.tsx), [src/app/super/plans/page.tsx](src/app/super/plans/page.tsx), [src/components/plan/plan-dashboard.tsx](src/components/plan/plan-dashboard.tsx), [src/components/super/super-console.tsx](src/components/super/super-console.tsx), [src/components/super/plans-manager.tsx](src/components/super/plans-manager.tsx), and [src/components/ui/dashboard-with-collapsible-sidebar.tsx](src/components/ui/dashboard-with-collapsible-sidebar.tsx).

*Gaps:* `RolePermission` is foundational but not exposed as a dedicated management route; roles are managed through staff routes. Super-admin plan routes were not marked with the same audit flag as most tenant mutations in the static scan; manual review of the policy is warranted.

### Patients, portal, consent and patient access
*Models:* `Patient`, `PatientAllergy`, `PatientHistory`, `EmergencyContact`, `PatientSession`, `Consent`, `InsurancePolicy`, `Feedback`, `IntakeResponse`, `Document`.

*Actual API:*
- `/api/patients` GET/POST: tenant-scoped patient list/create with validation and audit on create.
- `/api/patients/{id}` GET/PATCH: tenant-scoped detail/update with validation/audit.
- `/api/patients/{id}/archive` POST: archives/restores patient state with audit.
- `/api/patients/{id}/merge` POST: validates survivor/duplicate merge and writes audit.
- `/api/patients/{id}/summary` GET: patient summary projection.
- `/api/patients/{id}/attendance` GET: attendance/late-cancel/no-show information.
- `/api/patients/{id}/history` GET/POST: history read/create, status-aware and audited on create.
- `/api/patients/{id}/allergies` GET/POST and `/allergies/{allergyId}` PATCH/DELETE: allergy CRUD with tenant checks and audit.
- `/api/consents` GET/POST and `/api/consents/{id}` PATCH: staff consent CRUD.
- `/api/insurance/policies` GET/POST and `/policies/{id}/eligibility` GET: policy storage and eligibility response path.
- `/api/insurance/claims` GET/POST and `/claims/{id}` PATCH: claim lifecycle storage.
- `/api/patient-auth/login`, `/logout`, `/me`: patient session login/logout/current-user.
- `/api/patient-portal/overview`, `/appointments/{id}/cancel`, `/appointments/{id}/reschedule`: patient-facing visit operations.
- `/api/patient-portal/consents`, `/documents`, `/invoices`, `/payments`: patient portal records and payment action.
- `/api/patient-portal/feedback`, `/feedback/rateable`: feedback/rating flow.
- `/api/patient-portal/intake/forms`, `/intake`: patient intake form/read/submit flow.

*Frontend linkage:* [src/app/(dashboard)/patients/page.tsx](src/app/(dashboard)/patients/page.tsx), [src/app/(dashboard)/patients/[id]/page.tsx](src/app/(dashboard)/patients/[id]/page.tsx), [src/app/(dashboard)/patients/[id]/summary/page.tsx](src/app/(dashboard)/patients/[id]/summary/page.tsx), [src/app/patient-login/page.tsx](src/app/patient-login/page.tsx), [src/app/patient-portal/page.tsx](src/app/patient-portal/page.tsx), [src/components/patients/add-patient-dialog.tsx](src/components/patients/add-patient-dialog.tsx), [src/components/patients/patient-profile-sheet.tsx](src/components/patients/patient-profile-sheet.tsx), [src/components/patients/patient-allergies-card.tsx](src/components/patients/patient-allergies-card.tsx), [src/components/patients/merge-patients-dialog.tsx](src/components/patients/merge-patients-dialog.tsx), and [src/components/portal/portal-intake-card.tsx](src/components/portal/portal-intake-card.tsx). `MedicalContext` explicitly says initial mock data was removed and data is fetched from APIs.

*Lifecycle/gaps:* Patient status has archive/restore UI. `EmergencyContact` is stored in the patient model graph but has no dedicated route. Insurance claims/policies have API routes but no dashboard nav item/page in the inspected dashboard set.

### Appointments, booking, queue, branches, rooms, shifts and availability
*Models:* `Appointment`, `Branch`, `Room`, `Shift`, `AppointmentEquipment`, `WaitlistEntry`, `Equipment`.

*Actual API:*
- `/api/appointments` GET/POST/PATCH: list, create and update appointments; conflict/idempotency validation, tenant scoping and audit.
- `/api/appointments/{id}/check-in`, `/check-out`, `/no-show`: receptionist lifecycle actions delegated to reception logic; POST plus OPTIONS.
- `/api/appointments/{id}/recurrence`: recurring appointment configuration.
- `/api/appointments/{id}/telehealth`: validates and updates HTTPS meeting link.
- `/api/book/{orgSlug}/availability` GET and `/appointments` POST: public booking availability and create path by organization slug.
- `/api/queue` GET and `/queue/actions` POST: today’s queue and call/complete/no-show actions.
- `/api/branches` GET/POST and `{id}` PATCH: branch CRUD.
- `/api/rooms` GET/POST and `{id}` PATCH: room CRUD.
- `/api/shifts` GET/POST and `{id}` DELETE: weekly rota operations.
- `/api/profile/availability` PATCH: current provider availability.
- `/api/waitlist` GET/POST, `{id}` PATCH, `{id}/book` POST: waitlist creation/status/booking.
- `/api/equipment` GET/POST and `{id}/maintenance` GET/POST: equipment and maintenance schedule.

*Lifecycle:* Appointment: scheduled -> arrived -> in_progress -> completed, with cancelled/no_show terminal alternatives. Waitlist: waiting/offered/cancelled. Equipment maintenance: scheduled/completed/overdue.

*Frontend linkage:* [src/app/(dashboard)/appointments/page.tsx](src/app/(dashboard)/appointments/page.tsx), [src/app/(dashboard)/queue/page.tsx](src/app/(dashboard)/queue/page.tsx), [src/app/(dashboard)/waitlist/page.tsx](src/app/(dashboard)/waitlist/page.tsx), [src/app/(dashboard)/locations/page.tsx](src/app/(dashboard)/locations/page.tsx), [src/app/(dashboard)/availability/page.tsx](src/app/(dashboard)/availability/page.tsx), [src/components/features/appointments/appointments-calendar.tsx](src/components/features/appointments/appointments-calendar.tsx), [src/components/features/appointments/book-appointment-dialog.tsx](src/components/features/appointments/book-appointment-dialog.tsx), [src/components/features/appointments/recurring-appointment-dialog.tsx](src/components/features/appointments/recurring-appointment-dialog.tsx), [src/components/appointments/telehealth-link-dialog.tsx](src/components/appointments/telehealth-link-dialog.tsx), [src/components/waitlist/add-to-waitlist-dialog.tsx](src/components/waitlist/add-to-waitlist-dialog.tsx), [src/components/waitlist/book-from-waitlist-dialog.tsx](src/components/waitlist/book-from-waitlist-dialog.tsx), and [src/components/dashboard/reception-board.tsx](src/components/dashboard/reception-board.tsx).

*Gaps:* `AppointmentEquipment` is schema-only at route level; equipment allocation is not represented by a nav page. The public booking path exists separately from the staff appointment page.

### Clinical encounters, notes, vitals, prescriptions, diagnoses and treatment plans
*Models:* `Encounter`, `EncounterNote`, `Vital`, `Prescription`, `PrescriptionItem`, `Diagnosis`, `FollowUp`, `ClinicalTemplate`, `TreatmentPlan`, `TreatmentPlanStep`, `MedicationFavorite`, `PrescriptionTemplate`, `LabOrder`, `LabResult`, `ProcedureOrder`.

*Actual API:*
- `/api/encounters` GET/POST and `{id}` PATCH: encounter list/create/update with tenant validation/audit.
- `/api/encounters/{id}/notes` POST: creates clinical/SOAP note.
- `/api/vitals` GET/POST, `/vitals/trend` GET, `/vitals/stream` GET: vital recording and projections/streaming.
- `/api/prescriptions` GET/POST and `{id}` PATCH/DELETE: prescription CRUD; status actions are active/completed/cancelled.
- `/api/prescriptions/{id}/send` POST: patient-facing send operation through communications.
- `/api/prescriptions/favorites` GET: user/org medication favorite lookup.
- `/api/prescription-templates` GET/POST, `{id}` PATCH/DELETE, `{id}/use` POST: reusable template lifecycle and usage counter.
- `/api/clinical-templates` GET/POST and `{id}` PATCH/DELETE: encounter note templates.
- `/api/treatment-plans` GET/POST, `{id}` PATCH/DELETE, `{id}/steps` POST/PATCH: plan and step lifecycle.
- `/api/ai/summary` POST and `/api/ai/scribe` POST: provider-configurable AI summary/SOAP assistance; disabled returns a 503-style unavailable result when not configured.
- `/api/clinical-orders` GET/POST: clinical order surface.
- `/api/procedure-orders` GET/POST and `{id}` PATCH: procedure ordering/status.

*Frontend linkage:* [src/app/(dashboard)/encounters/page.tsx](src/app/(dashboard)/encounters/page.tsx), [src/app/(dashboard)/prescriptions/page.tsx](src/app/(dashboard)/prescriptions/page.tsx), [src/components/encounters/encounters-workspace.tsx](src/components/encounters/encounters-workspace.tsx), [src/components/encounters/ai-assist-card.tsx](src/components/encounters/ai-assist-card.tsx), [src/components/prescriptions/new-prescription-dialog.tsx](src/components/prescriptions/new-prescription-dialog.tsx), [src/components/prescriptions/clone-rx-button.tsx](src/components/prescriptions/clone-rx-button.tsx), [src/components/prescriptions/repeat-last-rx-button.tsx](src/components/prescriptions/repeat-last-rx-button.tsx), [src/components/treatment/treatment-plans-section.tsx](src/components/treatment/treatment-plans-section.tsx), and [src/components/print/send-rx-button.tsx](src/components/print/send-rx-button.tsx).

*Gaps:* `PrescriptionItem` is nested and does not have a separate route; the main prescription route supports structured item creation. `Diagnosis` and `FollowUp` are modeled and referenced in summaries/automation, but no standalone CRUD route was found. `FeedbackSurvey` is distinct from the implemented `Feedback` API.

### Labs, imaging, FHIR and procedure documents
*Models:* `LabOrder`, `LabResult`, `ProcedureOrder`, `Document`, `ServiceCatalog`, `ApiKey`, `Webhook`, `WebhookDelivery`.

*Actual API:*
- `/api/labs` GET/POST: lab/result surface used by dashboard.
- `/api/lab-orders` GET/POST, `{id}` PATCH: order list/create/update.
- `/api/lab-orders/{id}/{verb}` POST: generic lab order action; `/transmit` and `/ingest` POST are aliases to exchange handlers.
- `/api/documents` GET/POST, `/generate` POST, `{id}/download` GET, `{id}/token` GET, `/templates` GET: patient document upload/list/generate/download/token operations.
- `/api/uploads` POST: validated Cloudinary upload path.
- `/api/integrations/fhir/{...path}` GET/POST: restricted FHIR read proxy and Patient/Observation write-back; supports session permission or scoped machine API key.
- `/api/api-keys` GET/POST and `{id}/revoke` POST: API key lifecycle.
- `/api/webhooks` GET/POST, `{id}` PATCH/DELETE: webhook registration lifecycle.

*Integration evidence:* [src/app/api/integrations/fhir/[...path]/route.ts](src/app/api/integrations/fhir/[...path]/route.ts) only uses an upstream when `FHIR_BASE_URL` exists, restricts resource/query scope, verifies patient tenant ownership, and emits webhook/audit on write-back. [src/lib/lab-exchange.ts](src/lib/lab-exchange.ts) builds a FHIR-R4-shaped `DiagnosticRequest`, but the code describes a handoff/portal/email exchange rather than a named lab vendor.

*Gaps:* No named external LIS/imaging vendor is configured in `.env.example`; FHIR is generic and disabled without `FHIR_BASE_URL`. `WebhookDelivery` is managed indirectly and has no user-facing delivery page in the dashboard.

### Billing, payments, claims, packages and expenses
*Models:* `Invoice`, `InvoiceLineItem`, `Payment`, `Coupon`, `InstallmentPlan`, `Installment`, `InsuranceClaim`, `InsurancePolicy`, `Expense`, `ServicePackage`, `PatientPackage`, `PricingTier`, `Subscription`.

*Actual API:*
- `/api/billing/invoices` GET/POST: invoice list/create with totals, catalog lines, coupons and idempotency.
- `/api/payments` GET/POST and `{id}/refund` POST: payment list/create/manual refund.
- `/api/installment-plans` GET/POST, `{id}` PATCH, `{id}/pay` POST: installment plans and payment allocation.
- `/api/coupons` GET/POST and `{id}` PATCH: coupon CRUD.
- `/api/insurance/policies` GET/POST, eligibility GET; `/api/insurance/claims` GET/POST and `{id}` PATCH.
- `/api/packages` GET/POST: service package catalog; `/api/patient-packages` GET/POST, `{id}` PATCH/DELETE, `{id}/consume` POST: patient assignment/consumption.
- `/api/expenses` GET/POST and `{id}` DELETE: operating expenses.
- `/api/patient-portal/invoices` GET and `/patient-portal/payments` POST: patient billing view/payment.
- `/api/webhooks/stripe` POST: verifies Stripe signature and applies idempotent payment success/failure/refund transitions, updating invoice amounts and writing audit logs.

*Frontend linkage:* [src/app/(dashboard)/billing/page.tsx](src/app/(dashboard)/billing/page.tsx), [src/app/(dashboard)/payments/page.tsx](src/app/(dashboard)/payments/page.tsx), [src/components/billing/new-invoice-dialog.tsx](src/components/billing/new-invoice-dialog.tsx), [src/components/billing/payment-dialog.tsx](src/components/billing/payment-dialog.tsx), [src/components/billing/installment-plans-dialog.tsx](src/components/billing/installment-plans-dialog.tsx), [src/components/packages/packages-section.tsx](src/components/packages/packages-section.tsx), and [src/app/(dashboard)/print/receipt/[invoiceId]/page.tsx](src/app/(dashboard)/print/receipt/[invoiceId]/page.tsx).

*Integration evidence:* Stripe is a real SDK/webhook path but uses a test dummy constructor key when `STRIPE_SECRET_KEY` is absent. No payment gateway other than Stripe appears in source.

*Gaps:* `PricingTier` has no direct route; insurance is API-backed but lacks a matching dashboard nav/page in the inspected dashboard. Payment creation exists, but the actual checkout initiation surface should be manually verified against the payment component.

### Communications, campaigns, notifications and reports
*Models:* `Communication`, `Campaign`, `Notification`, `PushSubscription`, `ReportSchedule`, `Feedback`.

*Actual API:*
- `/api/communications` GET/POST: communication list/create.
- `/api/communications/scheduled` GET/POST: scheduled processing/list path.
- `/api/communications/appointment-reminders` GET/POST: reminder generation/sending path.
- `/api/communications/campaigns` GET/POST and `{id}/launch` POST: campaign CRUD/launch.
- `/api/notifications` GET/POST and `{id}` PATCH: in-app notification list/create/read state.
- `/api/notifications/push` POST/DELETE: browser push subscription registration/removal.
- `/api/reports/monthly` GET: monthly report data/export.
- `/api/reports/schedules` GET/POST and `{id}` DELETE, `/api/reports/scheduled` POST: report schedule management/execution.
- `/api/feedback` GET and `/feedback/request` POST: staff feedback read/request.

*Frontend linkage:* [src/app/(dashboard)/communications/page.tsx](src/app/(dashboard)/communications/page.tsx), [src/app/(dashboard)/campaigns/page.tsx](src/app/(dashboard)/campaigns/page.tsx), [src/app/(dashboard)/reports/page.tsx](src/app/(dashboard)/reports/page.tsx), [src/components/communications/add-communication-dialog.tsx](src/components/communications/add-communication-dialog.tsx), [src/components/communications/add-campaign-dialog.tsx](src/components/communications/add-campaign-dialog.tsx), [src/components/reports/reports-dashboard.tsx](src/components/reports/reports-dashboard.tsx), [src/components/reports/report-schedule-card.tsx](src/components/reports/report-schedule-card.tsx), and notification/PWA components.

*External provider reality:* [src/lib/communications.ts](src/lib/communications.ts) uses Twilio when `TWILIO_ACCOUNT_SID` is configured for SMS/WhatsApp; email uses Nodemailer transport with environment credentials. There is no WhatsApp-specific vendor other than Twilio. The templates are hardcoded approved campaign templates, but delivery is provider-backed when configured.

*Gaps:* `.env.example` in the inspected repository does not list the Twilio variables used in source (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `TWILIO_WHATSAPP_NUMBER`), so deployment configuration needs manual confirmation. Cron-style communication routes require `CRON_SECRET` in production.

### Inventory, settings, documents and operational support
*Models:* `InventoryItem`, `InventoryTransaction`, `Equipment`, `EquipmentMaintenance`, `Task`, `Document`, `Branch`, `Room`, `User`.

*Actual API:* `/api/inventory` GET/POST, `{id}` PATCH, `{id}/transaction` POST, `/alerts` GET/POST; `/api/tasks` GET/POST and `{id}` PATCH; `/api/settings` GET/PATCH; `/api/profile/avatar` GET/PATCH; `/api/org/export` GET; `/api/audit` GET; `/api/health` GET; `/api/ready` GET.

*Frontend linkage:* [src/app/(dashboard)/inventory/page.tsx](src/app/(dashboard)/inventory/page.tsx), [src/app/(dashboard)/tasks/page.tsx](src/app/(dashboard)/tasks/page.tsx), [src/app/(dashboard)/settings/page.tsx](src/app/(dashboard)/settings/page.tsx), [src/app/(dashboard)/security/page.tsx](src/app/(dashboard)/security/page.tsx), [src/app/(dashboard)/audit/page.tsx](src/app/(dashboard)/audit/page.tsx), [src/components/inventory/add-item-dialog.tsx](src/components/inventory/add-item-dialog.tsx), [src/components/tasks/create-task-dialog.tsx](src/components/tasks/create-task-dialog.tsx), and settings/PWA components.

*Actual controls:* tenant-scoped validation/audit is present on mutations; organization export is owner-protected and emits a JSON snapshot/checksum path; readiness checks PostgreSQL with `SELECT 1`; liveness only reports process health.

## 4. Dashboard Pages versus Actual Navigation

### Dashboard pages found
The dashboard route group contains 34 page files:

`/analytics`, `/appointments`, `/audit`, `/automation`, `/availability`, `/billing`, `/campaigns`, `/catalogs`, `/communications`, `/consents`, `/dashboard`, `/documents`, `/encounters`, `/help`, `/inventory`, `/labs`, `/locations`, `/patients`, `/patients/[id]`, `/patients/[id]/summary`, `/payments`, `/plan`, `/prescriptions`, `/print/prescription/[id]`, `/print/receipt/[invoiceId]`, `/queue`, `/reports`, `/security`, `/settings`, `/staff`, `/tasks`, `/waitlist`.

Other actual pages are `/`, `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email`, `/demo-accounts`, `/patient-login`, `/patient-portal`, `/book/[orgSlug]`, `/suspended`, `/~offline`, `/super`, `/super/plans`, and `/super/clinics/[orgId]`.

### Nav items without a real page / pages without a nav item
| Item | Result | Evidence |
|---|---|---|
| Staff nav `/staff` | Page exists | sidebar + `src/app/(dashboard)/staff/page.tsx` |
| Super nav `/super?section=...` and `/super/plans` | Pages exist; query sections are handled by the super console | sidebar + `src/app/super/page.tsx`, `src/app/super/plans/page.tsx` |
| Print receipt/prescription pages | No nav item, intentional utility routes | print page files are linked by feature components |
| Patient detail/summary pages | No nav item, reached from patient list | patient page files and patient components |
| Insurance policies/claims | API exists but no dashboard nav/page found | `src/app/api/insurance/**` without matching dashboard page |
| Intake forms | UI is nested in settings, no dedicated nav item | `src/components/settings/intake-forms-manager.tsx` |
| Equipment/maintenance | API/UI support exists but no dedicated nav item/page found | `src/app/api/equipment/**` |
| `/api/...` routes | Not nav destinations by design | API route tree |

No sidebar href was found whose target page is absent. The nav itself is role-filtered and plan-locked in [dashboard-with-collapsible-sidebar.tsx](src/components/ui/dashboard-with-collapsible-sidebar.tsx); Super Admin navigation intentionally replaces clinic navigation.

## 5. i18n Namespaces / Prefixes

The project has English and Arabic dictionaries: [en.ts](src/lib/i18n/dictionaries/en.ts) has 1,765 keys and [ar.ts](src/lib/i18n/dictionaries/ar.ts) has 1,768 keys. Locale support is explicitly `en`/`ar` in [locale.ts](src/lib/i18n/locale.ts).

| Prefixes discovered | UI/API evidence |
|---|---|
| `common`, `pagination`, `nav`, `header`, `shell`, `perm` | Shared shell, navigation, common controls, permission-denied UI |
| `auth`, `signup`, `forgot`, `reset`, `verify`, `suspended`, `portal` | Auth and patient portal pages |
| `patients`, `addPatient`, `profile`, `allergy`, `bloodType`, `gender`, `emergencyName`, `emergencyPhone`, `primaryCare`, `firstName`, `lastName`, `email`, `phone`, `secondaryPhone`, `street`, `city`, `state`, `zip` | Patient forms/profile and allergy UI |
| `appt`, `appts`, `apptType`, `book`, `recurr`, `availability`, `calendar`, `queue`, `waitlist`, `wl`, `tele`, `locations` | Scheduling, booking, queue, waitlist and location components |
| `enc`, `doctor`, `ai`, `tp`, `trend`, `vitals`, `rx`, `print`, `lab`, `labs`, `inv`, `doc`, `consent`, `consentType` | Clinical workspace, AI, treatment, vital, prescription, lab, inventory, document and consent UI |
| `billing`, `pay`, `inst`, `exp`, `pkg`, `plan`, `plans`, `upg` | Billing, payments, installments, expenses, packages and entitlement UI |
| `comm`, `camp`, `automation`, `reports`, `audit`, `analytics`, `feedback`-related keys | Communications, campaigns, signals, reporting and audit UI |
| `settings`, `staff`, `security`, `super`, `clinic`, `featureTip`, `tip`, `lang`, `landing`, `dash`, `help` | System/admin/landing/help and feature-tip UI |

`unprefixed` keys also exist for standalone form labels/placeholders such as first name and city. The dictionaries have slightly different key counts, so exact parity is not proven by count alone; there is an existing `tests/unit/i18n-parity.test.ts` for the intended parity check.

## 6. Incomplete, Placeholder, Mock, or Feature-Flagged Code

| File | Finding | Classification | Effect |
|---|---|---|---|
| [src/lib/i18n/dictionaries/en.ts](src/lib/i18n/dictionaries/en.ts) | `portal_comingSoon: "Coming soon"` | Explicit incomplete UI | Patient portal advertises a not-yet-available surface/key. |
| [src/components/landing/app-preview.tsx](src/components/landing/app-preview.tsx) | Comments `Mock topbar`, `Mock sidebar`, `Mock main`, `Mock weekly chart`, `Mock list` | Intentional marketing mock | Landing preview is illustrative, not live dashboard data. |
| [src/components/landing/clinic-showcase.tsx](src/components/landing/clinic-showcase.tsx) | `Mock activity sparkline` comment | Intentional marketing mock | Showcase visualization is static/illustrative. |
| [src/lib/stripe.ts](src/lib/stripe.ts) | `sk_test_dummy` fallback when secret is absent | Development fallback | Stripe client can construct, but real operations require env configuration. |
| [src/lib/prisma.ts](src/lib/prisma.ts) | Dummy proxy when DB is skipped during build | Build fallback | `SKIP_DB_INIT`/build mode must not be treated as runtime data availability. |
| [src/lib/boot-env.ts](src/lib/boot-env.ts) | Rejects placeholder secrets in production | Feature/config gate | Production boot fails closed without valid `NEXTAUTH_SECRET` and `ENCRYPTION_KEY`. |
| [src/lib/ai.ts](src/lib/ai.ts) | Provider `none` by default or missing `AI_API_KEY` | Feature flag/config gate | AI summary/scribe is unavailable until provider/key are configured. |
| [src/app/api/integrations/fhir/[...path]/route.ts](src/app/api/integrations/fhir/[...path]/route.ts) | Empty `FHIR_BASE_URL` returns integration-not-configured | Feature flag/config gate | Generic FHIR integration is disabled until configured. |
| [src/lib/cloudinary.ts](src/lib/cloudinary.ts) | Missing Cloudinary credentials throw configuration error | Feature/config gate | Uploads require all three Cloudinary credentials. |
| [src/lib/communications.ts](src/lib/communications.ts) | Missing Twilio returns `Twilio not configured`; Nodemailer uses fallback test credentials | Provider fallback | Messaging behavior depends on deployment env. |
| [src/app/api/communications/scheduled/route.ts](src/app/api/communications/scheduled/route.ts) and reminder route | Production cron requires `CRON_SECRET` per `.env.example` | Security/config gate | Scheduled messaging cannot be safely enabled without secret. |
| [src/components/landing/*](src/components/landing/) | Landing uses static presentation values and demo login buttons | Intentional demo/marketing data | Not evidence of dashboard mock data. |
| [src/lib/boot-env.ts](src/lib/boot-env.ts) / [src/lib/auth.ts](src/lib/auth.ts) | Development placeholder-password handling exists | Development-only path | Local seed/demo behavior must not be interpreted as production auth. |

No generic `TODO`/`FIXME` marker was found in the main source scan that proves a missing runtime implementation. The explicit `coming soon`, mock, fallback, and configuration gates above are the material findings.

## 7. Potentially Dead or Indirect Models and Routes

### Models with no direct route-handler Prisma reference
`RolePermission`, `PatientSession`, `EmergencyContact`, `AppointmentEquipment`, `PrescriptionItem`, `Installment`, `PricingTier`, `InventoryTransaction`, `FeedbackSurvey`, `WebhookDelivery`.

This does not prove dead code. Several are nested writes, auth internals, join models, seed/catalog models, or helper-managed delivery records. They are listed because the route-level static check could not find direct `prisma.<model>` use.

### Routes requiring manual confirmation
- `/api/lab-orders/{id}/transmit` and `/api/lab-orders/{id}/ingest` export `POST` by alias (`export const POST = ...`) rather than a function declaration; they are implemented, but simple method scanners can miss them.
- `/api/auth/[...nextauth]` delegates to NextAuth and has no local CRUD method declaration.
- `/api/patient-auth/me` and `/api/patient-auth/logout` delegate heavily to patient session helpers; direct Prisma use is not visible in the route file for every operation.
- `/api/health` is liveness-only and intentionally does not check dependencies; `/api/ready` checks PostgreSQL.
- `/api/documents/templates` is read-only and returns template definitions from helper code rather than a Prisma model.

## 8. Summary

- **Schema models:** 69.
- **API route files:** 167 under `src/app/api`.
- **Dashboard page files:** 34 under `src/app/(dashboard)`; 47 `page.tsx` files under `src/app` overall.
- **Locales:** English and Arabic; 1,765 English keys and 1,768 Arabic keys by declaration count.
- **Migrations:** 46 checked-in migrations; two are dated after the inspection date and need manual migration-state confirmation.
- **Largest implementation domains by observable surface:**
  1. Clinical/EMR (encounters, notes, vitals, prescriptions, labs, procedures, treatment plans, templates, AI).
  2. Patient and patient portal (profiles, history, allergies, consent, insurance, documents, feedback, intake).
  3. Scheduling/operations (appointments, booking, queue, waitlist, branches, rooms, shifts, availability).
  4. Billing/RCM (invoices, payments, refunds, Stripe, installments, coupons, packages, insurance, expenses).
  5. Platform/SaaS (tenancy, auth, RBAC, plans, entitlements, audit, API keys, webhooks, super console).
- **Least clear domains from code-only evidence:** insurance claims/policies (API without a matching dashboard page), equipment allocation/maintenance (schema/API without dashboard nav), `FeedbackSurvey` versus implemented `Feedback`, and generic lab/FHIR exchange (configured through env and generic protocols rather than a named vendor).
- **Strong evidence of implementation:** tenant-aware routes, Zod validation in most mutation paths, audit calls in most writes, patient/role/plan-gated navigation, real Prisma migrations, unit/integration/E2E tests, and explicit provider failure modes.
- **Main confirmation items:** deployment environment values, whether future-dated migrations are applied, whether nested models are intentionally API-less, whether the Nodemailer fallback is acceptable outside development, and whether insurance/equipment/lab exchange need dedicated user-facing pages.

## Appendix A. Complete API Route Manifest

The following is the complete file-derived manifest of the 167 `route.ts` handlers. Methods are the exported HTTP handlers; alias exports such as the lab exchange `POST` handlers are included.

```text
/api/ai/scribe                         POST
/api/ai/summary                        POST
/api/analytics/dashboard               GET
/api/api-keys                          GET, POST
/api/api-keys/{id}/revoke              POST
/api/appointments                      GET, POST, PATCH
/api/appointments/{id}/check-in       POST, OPTIONS
/api/appointments/{id}/check-out      POST, OPTIONS
/api/appointments/{id}/no-show        POST, OPTIONS
/api/appointments/{id}/recurrence     POST
/api/appointments/{id}/telehealth     PATCH
/api/audit                             GET
/api/auth/[...nextauth]                delegated NextAuth handler
/api/auth/2fa/disable                  POST
/api/auth/2fa/setup                    POST
/api/auth/2fa/status                   GET
/api/auth/2fa/verify                   POST
/api/auth/forgot-password              POST
/api/auth/resend-verification          POST
/api/auth/reset-password               POST
/api/auth/verify-email                 POST
/api/automation/signals                GET
/api/billing/invoices                  GET, POST
/api/book/{orgSlug}/appointments      POST
/api/book/{orgSlug}/availability      GET
/api/branches                          GET, POST
/api/branches/{id}                     PATCH
/api/catalogs                          GET, POST
/api/clinical-orders                   GET, POST
/api/clinical-templates                GET, POST
/api/clinical-templates/{id}           PATCH, DELETE
/api/communications                    GET, POST
/api/communications/appointment-reminders GET, POST
/api/communications/campaigns          GET, POST
/api/communications/campaigns/{id}/launch POST
/api/communications/scheduled          GET, POST
/api/consents                          GET, POST
/api/consents/{id}                     PATCH
/api/coupons                           GET, POST
/api/coupons/{id}                      PATCH
/api/cron/follow-up-escalation         POST
/api/documents                         GET, POST
/api/documents/{id}/download           GET
/api/documents/{id}/token              GET
/api/documents/generate                POST
/api/documents/templates               GET
/api/encounters                        GET, POST
/api/encounters/{id}                   PATCH
/api/encounters/{id}/notes             POST
/api/equipment                         GET, POST
/api/equipment/{id}/maintenance        GET, POST
/api/expenses                          GET, POST
/api/expenses/{id}                     DELETE
/api/feedback                          GET
/api/feedback/request                  POST
/api/health                            GET
/api/insurance/claims                  GET, POST
/api/insurance/claims/{id}             PATCH
/api/insurance/policies                GET, POST
/api/insurance/policies/{id}/eligibility GET
/api/installment-plans                 GET, POST
/api/installment-plans/{id}            PATCH
/api/installment-plans/{id}/pay        POST
/api/integrations/fhir/{...path}       GET, POST
/api/intake-forms                      GET, POST
/api/intake-forms/{id}                 PATCH, DELETE
/api/intake-forms/{id}/fields          POST
/api/intake-responses                  GET
/api/inventory                         GET, POST
/api/inventory/{id}                    PATCH
/api/inventory/{id}/transaction        POST
/api/inventory/alerts                  GET, POST
/api/lab-orders                        GET, POST
/api/lab-orders/{id}                   PATCH
/api/lab-orders/{id}/ingest            POST (alias export)
/api/lab-orders/{id}/transmit         POST (alias export)
/api/lab-orders/{id}/{verb}            POST
/api/labs                             GET, POST
/api/notifications                     GET, POST
/api/notifications/{id}                PATCH
/api/notifications/push                POST, DELETE
/api/org/export                        GET
/api/org/request-upgrade               POST
/api/packages                          GET, POST
/api/patient-auth/login                POST
/api/patient-auth/logout               POST
/api/patient-auth/me                   GET
/api/patient-packages                  GET, POST
/api/patient-packages/{id}             PATCH, DELETE
/api/patient-packages/{id}/consume     POST
/api/patient-portal/appointments/{id}/cancel POST
/api/patient-portal/appointments/{id}/reschedule PATCH
/api/patient-portal/consents           GET, POST
/api/patient-portal/documents          GET
/api/patient-portal/feedback           GET, POST
/api/patient-portal/feedback/rateable  GET
/api/patient-portal/intake             GET, POST
/api/patient-portal/intake/forms       GET
/api/patient-portal/invoices           GET
/api/patient-portal/overview           GET
/api/patient-portal/payments           POST
/api/patients                          GET, POST
/api/patients/{id}                     GET, PATCH
/api/patients/{id}/allergies           GET, POST
/api/patients/{id}/allergies/{allergyId} PATCH, DELETE
/api/patients/{id}/archive             POST
/api/patients/{id}/attendance          GET
/api/patients/{id}/history             GET, POST
/api/patients/{id}/merge               POST
/api/patients/{id}/summary             GET
/api/payments                          GET, POST
/api/payments/{id}/refund              POST
/api/plan/entitlements                 GET
/api/prescriptions                     GET, POST
/api/prescriptions/{id}                PATCH, DELETE
/api/prescriptions/{id}/send           POST
/api/prescriptions/favorites           GET
/api/prescription-templates            GET, POST
/api/prescription-templates/{id}       PATCH, DELETE
/api/prescription-templates/{id}/use   POST
/api/procedure-orders                  GET, POST
/api/procedure-orders/{id}             PATCH
/api/profile/availability              PATCH
/api/profile/avatar                    GET, PATCH
/api/queue                             GET
/api/queue/actions                     POST
/api/ready                             GET
/api/reports/monthly                   GET
/api/reports/scheduled                 POST
/api/reports/schedules                 GET, POST
/api/reports/schedules/{id}            DELETE
/api/rooms                             GET, POST
/api/rooms/{id}                        PATCH
/api/settings                          GET, PATCH
/api/shifts                            GET, POST
/api/shifts/{id}                       DELETE
/api/signup                            POST
/api/staff                             GET, PATCH
/api/staff/roles                       GET, POST
/api/super/approvals                   GET
/api/super/audit                       GET
/api/super/orgs                        GET
/api/super/orgs/{orgId}/detail         GET
/api/super/orgs/{orgId}/override      GET, POST
/api/super/orgs/{orgId}/override/{overrideId} DELETE
/api/super/orgs/{orgId}/plan           POST
/api/super/orgs/{orgId}/status         POST
/api/super/orgs/{orgId}/upgrade        POST
/api/super/plans                       GET, POST
/api/super/plans/{id}                  GET, PATCH, DELETE
/api/super/plans/{id}/duplicate        POST
/api/super/settings                    GET, PUT
/api/tasks                             GET, POST
/api/tasks/{id}                        GET, PUT
/api/treatment-plans                    GET, POST
/api/treatment-plans/{id}              GET, POST
/api/treatment-plans/{id}/steps        POST, PATCH
/api/uploads                           POST
/api/vitals                             GET, POST
/api/vitals/stream                      GET
/api/vitals/trend                       GET
/api/waitlist                           GET, POST
/api/waitlist/{id}                      PATCH
/api/waitlist/{id}/book                 POST
/api/webhooks                           GET, POST
/api/webhooks/{id}                      PATCH, DELETE
/api/webhooks/stripe                    POST
```

The manifest intentionally preserves route-level names and does not merge nested routes into a single conceptual endpoint. The route bodies and domain findings above are the behavioral interpretation of this manifest.
