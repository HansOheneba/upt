import type { Contribution, ContributionChannel } from "@/lib/pension/types";

export const CONTRIBUTION_SOURCE_LABEL: Record<ContributionChannel, string> = {
  momo: "Mobile money",
  cash: "Cash",
  bank: "Bank",
};

export function contributionSourceLabel(channel: ContributionChannel | undefined): string {
  if (channel && channel in CONTRIBUTION_SOURCE_LABEL) {
    return CONTRIBUTION_SOURCE_LABEL[channel];
  }
  return "Source unavailable";
}

/** Monthly history is short enough that a year of rows fits on one page. */
export const CONTRIBUTION_PAGE_SIZE = 12;

export type ContributionSummary = {
  count: number;
  /** Sum of stored contribution amounts. Not a pension valuation. */
  totalAmount: number;
  /** Sum of units stored on each contribution. Paid withdrawals are not deducted. */
  totalUnits: number;
  latest: Contribution | null;
};

function cents(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Totals come from the amounts and units already stored on each contribution.
 * This does not allocate units or value the pension.
 */
export function summarizeContributions(contributions: Contribution[]): ContributionSummary {
  let totalAmount = 0;
  let totalUnits = 0;
  let latest: Contribution | null = null;

  for (const row of contributions) {
    if (Number.isFinite(row.amount)) totalAmount += row.amount;
    if (Number.isFinite(row.units)) totalUnits += row.units;
    if (!row.date) continue;
    if (!latest || row.date > latest.date) latest = row;
  }

  return {
    count: contributions.length,
    totalAmount: cents(totalAmount),
    totalUnits: cents(totalUnits),
    latest,
  };
}

export function sortContributionsDesc(contributions: Contribution[]): Contribution[] {
  return [...contributions].sort(
    (a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
  );
}

/** Sum of contribution amounts whose date falls in the given calendar year. */
export function contributionsInYear(contributions: Contribution[], year: number): number {
  const prefix = `${year}-`;
  let total = 0;
  for (const row of contributions) {
    if (!row.date?.startsWith(prefix) || !Number.isFinite(row.amount)) continue;
    total += row.amount;
  }
  return Math.round(total * 100) / 100;
}

export function contributionYears(contributions: Contribution[]): string[] {
  const years = new Set<string>();
  for (const row of contributions) {
    const year = row.date?.slice(0, 4);
    if (year && /^\d{4}$/.test(year)) years.add(year);
  }
  return [...years].sort((a, b) => b.localeCompare(a));
}
