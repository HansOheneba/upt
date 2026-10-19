import { dashboardTheme } from "@/lib/dashboard-theme";
import { Skeleton } from "@/components/ui/skeleton";
import type { EnrichedGoal } from "./types";
import { formatCurrency, goalPlanStats, planStatusMessage } from "./utils";

export function GoalProgressHero({
  goals,
  loading,
}: {
  goals: EnrichedGoal[];
  loading: boolean;
}) {
  const stats = goalPlanStats(goals);
  const message = planStatusMessage(goals);

  if (loading) {
    return (
      <section className={dashboardTheme.elevatedSection} aria-busy="true">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-3 h-4 w-72 max-w-full" />
        <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-3">
          <Skeleton className="col-span-2 h-12 w-40 sm:col-span-1" />
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-20" />
        </div>
      </section>
    );
  }

  return (
    <section className={dashboardTheme.elevatedSection}>
      <p className={dashboardTheme.sectionLabel}>Your goal progress</p>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
        {message}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
        <div className="col-span-2 sm:col-span-1">
          <p className="text-2xl font-medium tracking-tight tabular-nums">
            {formatCurrency(stats.saved)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Saved toward goals
          </p>
        </div>
        <div>
          <p className="text-xl font-medium tracking-tight tabular-nums">
            {formatCurrency(Math.round(stats.monthly))}
            <span className="text-base font-normal text-muted-foreground">
              /mo
            </span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Monthly commitment
          </p>
        </div>
        <div>
          <p className="text-xl font-medium tracking-tight tabular-nums">
            {stats.onTrack}
            <span className="text-base font-normal text-muted-foreground">
              {" "}
              of {stats.active.length}
            </span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Goals on track</p>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            Overall progress
          </span>
          <span className="text-xs tabular-nums text-muted-foreground">
            {Math.round(stats.fundedPercent)}% of active targets
          </span>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={Math.round(stats.fundedPercent)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Overall progress toward active goals"
        >
          <div
            className="h-full rounded-full bg-[var(--brand-accent)]"
            style={{ width: `${stats.fundedPercent}%` }}
          />
        </div>
      </div>
    </section>
  );
}
