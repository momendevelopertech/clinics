# Seed Coverage Report — Phase C

Based on direct grep of `prisma/seed.js` for `prisma.<model>.create|createMany|upsert`.
"Current rows" is qualitative (seed writes are counted as code paths, not DB counts);
Phase C targets all had zero write statements, confirmed by grep returning no matches
except `feedbackSurvey` (a different model from `feedback`).

> VERIFIED 2026-09-14: Phase C blocks merged into `prisma/seed.js`, full seed ran
> clean ("Seed complete."), and live counts are guarded by
> `tests/integration/seed-coverage.test.ts` (3/3 pass): 12+ services, 7 ICD-10 +
> 9 LAB clinical codes, 5 insurance providers, 3 SOAP + 4 Rx templates, 3 coupons,
> 10+ shifts, 2 packages, treatment plan, intake form, 4 expenses, 3 feedbacks,
> 3 allergies, report schedule, 2 maintenances, API key, webhook, 20 patients,
> 30+ appointments, 10+ invoices. Also fixed in passing: bulk-appointment
> minute staggering for the `(providerId, startTime)` unique index.

| Model | Current rows | Sufficient / Insufficient | What snippet adds |
|---|---|---|---|
| Organization | 2 (platform-admin + Alexandria) | sufficient | nothing |
| User | 9 (superadmin, doctor x2, owner, coordinator, receptionist, biller, nurse, pharmacist) | sufficient | nothing |
| Role / RolePermission / UserRole | 7 roles + permissions + links | sufficient | nothing |
| Patient / EmergencyContact | 20 patients + contacts | sufficient | nothing |
| Branch | 3 (Smouha, Sidi Gaber, Mahatet El-Raml) | sufficient | nothing |
| Room | 4 | sufficient | nothing |
| Equipment | 4 (xray, ultrasound, ECG, holter) | sufficient | nothing |
| ServiceCatalog | 12 | sufficient | nothing |
| ClinicalCatalog | 7 | sufficient | nothing |
| PricingTier | 3 | sufficient | nothing |
| Appointment / AppointmentEquipment | ~43 + slots | sufficient | nothing |
| Encounter / EncounterNote / Vital | ~14 / ~14 / ~15 | sufficient | nothing |
| Diagnosis | ~18 | sufficient | nothing |
| PatientHistory | 3 | sufficient | nothing |
| FollowUp | ~12 | sufficient | nothing |
| Prescription / PrescriptionItem | ~15 / ~16 | sufficient | nothing |
| LabOrder / LabResult | ~16 / ~10 | sufficient | nothing |
| ProcedureOrder | ~9 | sufficient | nothing |
| Document | ~19 | sufficient | nothing |
| Consent | ~21 | sufficient | nothing |
| InsurancePolicy / InsuranceClaim | ~11 / ~10 | sufficient | nothing |
| Invoice / InvoiceLineItem / Payment | ~19 / ~19 / ~10 | sufficient | reused as InstallmentPlan parent (INV-2026-000101) |
| InventoryItem / InventoryTransaction | 15 / ~20 | sufficient | nothing |
| Communication | ~22 | sufficient | nothing |
| Campaign | 3 | sufficient | nothing |
| Task | ~18 | sufficient | nothing |
| WaitlistEntry | ~12 | sufficient | nothing |
| FeedbackSurvey | ~6 | sufficient | nothing (distinct from Feedback) |
| Notification | ~13 | sufficient | nothing |
| AuditLog | ~24 | sufficient | nothing |
| ClinicalTemplate | 0 | insufficient | 3 SOAP templates: adult HTN follow-up, pediatric URI, antenatal |
| PrescriptionTemplate | 0 | insufficient | 4 templates: HTN shared, diabetes shared, URI private, pediatric fever private |
| Coupon | 0 | insufficient | 3 coupons: WELCOME10 percent 10, RAMADAN20 percent 20, FIXED50 fixed |
| Shift | 0 | insufficient | 14 weekday rows for doctor/nurse/reception/coordinator roles |
| ServicePackage | 0 | insufficient | 2 packages: diabetes quarterly bundle, physio 8-session pack |
| PatientPackage | 0 | insufficient | 1 active package (MRN-1003 on diabetes bundle) |
| TreatmentPlan | 0 | insufficient | 1 HTN plan (MRN-1001) |
| TreatmentPlanStep | 0 | insufficient | 3 steps under the HTN plan |
| IntakeForm | 0 | insufficient | 1 new-patient registration form |
| IntakeField | 0 | insufficient | 4 fields: national_id, chief_complaint, chronic_diseases, visit_date |
| Expense | 0 | insufficient | 4 expenses: rent, salaries, supplies, utilities (EGP) |
| Feedback | 0 | insufficient | 3 feedback rows (portal/portal/staff) |
| ReportSchedule | 0 | insufficient | 1 monthly owner report (recipients: owner + biller) |
| EquipmentMaintenance | 0 | insufficient | 2 calibration rows (X-ray completed, ECG scheduled) |
| PatientAllergy | 0 | insufficient | 3 allergies: penicillin (MRN-1001), sulfa (MRN-1005), peanut (MRN-1004) |
| InstallmentPlan | 0 | insufficient | 1 active plan on INV-2026-000101 |
| Installment | 0 | insufficient | 3 installments (110/110/100 EGP) |
| ApiKey | 0 | insufficient | 1 demo key (hashed placeholder, prefix ohcrm_demo) |
| Webhook | 0 | insufficient | 1 appointment webhook (created/cancelled events) |
| WebhookDelivery | 0 | insufficient (intentional) | nothing (runtime delivery log, seeded implicitly by app) |
| MedicationFavorite | 0 | insufficient (out of scope) | nothing (user-specific runtime data) |
| IntakeResponse | 0 | insufficient (out of scope) | nothing (patient-submitted runtime data) |
| PatientSession | 0 (cleared) | sufficient (intentional) | nothing (ephemeral auth sessions) |
| PushSubscription | 0 | insufficient (out of scope) | nothing (device runtime data) |
| Subscription / Plan / EntitlementOverride | 0 | out of scope for Phase C | nothing |
