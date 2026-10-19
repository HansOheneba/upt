import type { Contribution, Withdrawal } from "@/lib/pension/types";

export function formatGhs(amount: number, digits = 2): string {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount);
}

export function formatUnits(units: number): string {
  return new Intl.NumberFormat("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(units);
}

export function formatPensionDate(iso: string): string {
  const date = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function memberName(member: { firstName: string; lastName: string }): string {
  return `${member.firstName} ${member.lastName}`.trim();
}

/** Paid withdrawals reduce units at today's price so the pot and the unit count agree. */
export function outstandingUnits(
  contributions: Contribution[],
  withdrawals: Withdrawal[],
  unitPrice: number,
): number {
  const bought = contributions.reduce((sum, row) => sum + row.units, 0);
  const sold =
    unitPrice > 0
      ? withdrawals
          .filter((row) => row.status === "paid")
          .reduce((sum, row) => sum + row.amount / unitPrice, 0)
      : 0;
  return Math.max(0, Math.round((bought - sold) * 100) / 100);
}

export function potValue(units: number, unitPrice: number): number {
  return Math.round(units * unitPrice * 100) / 100;
}

export type PotPoint = { date: string; value: number };

export function potSeries(
  contributions: Contribution[],
  withdrawals: Withdrawal[],
  unitPrice: number,
): PotPoint[] {
  let units = 0;
  const points = contributions.map((row) => {
    units += row.units;
    return { date: row.date, value: Math.round(units * row.unitPrice * 100) / 100 };
  });
  if (points.length === 0) return points;
  points[points.length - 1] = {
    date: points[points.length - 1].date,
    value: potValue(outstandingUnits(contributions, withdrawals, unitPrice), unitPrice),
  };
  return points;
}
