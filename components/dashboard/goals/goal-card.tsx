"use client";

import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Wallet,
  CalendarDays,
  Check,
  AlertTriangle,
  CircleAlert,
  Shield,
  Umbrella,
  Home,
  GraduationCap,
  Plane,
  Car,
  Briefcase,
  Star,
  type LucideIcon,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { DashCard, CardContent } from "@/components/dashboard/dash-card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { GOAL_CATEGORY_OPTIONS } from "@/lib/client-data";
import type { GoalCategory } from "@/lib/client-data";

import { EnrichedGoal } from "./types";
import {
  formatCurrency,
  formatTargetLabel,
  goalHealth,
  progressPercent,
} from "./utils";

const CATEGORY_ICONS: Record<GoalCategory, LucideIcon> = {
  emergency: Shield,
  retirement: Umbrella,
  housing: Home,
  education: GraduationCap,
  travel: Plane,
  vehicle: Car,
  business: Briefcase,
  other: Star,
};

export function GoalCard({
  goal,
  onView,
  onEdit,
  onAdjustContribution,
  onChangeTargetDate,
  onRequestDelete,
}: {
  goal: EnrichedGoal;
  onView: (goalId: string) => void;
  onEdit: (goalId: string) => void;
  onAdjustContribution: (goalId: string) => void;
  onChangeTargetDate: (goalId: string) => void;
  onRequestDelete: (goal: EnrichedGoal) => void;
}) {
  const reduceMotion = useReducedMotion();
  const progress = progressPercent(goal.current, goal.target);
  const remaining = Math.max(0, goal.target - goal.current);
  const categoryLabel =
    GOAL_CATEGORY_OPTIONS.find((option) => option.value === goal.category)
      ?.label ?? "Other";
  const Icon = CATEGORY_ICONS[goal.category] ?? Star;
  const health = goal.completed ? null : goalHealth(goal.probability);
  const statusLabel = goal.completed
    ? "Completed"
    : health === "on-track"
      ? "On track"
      : health === "at-risk"
        ? "At risk"
        : "Off track";
  const StatusIcon = goal.completed
    ? Check
    : health === "on-track"
      ? Check
      : health === "at-risk"
        ? AlertTriangle
        : CircleAlert;

  return (
    <DashCard className="group py-0 transition-colors hover:bg-muted/30">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-foreground/70">
              <Icon className="h-3.5 w-3.5" aria-hidden />
            </span>
            <h2 className="truncate text-sm font-medium">{goal.title}</h2>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="-mr-1 h-7 w-7 shrink-0 text-muted-foreground"
                aria-label={`Actions for ${goal.title}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onView(goal.id)}>
                <Eye className="h-3.5 w-3.5" />
                View goal
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(goal.id)}>
                <Pencil className="h-3.5 w-3.5" />
                Edit goal
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAdjustContribution(goal.id)}>
                <Wallet className="h-3.5 w-3.5" />
                Adjust contribution
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onChangeTargetDate(goal.id)}>
                <CalendarDays className="h-3.5 w-3.5" />
                Change target date
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onRequestDelete(goal)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete goal
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <p className="text-xl font-semibold tracking-tight tabular-nums">
          {formatCurrency(goal.target)}
        </p>

        <div
          className="h-1 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${goal.title} progress`}
        >
          <motion.div
            className="h-full w-full origin-left rounded-full bg-[var(--brand-accent)]"
            initial={reduceMotion ? false : { scaleX: 0 }}
            whileInView={{ scaleX: Math.max(progress, 0) / 100 }}
            viewport={{ once: true, margin: "-20px" }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.55, ease: [0.23, 1, 0.32, 1] }
            }
          />
        </div>

        <div className="flex items-baseline justify-between gap-3 text-xs">
          <span className="text-muted-foreground tabular-nums">
            {formatCurrency(goal.current)} saved so far
          </span>
          <span className="font-medium tabular-nums">{Math.round(progress)}%</span>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border/70 pt-3 text-xs">
          <div>
            <dt className="text-muted-foreground">Target</dt>
            <dd className="mt-0.5 font-medium">
              {formatTargetLabel(goal.targetDate)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Remaining</dt>
            <dd className="mt-0.5 font-medium tabular-nums">
              {formatCurrency(remaining)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Monthly</dt>
            <dd className="mt-0.5 font-medium tabular-nums">
              {formatCurrency(Math.round(goal.monthlyContributionNeeded))}/mo
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd className="mt-0.5 flex items-center gap-1 font-medium">
              <StatusIcon className="h-3 w-3 text-[var(--brand-accent)]" aria-hidden />
              <span className="sr-only">Status: </span>
              {statusLabel}
            </dd>
          </div>
        </dl>
        <p className="sr-only">
          {categoryLabel}, priority {goal.priority}
        </p>
      </CardContent>
    </DashCard>
  );
}
