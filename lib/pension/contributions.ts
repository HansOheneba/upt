import type { Contribution } from "@/lib/pension/types";

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

export type ContributionChartRange = "6" | "12" | "all";

export type MonthlyContributionPoint = {
  /** YYYY-MM */
  key: string;
  /** Axis tick. Year is shown on the first month and when the year changes. */
  tick: string;
  /** Full month and year for the tooltip */
  fullLabel: string;
  /** Sum of contribution amounts in that month. Zero when none were recorded. */
  amount: number;
};

const MONTH_SHORT = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const MONTH_LONG = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function monthKeyFromDate(iso: string | undefined): string | null {
  const match = /^(\d{4})-(\d{2})/.exec(iso ?? "");
  if (!match) return null;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return `${match[1]}-${match[2]}`;
}

function monthParts(key: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match) return null;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { year: Number(match[1]), month };
}

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function shiftMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

function monthLabel(key: string, style: "short" | "long"): string {
  const parts = monthParts(key);
  if (!parts) return key;
  const date = new Date(Date.UTC(parts.year, parts.month - 1, 1));
  return (style === "short" ? MONTH_SHORT : MONTH_LONG).format(date);
}

/**
 * Monthly contribution totals for the overview chart.
 * Months inside the window with no payments are included at zero.
 * The window ends at the later of the current month and the latest contribution.
 */
export function monthlyContributionSeries(
  contributions: Contribution[],
  range: ContributionChartRange,
  now: Date = new Date(),
): MonthlyContributionPoint[] {
  const totals = new Map<string, number>();
  for (const row of contributions) {
    const key = monthKeyFromDate(row.date);
    if (!key || !Number.isFinite(row.amount)) continue;
    totals.set(key, Math.round(((totals.get(key) ?? 0) + row.amount) * 100) / 100);
  }

  const recorded = [...totals.keys()].sort();
  let end = { year: now.getFullYear(), month: now.getMonth() + 1 };
  let start: { year: number; month: number };

  if (range === "all") {
    if (recorded.length === 0) return [];
    const first = monthParts(recorded[0]);
    const last = monthParts(recorded[recorded.length - 1]);
    if (!first || !last) return [];
    start = first;
    if (monthKey(last.year, last.month) > monthKey(end.year, end.month)) {
      end = last;
    }
  } else {
    const count = range === "6" ? 6 : 12;
    const latest = recorded.length > 0 ? monthParts(recorded[recorded.length - 1]) : null;
    if (latest && monthKey(latest.year, latest.month) > monthKey(end.year, end.month)) {
      end = latest;
    }
    start = shiftMonth(end.year, end.month, -(count - 1));
  }

  const points: MonthlyContributionPoint[] = [];
  let cursor = start;
  const endKey = monthKey(end.year, end.month);
  for (let guard = 0; guard < 600; guard += 1) {
    const key = monthKey(cursor.year, cursor.month);
    points.push({
      key,
      tick: "",
      fullLabel: monthLabel(key, "long"),
      amount: totals.get(key) ?? 0,
    });
    if (key >= endKey) break;
    cursor = shiftMonth(cursor.year, cursor.month, 1);
  }

  const dense = points.length > 16;
  return points.map((point) => {
    const month = monthLabel(point.key, "short").replace(/\s+\d{4}$/, "");
    const year = point.key.slice(2, 4);
    return {
      ...point,
      tick: dense ? `${month} '${year}` : month,
    };
  });
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
