# Clinic Management Delivery Plan

This file is the execution tracker for the product blueprint. Work proceeds in
order: finish and verify one task before starting the next dependent task.

## Phase 0 — Audit and delivery controls

- [x] P0-T1 — Baseline audit and delivery backlog

## Phase 1 — Foundation

- [x] P1-T1 — Tenant branches and room foundations
- [x] P1-T2 — Staff/doctor operational profiles and assignments
- [x] P1-T3 — Service and clinical catalogs
- [x] P1-T4 — Patient MRN, structured history, and archive workflow

## Phase 2 — Clinic operations

- [x] P2-T1 — Appointment lifecycle and scheduling validation
- [x] P2-T2 — Tenant-backed scheduling UI
- [x] P2-T3 — Check-in, walk-in, and queue projection
- [x] P2-T4 — Encounter lifecycle and clinical capture
- [ ] P2-T3 — Check-in, walk-in, and queue projection
- [ ] P2-T4 — Encounter lifecycle and clinical capture

## Phase 3 — Clinical

- [x] P3-T1 — Diagnoses, follow-ups, and itemized prescriptions
- [x] P3-T2 — Lab and imaging orders through reviewed results
- [ ] P3-T3 — Procedure orders and clinical documents *(in progress)*
- [ ] P3-T4 — Read-only patient medical timeline

## Phase 4 — Financial

- [ ] P4-T1 — Catalog-backed invoice items and server totals
- [ ] P4-T2 — Payment allocation, refunds, and balances
- [ ] P4-T3 — Charge-generation policy *(blocked: product decision required)*

## Phase 5 — Platform and security

- [ ] P5-T1 — Complete role/permission matrix and staff management
- [ ] P5-T2 — Centralized audit event capture
- [ ] P5-T3 — Event-driven notification records and adapters
- [ ] P5-T4 — Persisted clinic settings

## Phase 6 — Analytics

- [ ] P6-T1 — Dashboard KPI and report projections

## Phase 7 — AI and automation

- [ ] P7-T1 — Deferred until explicitly approved; no AI mutation of clinical records

## Delivery rule

Each task must include schema/API/UI changes where applicable, tenant and
authorization checks, audit coverage for writes, automated tests, and passing
typecheck/lint/build before it is marked complete.
