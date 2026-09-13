---
name: Clinical Enterprise OS
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3d4947'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#6d7a77'
  outline-variant: '#bcc9c6'
  surface-tint: '#006a61'
  primary: '#00685f'
  on-primary: '#ffffff'
  primary-container: '#008378'
  on-primary-container: '#f4fffc'
  inverse-primary: '#6bd8cb'
  secondary: '#545f73'
  on-secondary: '#ffffff'
  secondary-container: '#d5e0f8'
  on-secondary-container: '#586377'
  tertiary: '#0058be'
  on-tertiary: '#ffffff'
  tertiary-container: '#2170e4'
  on-tertiary-container: '#fefcff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#89f5e7'
  primary-fixed-dim: '#6bd8cb'
  on-primary-fixed: '#00201d'
  on-primary-fixed-variant: '#005049'
  secondary-fixed: '#d8e3fb'
  secondary-fixed-dim: '#bcc7de'
  on-secondary-fixed: '#111c2d'
  on-secondary-fixed-variant: '#3c475a'
  tertiary-fixed: '#d8e2ff'
  tertiary-fixed-dim: '#adc6ff'
  on-tertiary-fixed: '#001a42'
  on-tertiary-fixed-variant: '#004395'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: IBM Plex Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-xl-mobile:
    fontFamily: IBM Plex Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: IBM Plex Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: IBM Plex Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0em
  body-lg:
    fontFamily: IBM Plex Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0em
  body-md:
    fontFamily: IBM Plex Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: IBM Plex Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-md:
    fontFamily: IBM Plex Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: IBM Plex Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.025em
  mono-metric:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0em
  mono-code:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
    letterSpacing: 0.02em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  space-2xs: 0.125rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-base: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
  gutter: 1rem
  sidebar-width: 17.5rem
  subnav-width: 15rem
---

## Brand & Style

This design system establishes a high-density, authoritative, and frictionless operating environment for modern polyclinics, diagnostic centers, and hospital networks. Designed natively for high-velocity clinical workflows, the visual language balances clinical precision with reassuring calm, reducing cognitive fatigue during extended shifts.

### Design Movement: Clinical Functionalism
The aesthetic synthesizes modern corporate rigor with clinical ergonomics:
- **Zero Distraction:** Ultra-clean planar surfaces, subtle dividers, and purposeful color coding eliminate ambiguous visual noise.
- **Bilingual Typographic Harmony:** Native Right-to-Left (RTL) Arabic layout architectures integrated symmetrically with Left-to-Right (LTR) international medical nomenclature (ICD-10, dosage, Rx codes).
- **Critical Contrast Hierarchy:** Vital signs, allergy warnings, and triage statuses command immediate peripheral attention without jarring panic, relying on precise functional chroma tokens rather than decorative ornamentation.
- **Dense Data Integrity:** Compact form inputs, calibrated metric tables, synchronized doctor/patient identity tags, and linear progression timelines designed for keyboard-first navigation and rapid diagnostic skimming.

## Colors

The palette is rooted in sterile, high-legibility clinical pigments. It pairs deep clinical teal with grounded slate and purposeful functional accents to maintain strict semantic consistency across patient records, appointment queues, and prescription orders.

### Palette Architecture
- **Primary (`#0D9488` / Teal 600; Deep State `#0F766E` / Teal 700):** Symbolizes clinical sterility, precision, and authority. Applied to primary CTAs, active module highlights, patient identity anchors, and selected navigation states.
- **Secondary (`#1E293B` / Slate 800; Accent `#3B82F6` / Blue 500):** Anchors the typographic foundation and structure. Blue 500 serves as secondary clinical telemetry (e.g., vitals metrics, lab links, active diagnostic tools).
- **Neutral & Surface Foundations:**
  - Base Application Canvas: `#F8FAFC` (Slate 50)
  - Card & Modal Surfaces: `#FFFFFF`
  - Subtle Dividing Lines & Structural Outlines: `#E2E8F0` (Slate 200)
  - Secondary Borders / Muted Dividers: `#CBD5E1` (Slate 300)
  - Primary Typographic Body: `#0F172A` (Slate 900)
  - Muted Metadata & Sub-labels: `#64748B` (Slate 500)

