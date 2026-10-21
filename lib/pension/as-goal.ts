import type { Goal } from "@/lib/client-data";
import { outstandingUnits, potValue } from "@/lib/pension/metrics";
import { personalMembership, rowsForMembership } from "@/lib/pension/portfolio";
import { isUptPensionDemoActive } from "@/lib/pension/session";
import type { Contribution, Membership, PensionMember, Withdrawal } from "@/lib/pension/types";
import { useFinancialStore } from "@/store/financialStore";
import { usePensionStore } from "@/store/pensionStore";

/** Stable id so the pension target is the same goal on both screens. */
export const PENSION_GOAL_ID = "pension-target";

function retirementDate(dateOfBirth: string, retirementAge: number): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateOfBirth);
  if (!match || !Number.isInteger(retirementAge) || retirementAge <= 0) return null;
  const date = new Date(
    Number(match[1]) + retirementAge,
    Number(match[2]) - 1,
    Number(match[3]),
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

function isoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function yearsUntil(date: Date): number {
  const years =
    (date.getTime() - Date.now()) / (365.25 * 24 * 60 * 60 * 1000);
  return Math.max(0, Math.round(years * 10) / 10);
}

export function goalFromPension(
  member: PensionMember,
  membership: Membership,
  contributions: Contribution[],
  withdrawals: Withdrawal[],
): Goal | null {
  const targetPot = membership.targetPot ?? 0;
  const retirementAge = membership.retirementAge ?? 0;
  if (!Number.isFinite(targetPot) || targetPot <= 0) return null;

  const scopedContributions = rowsForMembership(contributions, membership.id);
  const scopedWithdrawals = rowsForMembership(withdrawals, membership.id);
  const priceReady = Number.isFinite(membership.unitPrice) && membership.unitPrice > 0;
  const current = priceReady
    ? potValue(
        outstandingUnits(scopedContributions, scopedWithdrawals, membership.unitPrice),
        membership.unitPrice,
      )
    : 0;
  const retires = retirementDate(member.dateOfBirth, retirementAge);
  const yearsRemaining = retires ? yearsUntil(retires) : 0;
  const months = yearsRemaining > 0 ? Math.max(1, Math.round(yearsRemaining * 12)) : 0;
  const gap = Math.max(0, targetPot - current);
  const monthly = Number.isFinite(membership.monthlyContribution)
    ? membership.monthlyContribution
    : 0;
  const covered = monthly * months;
  const completed = current >= targetPot;

  return {
    id: PENSION_GOAL_ID,
    userId: member.id,
    title: "Pension",
    category: "retirement",
    priority: 1,
    description:
      retirementAge > 0
        ? `The amount you want in your pension by age ${retirementAge}.`
        : "The amount you want in your pension.",
    yearsRemaining,
    current,
    target: targetPot,
    completed,
    completedDate: completed ? isoDate(new Date()) : undefined,
    targetDate: retires ? isoDate(retires) : undefined,
    monthlyContributionNeeded: months > 0 ? Math.round(gap / months) : Math.round(gap),
    probability: completed
      ? 100
      : gap <= 0
        ? 100
        : Math.max(0, Math.min(100, Math.round((covered / gap) * 100))),
    createdAt: membership.memberSince || new Date().toISOString(),
  };
}

/** Pension stays priority 1. Other goals keep their relative order after it. */
export function withPensionGoalFirst(goals: Goal[], pension: Goal | null): Goal[] {
  const rest = goals
    .filter((goal) => goal.id !== PENSION_GOAL_ID)
    .sort((a, b) => a.priority - b.priority);
  if (!pension) {
    return rest.map((goal, index) =>
      goal.priority === index + 1 ? goal : { ...goal, priority: index + 1 },
    );
  }
  const next = [
    { ...pension, priority: 1 },
    ...rest.map((goal, index) =>
      goal.priority === index + 2 ? goal : { ...goal, priority: index + 2 },
    ),
  ];
  return next;
}

function signature(goals: Goal[]): string {
  return goals
    .map((goal) =>
      [
        goal.id,
        goal.priority,
        goal.title,
        goal.current,
        goal.target,
        goal.targetDate ?? "",
        goal.yearsRemaining,
        goal.monthlyContributionNeeded,
        goal.probability,
        goal.completed ? 1 : 0,
        goal.description ?? "",
      ].join("\u001f"),
    )
    .join("\u001e");
}

/** Writes the pension target into the goals list as the first goal. */
export function syncPensionGoalIntoFinancialStore(): void {
  if (!isUptPensionDemoActive()) return;
  const { member, memberships, contributions, withdrawals } = usePensionStore.getState();
  const personal = personalMembership(memberships);
  const pension = member && personal
    ? goalFromPension(member, personal, contributions, withdrawals)
    : null;
  const current = useFinancialStore.getState().goals;
  const next = withPensionGoalFirst(current, pension);
  if (signature(current) === signature(next)) return;
  useFinancialStore.getState().setGoals(next);
}
