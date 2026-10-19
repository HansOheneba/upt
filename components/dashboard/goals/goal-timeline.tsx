import { DashCard, CardContent } from "@/components/dashboard/dash-card";
import { dashboardTheme } from "@/lib/dashboard-theme";
import type { EnrichedGoal } from "./types";
import { formatTargetLabel, parseIsoDate, startOfToday } from "./utils";

type DatedGoal = {
  goal: EnrichedGoal;
  target: Date;
};

function axisLabels(min: number, max: number): { label: string; ratio: number }[] {
  const start = new Date(min);
  const end = new Date(max);
  if (start.getFullYear() === end.getFullYear()) {
    const format = (date: Date) =>
      date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
    if (format(start) === format(end)) {
      return [{ label: format(start), ratio: 0 }];
    }
    return [
      { label: format(start), ratio: 0 },
      { label: format(end), ratio: 1 },
    ];
  }

  const labels: { label: string; ratio: number }[] = [];
  for (let year = start.getFullYear(); year <= end.getFullYear(); year += 1) {
    const time = new Date(year, 0, 1).getTime();
    const ratio =
      time <= min ? 0 : time >= max ? 1 : (time - min) / (max - min);
    const previous = labels[labels.length - 1];
    if (previous && Math.abs(previous.ratio - ratio) < 0.08) continue;
    labels.push({ label: String(year), ratio });
  }
  return labels;
}

export function GoalTimeline({ goals }: { goals: EnrichedGoal[] }) {
  const today = startOfToday().getTime();
  const dated: DatedGoal[] = [];
  const undated: EnrichedGoal[] = [];

  for (const goal of goals) {
    if (goal.completed) continue;
    const target = goal.targetDate ? parseIsoDate(goal.targetDate) : null;
    if (!target) {
      undated.push(goal);
      continue;
    }
    dated.push({ goal, target });
  }

  dated.sort((a, b) => a.target.getTime() - b.target.getTime());

  const times = dated.map((item) => item.target.getTime());
  const min = times.length > 0 ? Math.min(today, ...times) : today;
  let max = times.length > 0 ? Math.max(today, ...times) : today;
  if (max - min < 1000 * 60 * 60 * 24 * 30) {
    max = min + 1000 * 60 * 60 * 24 * 30;
  }
  const span = Math.max(max - min, 1);
  const labels = dated.length > 0 ? axisLabels(min, max) : [];

  const nowPercent = ((today - min) / span) * 100;
  const columns =
    "grid grid-cols-[minmax(7.5rem,12rem)_minmax(0,1fr)] items-center gap-x-3";

  return (
    <DashCard className="py-0">
      <CardContent className="p-4">
        <h2 className={dashboardTheme.sectionLabel}>Goal timeline</h2>
        {dated.length === 0 ? (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {goals.filter((goal) => !goal.completed).length === 0
              ? "Active goals will appear here once they have a target date."
              : "Add a target date to place these goals on a plan."}
          </p>
        ) : (
          <div className="mt-4">
            <div className={columns}>
              <div />
              <div className="relative h-4 border-b border-border/70">
                <span
                  className="absolute top-0 text-[11px] font-medium text-foreground"
                  style={{
                    left: `${Math.min(nowPercent, 88)}%`,
                    transform: nowPercent > 88 ? "translateX(-100%)" : "none",
                  }}
                >
                  Today
                </span>
                {labels
                  .filter(
                    (label) => Math.abs(label.ratio * 100 - nowPercent) > 10,
                  )
                  .map((label) => (
                    <span
                      key={`${label.label}-${label.ratio}`}
                      className="absolute top-0 text-[11px] whitespace-nowrap text-muted-foreground"
                      style={{
                        left: `${label.ratio * 100}%`,
                        transform:
                          label.ratio <= 0
                            ? "none"
                            : label.ratio >= 1
                              ? "translateX(-100%)"
                              : "translateX(-50%)",
                      }}
                    >
                      {label.label}
                    </span>
                  ))}
              </div>
            </div>

            <ul className="mt-2 space-y-1">
              {dated.map(({ goal, target }) => {
                const start = nowPercent;
                const end = ((target.getTime() - min) / span) * 100;
                const left = Math.min(start, end);
                const width = Math.max(Math.abs(end - start), 1.5);
                const dateInside = end > 78;
                return (
                  <li key={goal.id} className={columns}>
                    <p className="line-clamp-2 text-sm font-medium leading-snug">
                      {goal.title}
                    </p>
                    <div className="relative h-7">
                      {labels.map((label) => (
                        <span
                          key={`${goal.id}-${label.label}`}
                          className="absolute inset-y-0 w-px bg-border/80"
                          style={{ left: `${label.ratio * 100}%` }}
                          aria-hidden
                        />
                      ))}
                      <span
                        className="absolute inset-y-0 w-px bg-foreground/25"
                        style={{ left: `${nowPercent}%` }}
                        aria-hidden
                      />
                      <div
                        className="absolute top-1/2 z-10 h-2.5 -translate-y-1/2 rounded-sm bg-[var(--brand-accent)]"
                        style={{ left: `${left}%`, width: `${width}%` }}
                      />
                      <span
                        className="absolute top-1/2 z-20 -translate-y-1/2 whitespace-nowrap bg-card px-1 text-[11px] font-semibold tabular-nums"
                        style={
                          dateInside
                            ? {
                                left: `${end}%`,
                                transform: "translate(calc(-100% - 4px), -50%)",
                              }
                            : {
                                left: `${end}%`,
                                transform: "translate(6px, -50%)",
                              }
                        }
                      >
                        {formatTargetLabel(goal.targetDate)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {undated.length > 0 && dated.length > 0 && (
          <p className="mt-4 border-t border-border/70 pt-3 text-xs text-muted-foreground">
            No target date yet: {undated.map((goal) => goal.title).join(", ")}.
          </p>
        )}
      </CardContent>
    </DashCard>
  );
}