### Status & Semantic Clinical Tokens
- **Success / Completed / Normal Vitals (`#10B981`):** Represents verified doses, checked-in appointments, normal biometric ranges, and completed laboratory runs. Surface tint: `#ECFDF5`.
- **Warning / Pending / Clinical Observation (`#F59E0B`):** Represents pending lab cultures, triage wait warnings, and unconfirmed patient histories. Surface tint: `#FFFBEB`.
- **Critical Alert / Allergy / Emergency (`#EF4444`):** Dictates severe drug-drug interactions, known anaphylactic allergies, DNR notes, and critical code alarms. Surface tint: `#FEF2F2`.

## Typography

The typographic system relies on **IBM Plex Sans** (paired natively with **IBM Plex Sans Arabic** in bilingual environments) for balanced structural rhythm, neutral legibility, and geometric clarity across both RTL and LTR viewports. **JetBrains Mono** is designated for numerical values, dosages, ICD-10/CPT billing codes, lab metrics, and medical timestamps to guarantee tabular lining and zero character ambiguity (e.g., differentiating `0`, `O`, and `D`).

### RTL / LTR Integration Rules
- When the interface is set to Arabic (RTL default), the root visual axis flips horizontally (`dir="rtl"`).
- Mixed clinical content strings (e.g., patient name in Arabic followed by `HbA1c: 6.8%` or `Amoxicillin 500mg PO TID`) must wrap the international formula inside `<bdi>` or dedicated LTR spans to prevent punctuation transposition.
- Tabular figures and numerical metric blocks maintain strict LTR sequencing across both language modes.

## Layout & Spacing

The layout is built on a 4px/8px mathematical baseline grid, tailored for data-dense productivity tools where screen real estate must maximize patient visibility while preserving clear groupings.

### Layout Philosophy
- **Responsive Adaptive Grid:** 
  - **Desktop (>= 1280px):** 12-column fluid content area with a fixed 280px sidebar, 16px horizontal gutters, and 24px frame padding.
  - **Tablet (768px - 1279px):** Collapsible compact icon sidebar (64px), 8-column flexible grid with 16px margins.
  - **Mobile (< 768px):** Single-column stacked workflow, persistent bottom action tray, and docked consultation tabs.
- **RTL Fluid Inversion:** Logical layout properties (`padding-inline-start`, `margin-inline-end`, `inset-inline`) must be enforced globally to seamlessly flip margins, card headers, breadcrumbs, and table alignments between Arabic and English modes.
- **Density Tiering:** Tables and telemetry feeds use ultra-compact 36px to 40px row heights for clinical desktop monitors, preventing unnecessary vertical scrolling during active rounds.

## Elevation & Depth

Visual depth avoids theatrical cast shadows in favor of **low-contrast outlines** complemented by **tonal layering** and shallow, clinical ambient diffusion. This maintains visual cleanliness under high fluorescent lighting in clinical settings.

### Depth Hierarchy
- **Level 0 (Base Canvas):** `#F8FAFC` flat surface. All clinical workflows render against this glare-reducing background.
- **Level 1 (Panels, Cards, Tables):** `#FFFFFF` fill bounded by a crisp 1px border (`#E2E8F0`). Flat elevation with no cast shadow during neutral state.
- **Level 2 (Hovered Records, Active Floating Panels, Dropdowns):** `#FFFFFF` fill with a subtle ambient shadow: `box-shadow: 0 4px 12px -2px rgba(15, 23, 42, 0.06), 0 2px 4px -1px rgba(15, 23, 42, 0.04)` and border `#CBD5E1`.
- **Level 3 (Emergency Alerts, Critical Modals, Drawer Overlays):** `#FFFFFF` fill bounded by `#94A3B8`, elevated by a high-focus containment shadow: `box-shadow: 0 12px 32px -4px rgba(15, 23, 42, 0.12), 0 4px 8px -2px rgba(15, 23, 42, 0.04)`.
- **Clinical Highlight Ring:** Urgent or actively inspected records receive a 2px inner focus stroke (`#0D9488` or `#EF4444` for emergencies) with zero blur dispersion.

## Shapes

The design system employs a **Soft (Level 1)** corner geometry. Rounded corners are intentionally restrained to maintain an enterprise, software-grade precision that aligns cleanly within dense table grids and multi-split diagnostic screens.

