import { formatCurrency } from "@/lib/client-data";
import { Goal, EnrichedGoal, type GoalSort } from "./types";

export { formatCurrency };

// ============================================================================
// FORMATTING & UTILITY FUNCTIONS
// ============================================================================

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function progressPercent(current: number, target: number): number {
  if (target <= 0) return 0;
  return clamp((current / target) * 100, 0, 100);
}

export function probabilityTone(
  p: number,
): "default" | "secondary" | "destructive" {
  if (p >= 85) return "default";
  if (p >= 70) return "secondary";
  return "destructive";
}

export function formatTimeRemaining(targetDate?: string): string {
  if (!targetDate) return "";
  const target = parseIsoDate(targetDate);
  if (!target) return "";
  const ms = target.getTime() - startOfToday().getTime();
  if (ms <= 0) return "Past target date";
  const totalMonths = Math.round(ms / (1000 * 60 * 60 * 24 * 30.44));
  if (totalMonths < 1) return "Less than a month";
  if (totalMonths < 12)
    return `${totalMonths} month${totalMonths !== 1 ? "s" : ""} remaining`;
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  if (months === 0) return `${years} year${years !== 1 ? "s" : ""} remaining`;
  return `${years} yr ${months} mo remaining`;
}

/** Parse YYYY-MM-DD as a local date so the label does not shift a day. */
export function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

export function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function formatTargetLabel(value?: string): string {
  if (!value) return "No target date";
  const date = parseIsoDate(value);
  if (!date) return "No target date";
  return date.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

export type GoalPlanStats = {
  active: EnrichedGoal[];
  saved: number;
  monthly: number;
  fundedPercent: number;
  onTrack: number;
  atRisk: number;
  offTrack: number;
};

export function goalPlanStats(goals: EnrichedGoal[]): GoalPlanStats {
  const active = goals.filter((goal) => !goal.completed);
  const saved = active.reduce(
    (sum, goal) => sum + (Number.isFinite(goal.current) ? goal.current : 0),
    0,
  );
  const target = active.reduce(
    (sum, goal) => sum + (goal.target > 0 ? goal.target : 0),
    0,
  );
  const monthly = active.reduce(
    (sum, goal) => sum + (goal.monthlyContributionNeeded || 0),
    0,
  );
  let onTrack = 0;
  let atRisk = 0;
  let offTrack = 0;
  for (const goal of active) {
    const health = goalHealth(goal.probability);
    if (health === "on-track") onTrack += 1;
    else if (health === "at-risk") atRisk += 1;
    else offTrack += 1;
  }
  return {
    active,
    saved,
    monthly,
    fundedPercent: target > 0 ? clamp((saved / target) * 100, 0, 100) : 0,
    onTrack,
    atRisk,
    offTrack,
  };
}

export function planStatusMessage(goals: EnrichedGoal[]): string {
  const { active, onTrack, atRisk, offTrack } = goalPlanStats(goals);
  if (active.length === 0) {
    return goals.length === 0
      ? "Add a goal to start planning the milestones ahead."
      : "Your active goals are complete.";
  }
  const dated = active.filter((goal) => parseIsoDate(goal.targetDate ?? ""));
  if (onTrack === active.length && dated.length === active.length) {
    return "You're currently on track to meet your planned goal timelines.";
  }
  if (onTrack === active.length) {
    return "Your active goals are on track.";
  }
  if (offTrack > 0) {
    return offTrack === 1
      ? "One goal needs focus before its target date."
      : `${offTrack} goals need focus before their target dates.`;
  }
  return atRisk === 1
    ? "One goal is at risk of missing its timeline."
    : `${atRisk} goals are at risk of missing their timelines.`;
}

export type GoalMilestone = {
  goalId: string;
  title: string;
  percent: number;
  gap: number;
};

const MILESTONE_BANDS = [25, 50, 75, 100];

/** Next funding band a goal has not reached yet. Gap is money still required. */
export function nextGoalMilestone(goals: EnrichedGoal[]): GoalMilestone | null {
  let best: GoalMilestone | null = null;
  for (const goal of goals) {
    if (goal.completed || goal.target <= 0) continue;
    const progress = (goal.current / goal.target) * 100;
    const percent = MILESTONE_BANDS.find((band) => progress < band - 0.05);
    if (percent == null) continue;
    const gap = Math.max(0, (goal.target * percent) / 100 - goal.current);
    if (!best || gap < best.gap) {
      best = { goalId: goal.id, title: goal.title, percent, gap };
    }
  }
  return best;
}

/** Majority monthly contribution, only when one active goal is more than half. */
export function contributionInsight(goals: EnrichedGoal[]): string | null {
  const active = goals.filter((goal) => !goal.completed);
  if (active.length < 2) return null;
  const total = active.reduce(
    (sum, goal) => sum + (goal.monthlyContributionNeeded || 0),
    0,
  );
  if (total <= 0) return null;
  const top = [...active].sort(
    (a, b) => b.monthlyContributionNeeded - a.monthlyContributionNeeded,
  )[0];
  if (!top || top.monthlyContributionNeeded / total <= 0.5) return null;
  const allOnTrack = active.every(
    (goal) => goalHealth(goal.probability) === "on-track",
  );
  const scope =
    active.length === 2 ? "both" : `all ${active.length}`;
  const share = `${top.title} represents the majority of your monthly goal contribution.`;
  if (!allOnTrack) return share;
  return `You're currently on track with ${scope} of your active goals. ${share}`;
}

export type GoalHealth = "on-track" | "at-risk" | "off-track";

export function goalHealth(probability: number): GoalHealth {
  if (probability >= 75) return "on-track";
  if (probability >= 50) return "at-risk";
  return "off-track";
}

// ============================================================================
// GOAL ENRICHMENT
// ============================================================================

/**
 * Passes through goals as EnrichedGoal - monthlyContributionNeeded and
 * probability are backend-computed fields already present on each Goal.
 * No local derivation needed.
 */
export function enrichGoalsWithCalculations(goals: Goal[]): EnrichedGoal[] {
  return goals as EnrichedGoal[];
}

export function sortGoals(goals: EnrichedGoal[], sort: GoalSort): EnrichedGoal[] {
  const copy = [...goals];
  if (sort === "target-date") {
    return copy.sort((a, b) => {
      const aTime = a.targetDate
        ? (parseIsoDate(a.targetDate)?.getTime() ?? Number.POSITIVE_INFINITY)
        : Number.POSITIVE_INFINITY;
      const bTime = b.targetDate
        ? (parseIsoDate(b.targetDate)?.getTime() ?? Number.POSITIVE_INFINITY)
        : Number.POSITIVE_INFINITY;
      return aTime - bTime;
    });
  }
  if (sort === "progress") {
    return copy.sort(
      (a, b) =>
        progressPercent(b.current, b.target) -
        progressPercent(a.current, a.target),
    );
  }
  return copy.sort((a, b) => a.priority - b.priority);
}
