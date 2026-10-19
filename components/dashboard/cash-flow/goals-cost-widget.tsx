"use client";

import * as React from "react";
import Link from "next/link";
import {
  Target,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, GOAL_CATEGORY_META } from "@/lib/client-data";
import type { Goal } from "@/lib/client-data";
import { ProgressBar } from "./progress-bar";

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min((part / total) * 100, 100);
}

function Intelligence({
  totalGoalCost,
  surplus,
  preSurplus,
  goalCount,
}: {
  totalGoalCost: number;
  surplus: number;
  preSurplus: number;
  goalCount: number;
}) {
  const pctOfPreSurplus =
    preSurplus > 0 ? (totalGoalCost / preSurplus) * 100 : 0;
  const pctOfIncome =
    preSurplus + totalGoalCost > 0
      ? (totalGoalCost / (preSurplus + totalGoalCost)) * 100
      : 0;

  if (goalCount === 0) return null;

  // Determine message tone
  let Icon = TrendingUp;
  let tone = "text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200";
  let headline = "";
  let body = "";

  if (surplus < 0 && preSurplus < totalGoalCost) {
    // Goals are putting the user in deficit
    Icon = XCircle;
    tone = "text-rose-700 bg-rose-50 ring-1 ring-rose-200";
    headline = "Goals are contributing to a deficit";
    body = `Your ${goalCount} active goal${goalCount !== 1 ? "s" : ""} require ${formatCurrency(totalGoalCost)}/mo. Combined with other expenses, this creates a monthly deficit of ${formatCurrency(Math.abs(surplus))}. Consider adjusting timelines or contribution amounts.`;
  } else if (pctOfPreSurplus > 80) {
    Icon = AlertTriangle;
    tone = "text-amber-700 bg-amber-50 ring-1 ring-amber-200";
    headline = "Goals are consuming most of your surplus";
    body = `Your goals take up ${pctOfPreSurplus.toFixed(0)}% of your pre-goal surplus (${formatCurrency(preSurplus)}). That leaves only ${formatCurrency(surplus)} free each month. This is tight - consider stretching goal timelines to reduce monthly pressure.`;
  } else if (pctOfPreSurplus > 50) {
    Icon = AlertTriangle;
    tone = "text-amber-700 bg-amber-50 ring-1 ring-amber-200";
    headline = "Goals are taking a large share of your surplus";
    body = `${formatCurrency(totalGoalCost)}/mo goes toward ${goalCount} goal${goalCount !== 1 ? "s" : ""} - that's ${pctOfPreSurplus.toFixed(0)}% of your available surplus. You still have ${formatCurrency(surplus)} left over, but there's limited buffer for surprises.`;
  } else if (pctOfPreSurplus > 20) {
    Icon = TrendingUp;
    tone = "text-sky-700 bg-sky-50 ring-1 ring-sky-200";
    headline = "Goals are well-funded within your budget";
    body = `You're putting ${formatCurrency(totalGoalCost)}/mo (${pctOfPreSurplus.toFixed(0)}% of your surplus) toward ${goalCount} goal${goalCount !== 1 ? "s" : ""}. After goal contributions, you retain ${formatCurrency(surplus)}/mo in free cash flow.`;
  } else {
    Icon = TrendingUp;
    tone = "text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200";
    headline = "Goals are a small, healthy share of your surplus";
    body = `Your ${goalCount} goal${goalCount !== 1 ? "s" : ""} cost ${formatCurrency(totalGoalCost)}/mo - just ${pctOfIncome.toFixed(0)}% of your available cash. You have plenty of headroom to increase contributions or add new goals.`;
  }

  return (
    <div className={`rounded-lg px-3 py-2.5 flex items-start gap-2.5 ${tone}`}>
      <Icon className="h-4 w-4 mt-0.5 shrink-0" />
      <div>
        <p className="text-xs font-semibold">{headline}</p>
        <p className="text-xs mt-0.5 opacity-85 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

export function GoalsCostWidget({
  goals,
  totalExpenses,
  surplus,
}: {
  goals: Goal[];
  totalExpenses: number;
  /** Surplus BEFORE goal contributions are counted as expenses */
  surplus: number;
}) {
  const activeGoals = React.useMemo(
    () => goals.filter((g) => !g.completed && g.monthlyContributionNeeded > 0),
    [goals],
  );

  const totalGoalCost = React.useMemo(
    () => activeGoals.reduce((s, g) => s + g.monthlyContributionNeeded, 0),
    [activeGoals],
  );

  // pre-goal surplus: what surplus looks like before goal contributions
  const preSurplus = surplus + totalGoalCost;
  // post-goal surplus: what's actually left after goals
  const postSurplus = surplus;

  if (activeGoals.length === 0) return null;

  const totalExpensesWithGoals = totalExpenses + totalGoalCost;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-violet-500" /> Goals commitment
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="tabular-nums text-violet-600">
              {formatCurrency(totalGoalCost)}/mo
            </Badge>
            <Link
              href="/dashboard/goals"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
            >
              View goals <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Intelligence summary */}
        <Intelligence
          totalGoalCost={totalGoalCost}
          surplus={postSurplus}
          preSurplus={preSurplus}
          goalCount={activeGoals.length}
        />

        <Separator />

        {/* Per-goal rows */}
        <div className="space-y-3">
          {activeGoals.map((g) => {
            const meta = GOAL_CATEGORY_META[g.category];
            const share = pct(
              g.monthlyContributionNeeded,
              totalExpensesWithGoals,
            );
            return (
              <div key={g.id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: meta.color }}
                    />
                    <span className="text-sm text-muted-foreground truncate">
                      {g.title}
                    </span>
                  </div>
                  <span className="text-sm font-medium tabular-nums shrink-0">
                    {formatCurrency(g.monthlyContributionNeeded)}/mo
                  </span>
                </div>
                <ProgressBar value={share} />
              </div>
            );
          })}
        </div>

        <Separator />

        {/* Surplus impact summary */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Pre-goal surplus</span>
            <span
              className={`font-medium tabular-nums ${preSurplus >= 0 ? "text-emerald-600" : "text-red-500"}`}
            >
              {formatCurrency(preSurplus)}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Goal contributions</span>
            <span className="font-medium tabular-nums text-violet-600">
              - {formatCurrency(totalGoalCost)}
            </span>
          </div>
          <Separator />
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground font-medium">
              Remaining surplus
            </span>
            <span
              className={`font-semibold tabular-nums ${postSurplus >= 0 ? "text-emerald-600" : "text-red-500"}`}
            >
              {formatCurrency(postSurplus)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