### Radius Specifications
- **Micro Radius (4px - `rounded-sm`):** Checkboxes, table status pills, medical tag indicators, inline code chips, and timeline tick markers.
- **Standard Radius (6px - `rounded`):** Buttons, text inputs, dropdown menus, breadcrumb badges, and card inner elements.
- **Card & Container Radius (8px - `rounded-lg`):** Diagnostic module cards, patient profile headers, flyout dialogs, and modal frames.
- **Full Pill (`rounded-full`):** Exclusively reserved for patient profile avatars, triage priority indicators, and live presence pings.

## Components

### Buttons
- **Primary:** Background `#0D9488`, text `#FFFFFF`, border none, 6px radius. Hover: `#0F766E`. Active: `#115E59`. Focus-visible: 2px ring `#0D9488` with 2px offset.
- **Secondary / Slate:** Background `#FFFFFF`, border 1px solid `#E2E8F0`, text `#1E293B`. Hover: `#F8FAFC` and border `#CBD5E1`.
- **Destructive / Emergency:** Background `#EF4444`, text `#FFFFFF`. Hover: `#DC2626`.
- **Dimensions:** Compact (28px height, 10px inline padding, `label-sm`), Default (36px height, 14px inline padding, `label-md`), Dense Action Bar (32px height).

### Badges & Status Indicators
- **Structure:** 20px height, 6px - 8px inline padding, 4px corner radius, `label-sm` font weight 600, paired with a 6px status dot.
- **Active / Success:** Surface `#ECFDF5`, text `#065F46`, dot `#10B981`.
- **Pending / In-Review:** Surface `#FFFBEB`, text `#92400E`, dot `#F59E0B`.
- **Critical / Allergy Alert:** Surface `#FEF2F2`, text `#991B1B`, dot `#EF4444`. Pulsing micro-halo for vital anomalies.
- **Muted / Discharged:** Surface `#F1F5F9`, text `#475569`, dot `#94A3B8`.

### Doctor & Patient Badges
- **Patient Identifier:** Integrated card or pill displaying avatar/initials, full bilingual legal name, National ID / MRN in `mono-code`, age/gender, and high-visibility allergy markers (e.g., `Penicillin [ALLERGY]`).
- **Doctor / Clinician Tag:** Slate-tinted card (`#F8FAFC`) with primary teal credential tag (e.g., `Consultant Cardiologist`), license badge, and active on-duty status beacon.

### Form Inputs & Select Fields
- **Container:** Background `#FFFFFF`, 1px border `#CBD5E1`, 6px radius, height 36px, font `body-md`.
- **Focus State:** Border `#0D9488`, outline: 1px solid `#0D9488`.
- **Clinical Validation:** Critical inputs (e.g., prescription dosage, INR levels) display the target measurement unit pinned to the trailing edge (in RTL, leading edge) in `JetBrains Mono`. Invalid inputs trigger a `#EF4444` border with immediate inline sub-text.

### Data Tables
- **Architecture:** Zero-bleed table headers with `#F8FAFC` background, 1px bottom border `#CBD5E1`, text `#64748B`, uppercase tracking in `label-sm`.
- **Row Styling:** Row height 40px (dense mode) or 48px (standard). Alternating rows retain `#FFFFFF` backgrounds with immediate `#F1F5F9` hover highlights. Border bottom 1px `#F1F5F9`.
- **Alignment:** RTL text aligns right; English medical nomenclature, timestamps, and numbers align left or use tabular numerical right-alignment based on context.

### Clinical Timeline Indicators
- **Structure:** Vertical 2px connecting rail (`#E2E8F0`) positioned along the natural reading margin.
- **Nodes:** 10px circular nodes (`#FFFFFF` with 2px solid boundary matching the state: Teal for diagnostic events, Blue for prescriptions, Emerald for discharge, Rose for clinical alarms).
- **Metadata Card:** Nested 8px from rail, displaying event stamp in `mono-metric`, attending clinician name, and expandable medical notes.

### Breadcrumbs
- **Style:** Compact linear breadcrumbs separated by chevron glyphs (auto-flipped for RTL: `‹` in Arabic, `›` in English).
- **Hierarchy:** Primary department (`#64748B`) > Clinic Room (`#64748B`) > Active Patient Record (`#0F172A`, font-weight 600).