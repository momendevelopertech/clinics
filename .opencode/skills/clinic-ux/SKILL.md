---
name: clinic-ux
description: Use when building or auditing UI for OpenHealthCRM: admin dashboards, plan/feature-matrix tables, compare cards, usage bars, upgrade CTAs, locked features, settings forms, and responsive (1920→375px) + RTL layouts. Covers the existing design tokens, component patterns, i18n usage, and responsive/RTL rules. Trigger on "UI", "UX", "card", "table", "responsive", "RTL", "upgrade card", "plan comparison", "saa dashboard".
---

# Clinic SaaS UX Conventions

## Design language
- Container/panel: `surface-panel`, `rounded-[24px]`..`[28px]`, `border border-white/55 dark:border-white/6`, subtle shadows `shadow-lg shadow-primary/5`.
- Progress/usage: 12px track (`h-2.5 rounded-full bg-white/70 dark:bg-white/[0.06]`), fill `bg-emerald-500` (<70%), `bg-amber-500` (70-89%), `bg-red-500` (≥90%) by percentage.
- Badges: `rounded-full px-2.5 py-1 text-xs font-semibold`, variants `bg-primary/10 text-primary`, `bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300`, `bg-cyan-100 text-cyan-700 dark:bg-cyan-400/20 dark:text-cyan-200`, danger `bg-red-100 text-red-700 dark:bg-red-500/15`.
- CTA gradient: `bg-linear-to-r from-primary to-cyan-500 text-white shadow-lg shadow-cyan-500/20`. Locked/disabled: `border border-white/60 bg-white/60 text-muted-foreground disabled:opacity-50 dark:border-white/6`.
- Cards use `lucide-react` icons, 12→16px sizes, tinted icon wells `grid size-12 place-content-center rounded-[16px] bg-primary/10 text-primary`.

## Patterns to reuse
- Plan/usage page lives at `/plan` (Owner): usage bars + plan cards + upgrade CTA — extend, don't duplicate.
- Super console (`src/components/super/super-console.tsx`): 5 sections (`?section=`) using `surface-panel` tables, `ActionButton` (`variant="success|danger"`), `ApprovalCard`. Add new sections there (plans, roles) and register in the section nav.
- Feature matrix / comparison tables: responsive wrapper `overflow-x-auto` + `min-w-[...]px` on the table; checkmarks `Check` green, dashes via `Minus`/em-dash, "Unlimited" via `∞` or i18n `plan_unlimited`.
- Upgrade prompts (`UpgradePrompt`) for locked features: lock icon, title, description (AR+EN), CTA `[Upgrade to Plus]` -> `/plan`, all strings via i18n (`upg_*`).
- Empty states: centered icon + muted text (existing pattern on documents/consents).
- Toasts: `toast.success/error` from sonner.

## i18n mandatory
Every string (title, desc, badge, placeholder, toast, tooltip, aria-label) MUST come from `t()` with keys added to BOTH `en.ts` and `ar.ts`. Never inline English. `t("key")` (function), not `t["key"]`. Placeholders/interpolation via `.replace("{x}", v)`.

## Responsive rules (1920 / 1440 / 1280 / 1024 / 768 / 430 / 390 / 375)
- Tables: always `overflow-x-auto` wrapper; avoid `min-w` beyond ~900px; on mobile recast complex tables into stacked cards or keep horizontal scroll.
- Grids: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` style; usage/overview `lg:grid-cols-[0.9fr_1.1fr]`.
- Sidebar collapses on small screens; ensure locked-feature rows and matrix controls stack (wrap with `flex-wrap`).
- Do not set fixed px widths on inputs/buttons (`w-full sm:w-48`).
- Test at 375ps odd row heights (use `min-h` on cards, truncate long names `truncate max-w-xs`).

## RTL
- Layout flows via flex/grid (Tailwind logical props or explicit `dir`-aware spacing). Numbers/percentages that must stay LTR: wrap in `span.ltr-on-rtl` (globals.css provides `.ltr-on-rtl`).
- Check icon+label combos, progress bars (they render LTR fine), table alignment, and dropdown alignments (`align="end"`).
- Test every new dialog/table in Arabic.