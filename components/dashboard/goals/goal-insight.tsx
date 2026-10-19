import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { DashCard, CardContent } from "@/components/dashboard/dash-card";
import { dashboardTheme } from "@/lib/dashboard-theme";
import type { EnrichedGoal } from "./types";
import {
  contributionInsight,
  formatCurrency,
  formatTargetLabel,
  goalHealth,
  nextGoalMilestone,
  parseIsoDate,
} from "./utils";

export function GoalInsight({ goals }: { goals: EnrichedGoal[] }) {
  const active = goals.filter((goal) => !goal.completed);
  if (active.length === 0) return null;

  const attention = [...active]
    .filter((goal) => goalHealth(goal.probability) !== "on-track")
    .sort(
      (a, b) => b.monthlyContributionNeeded - a.monthlyContributionNeeded,
    )[0];
  const milestone = nextGoalMilestone(goals);
  const majority = contributionInsight(goals);

  if (attention) {
    const when = attention.targetDate
      ? parseIsoDate(attention.targetDate)
        ? ` by ${formatTargetLabel(attention.targetDate)}`
        : ""
      : "";
    return (
      <InsightShell
        kicker="Needs attention"
        figure={formatCurrency(Math.round(attention.monthlyContributionNeeded))}
        figureSuffix="/mo"
        title={attention.title}
        body={`to reach ${formatCurrency(attention.target)}${when}.`}
        href={`/dashboard/goals/${attention.id}/edit`}
      />
    );
  }

  if (milestone) {
    return (
      <InsightShell
        kicker="Next milestone"
        figure={formatCurrency(Math.round(milestone.gap))}
        title={milestone.title}
        body={`to reach ${milestone.percent}% funded`}
        note={majority}
        href={`/dashboard/goals/${milestone.goalId}/edit`}
      />
    );
  }

  if (majority) {
    return (
      <InsightShell
        kicker="Plan insight"
        title="Monthly commitment"
        body={majority}
      />
    );
  }

  return null;
}

function InsightShell({
  kicker,
  figure,
  figureSuffix,
  title,
  body,
  note,
  href,
}: {
  kicker: string;
  figure?: string;
  figureSuffix?: string;
  title: string;
  body: string;
  note?: string | null;
  href?: string;
}) {
  return (
    <DashCard className="py-0">
      <CardContent className="p-4">
        <p className={dashboardTheme.sectionLabel}>{kicker}</p>
        {figure && (
          <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">
            {figure}
            {figureSuffix && (
              <span className="text-sm font-normal text-muted-foreground">
                {figureSuffix}
              </span>
            )}
          </p>
        )}
        <h2 className={`${figure ? "mt-1" : "mt-3"} text-sm font-medium`}>
          {title}
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{body}</p>
        {note && (
          <p className="mt-3 border-t border-border/70 pt-3 text-xs leading-relaxed text-muted-foreground">
            {note}
          </p>
        )}
        {href && (
          <Link
            href={href}
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            View goal
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        )}
      </CardContent>
    </DashCard>
  );
}
