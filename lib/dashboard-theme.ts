// lib/dashboard-theme.ts
//
// ─────────────────────────────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH FOR DASHBOARD VISUAL STYLING
// ─────────────────────────────────────────────────────────────────────────
//
// Change a value here and it propagates to every dashboard tab. Use these
// constants everywhere instead of hard-coding background / border classes
// on individual pages.
//
// Where each token shows up:
//   surface          → app/dashboard/layout.tsx <main>           (page bg)
//   card             → components/dashboard/dash-card.tsx        (every card)
//   kpiTile          → components/dashboard/kpi-strip.tsx        (every KPI cell)
//   sectionLabel     → SectionLabel headings on each tab
//
// IMPORTANT
//   - `surface` is the *only* token that is a CSS class defined in
//     app/globals.css (.dashboard-surface). Edit the gradient there.
//   - `card` and `kpiTile` use the shadcn `bg-card` CSS variable
//     (--card in globals.css :root). Change `--card` to recolor every
//     card/KPI tile at once without touching React components.
//
// Do NOT add tab-specific styling here. Keep this file purely about the
// shell. Tab-specific affordances belong in their own components.

export const dashboardTheme = {
  /** Applied to the dashboard <main> element. Defined in globals.css. */
  surface: "dashboard-surface @container/dash",

  /**
   * Base classes for any "card" surface inside the dashboard.
   * Used by <DashCard /> - prefer that component over raw classes.
   * Matches the RM shell: white surface, hairline ring, no drop shadow.
   */
  card: "rounded-xl bg-card text-card-foreground ring-1 ring-foreground/10 shadow-none",

  /** Tiles inside a grouped metric strip. */
  kpiTile: "bg-card",

  /** Section heading above each block (e.g. "Your wealth"). */
  sectionLabel:
    "text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground",

  /** Wider-track section labels on tab pages (insurance, assets, etc.). */
  sectionLabelWide:
    "text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground mb-3",

  /** Checklist / compact section headings (no bottom margin). */
  sectionLabelChecklist:
    "text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground",

  pageTitle: "text-xl font-medium tracking-tight sm:text-2xl",
  pageDescription: "max-w-2xl text-sm leading-relaxed text-muted-foreground",
  sectionTitle: "text-sm font-medium",

  /**
   * Standard outer rhythm for tab content. Horizontal padding lives on
   * `<main>` so pages should not re-add side gutters (avoids sparse mobile).
   * Bottom padding on mobile is handled by the dashboard layout scroll area
   * (clears the fixed Ask AI button + safe area).
   */
  pageContainer: "mx-auto w-full min-w-0 space-y-5 sm:space-y-6 pb-2 sm:pb-8",

  elevatedSection:
    "rounded-xl bg-card px-5 py-4 ring-1 ring-foreground/10 sm:px-5 sm:py-5",
  emptyState:
    "rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center",
  statLabel: "text-xs text-muted-foreground",
  statValueLarge:
    "text-2xl font-medium tracking-tight tabular-nums text-foreground",
} as const;
