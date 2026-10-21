import type { Contribution, Membership, Withdrawal } from "@/lib/pension/types";

export type ValueChartRange = "1" | "3" | "6" | "12" | "all";

export type ValueHistoryScheme = {
  id: string;
  name: string;
  color: string;
};

export type ValueHistoryPoint = {
  /** YYYY-MM */
  key: string;
  tick: string;
  fullLabel: string;
  /** Scheme id to value that month. Null before the scheme has a unit price. */
  values: Record<string, number | null>;
};

/** Navy, then a warm contrast, so neighbouring schemes stay easy to tell apart. */
const LINE_COLORS = ["#1E3059", "#E3943A", "#5C6BC0", "#8D95A3"] as const;

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

function monthKeyFromDate(iso: string | undefined): string | null {
  const match = /^(\d{4})-(\d{2})/.exec(iso ?? "");
  if (!match) return null;
  return monthParts(`${match[1]}-${match[2]}`) ? `${match[1]}-${match[2]}` : null;
}

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

function monthEnd(year: number, month: number): string {
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

function monthLabel(key: string, style: "short" | "long"): string {
  const parts = monthParts(key);
  if (!parts) return key;
  const date = new Date(Date.UTC(parts.year, parts.month - 1, 1));
  return (style === "short" ? MONTH_SHORT : MONTH_LONG).format(date);
}

function dateOnly(iso: string | undefined): string {
  return iso?.slice(0, 10) ?? "";
}

/**
 * Value of one scheme at the end of a month.
 * Units bought so far, minus paid withdrawals, at the latest unit price known
 * on or before that date. Matches the current pot when the date is the latest
 * priced month.
 */
function valueAt(
  membership: Membership,
  contributions: Contribution[],
  withdrawals: Withdrawal[],
  asOf: string,
): number | null {
  const rows = contributions.filter(
    (row) =>
      row.membershipId === membership.id &&
      dateOnly(row.date) <= asOf &&
      Number.isFinite(row.units) &&
      Number.isFinite(row.unitPrice) &&
      row.unitPrice > 0,
  );
  if (rows.length === 0) return null;

  let price = rows.reduce((latest, row) => (row.date > latest.date ? row : latest)).unitPrice;
  const latestContribution = rows.reduce((latest, row) => (row.date > latest ? row.date : latest), "");
  const officialDate = dateOnly(membership.unitPriceDate);
  if (
    officialDate &&
    officialDate <= asOf &&
    officialDate >= dateOnly(latestContribution) &&
    Number.isFinite(membership.unitPrice) &&
    membership.unitPrice > 0
  ) {
    price = membership.unitPrice;
  }

  const bought = rows.reduce((sum, row) => sum + row.units, 0);
  const sold = withdrawals.reduce((sum, row) => {
    if (row.membershipId !== membership.id || row.status !== "paid") return sum;
    if (!Number.isFinite(row.amount) || dateOnly(row.submittedAt) > asOf) return sum;
    return sum + row.amount / price;
  }, 0);
  const units = Math.max(0, Math.round((bought - sold) * 100) / 100);
  return Math.round(units * price * 100) / 100;
}

function windowMonths(
  contributions: Contribution[],
  range: ValueChartRange,
  now: Date,
): { year: number; month: number }[] {
  const recorded = contributions
    .map((row) => monthKeyFromDate(row.date))
    .filter((key): key is string => key != null)
    .sort();
  let end = { year: now.getFullYear(), month: now.getMonth() + 1 };
  let start: { year: number; month: number };

  if (range === "all") {
    if (recorded.length === 0) return [];
    const first = monthParts(recorded[0]);
    const last = monthParts(recorded[recorded.length - 1]);
    if (!first || !last) return [];
    start = first;
    if (monthKey(last.year, last.month) > monthKey(end.year, end.month)) end = last;
  } else {
    const count = range === "1" ? 1 : range === "3" ? 3 : range === "6" ? 6 : 12;
    const latest = recorded.length > 0 ? monthParts(recorded[recorded.length - 1]) : null;
    if (latest && monthKey(latest.year, latest.month) > monthKey(end.year, end.month)) {
      end = latest;
    }
    start = shiftMonth(end.year, end.month, -(count - 1));
  }

  const months: { year: number; month: number }[] = [];
  let cursor = start;
  const endKey = monthKey(end.year, end.month);
  for (let guard = 0; guard < 600; guard += 1) {
    months.push(cursor);
    if (monthKey(cursor.year, cursor.month) >= endKey) break;
    cursor = shiftMonth(cursor.year, cursor.month, 1);
  }
  return months;
}

/** One point per month, with a value for each scheme that has a unit price by then. */
export function schemeValueHistory(
  memberships: Membership[],
  contributions: Contribution[],
  withdrawals: Withdrawal[],
  range: ValueChartRange,
  now: Date = new Date(),
): { schemes: ValueHistoryScheme[]; points: ValueHistoryPoint[] } {
  const months = windowMonths(contributions, range, now);
  const spansYears =
    months.length > 1 &&
    months[0].year !== months[months.length - 1].year;

  const points: ValueHistoryPoint[] = months.map(({ year, month }) => {
    const key = monthKey(year, month);
    const short = monthLabel(key, "short").replace(/\s+\d{4}$/, "");
    const values: Record<string, number | null> = {};
    for (const membership of memberships) {
      values[membership.id] = valueAt(
        membership,
        contributions,
        withdrawals,
        monthEnd(year, month),
      );
    }
    return {
      key,
      tick: spansYears || months.length > 16 ? `${short} '${key.slice(2, 4)}` : short,
      fullLabel: monthLabel(key, "long"),
      values,
    };
  });

  const schemes = memberships
    .filter((membership) => points.some((point) => point.values[membership.id] != null))
    .map((membership, index) => ({
      id: membership.id,
      name: membership.schemeName,
      color: LINE_COLORS[index % LINE_COLORS.length],
    }));

  return { schemes, points };
}
