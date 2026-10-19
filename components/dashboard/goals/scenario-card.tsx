import { DashCard, CardContent } from "@/components/dashboard/dash-card";
import { dashboardTheme } from "@/lib/dashboard-theme";
import type { EnrichedGoal } from "./types";
import { goalPlanStats } from "./utils";

export function GoalPlanSummary({ goals }: { goals: EnrichedGoal[] }) {
  const stats = goalPlanStats(goals);
  if (goals.length === 0) return null;

  const items = [
    { count: stats.onTrack, label: "On track" },
    { count: stats.atRisk, label: "At risk" },
    { count: stats.offTrack, label: "Off track" },
  ];

  return (
    <DashCard className="py-0">
      <CardContent className="p-4" role="region" aria-label="Goal health">
        <h2 className={dashboardTheme.sectionLabel}>Goal health</h2>
        {stats.active.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No active goals to score.
          </p>
        ) : (
          <dl className="mt-3 grid grid-cols-3 divide-x divide-border">
            {items.map((item) => (
              <div key={item.label} className="px-3 first:pl-0 last:pr-0">
                <dd
                  className={`text-2xl font-semibold tabular-nums ${
                    item.count === 0 ? "text-muted-foreground" : "text-foreground"
                  }`}
                >
                  {item.count}
                </dd>
                <dt className="mt-1 text-xs text-muted-foreground">
                  {item.label}
                </dt>
              </div>
            ))}
          </dl>
        )}
      </CardContent>
    </DashCard>
  );
}
