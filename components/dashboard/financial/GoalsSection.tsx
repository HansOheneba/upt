"use client";

import * as React from "react";
import { CheckCircle2, Info, Target } from "lucide-react";
import {
  DashCard,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/dash-card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { GoalMetrics, SectionFreshness } from "@/lib/client-data";
import { formatCurrency } from "@/lib/client-data";
import { DataFreshnessBadge } from "./DataFreshnessBadge";

interface GoalsSectionProps {
  goals: GoalMetrics[];
  freshness: SectionFreshness[];
}

function GoalRow({ goal }: { goal: GoalMetrics }) {
  const pct = Math.min(goal.progressPct, 100);

  return (
    <div className="space-y-2 py-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{goal.title}</p>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(goal.current)} of {formatCurrency(goal.target)}
            {goal.yearsRemaining > 0 && ` - ${goal.yearsRemaining}y remaining`}
          </p>
        </div>
        {goal.completed ? (
          <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Done
          </Badge>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1 cursor-default">
                  <Badge
                    variant={goal.onTrack ? "default" : "secondary"}
                    className={`text-xs ${
                      goal.onTrack
                        ? "bg-emerald-600 text-white"
                        : "bg-amber-100 text-amber-700 border-0"
                    }`}
                  >
                    {goal.onTrack ? "On Track" : "Review"}
                  </Badge>
                  <Info className="h-3 w-3 text-muted-foreground shrink-0" />
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs leading-relaxed">
                <p className="font-semibold mb-1">Compound-growth model</p>
                <p>
                  “On track” means your monthly surplus covers the contribution
                  required by a <strong>compound future-value</strong> formula
                  (accounts for investment returns over time).
                </p>
                <p className="mt-1 text-muted-foreground">
                  The probability score on the Goals page uses a simpler linear
                  model, so the two figures may differ - especially on
                  long-horizon goals.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full w-full origin-left rounded-full transition-transform duration-200 ease-out ${goal.completed ? "bg-emerald-500" : goal.onTrack ? "bg-indigo-500" : "bg-amber-400"}`}
          style={{ transform: `scaleX(${Math.max(pct, 0) / 100})` }}
        />
      </div>

      {!goal.completed && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{pct.toFixed(0)}% complete</span>
          <span>{formatCurrency(goal.requiredMonthly)} / mo needed</span>
        </div>
      )}
      {goal.completed && goal.completedDate && (
        <p className="text-xs text-muted-foreground">
          Completed {goal.completedDate}
        </p>
      )}
    </div>
  );
}

export function GoalsSection({ goals, freshness }: GoalsSectionProps) {
  const activeGoals = goals.filter((g) => !g.completed);
  const completedGoals = goals.filter((g) => g.completed);

  return (
    <DashCard>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Goals</CardTitle>
          </div>
          <DataFreshnessBadge freshness={freshness} section="goals" />
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="secondary" className="text-xs">
            {activeGoals.length} Active
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {completedGoals.length} Completed
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-0">
        {activeGoals.length > 0 && (
          <>
            <p className="text-xs font-medium text-muted-foreground mt-2 mb-1 uppercase tracking-wide">
              Active
            </p>
            <div className="divide-y divide-border">
              {activeGoals.map((goal) => (
                <GoalRow key={goal.id} goal={goal} />
              ))}
            </div>
          </>
        )}

        {completedGoals.length > 0 && (
          <>
            <Separator className="my-3" />
            <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">
              Completed
            </p>
            <div className="divide-y divide-border">
              {completedGoals.map((goal) => (
                <GoalRow key={goal.id} goal={goal} />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </DashCard>
  );
}
