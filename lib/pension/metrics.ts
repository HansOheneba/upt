import type { Contribution, Withdrawal } from "@/lib/pension/types";

export function formatGhs(amount: number, digits = 2): string {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount);
}

/**
 * Thousands separators while typing. Keeps a decimal point and up to two pesewas.
 * A cedi symbol or code is ignored. A single comma used as the decimal mark
 * (1250,50 or 1.250,50) is kept as pesewas. Commas that group thousands stay grouping.
 */
export function formatAmountTyping(raw: string): string {
  const compact = raw
    .replace(/gh₵|gh¢|ghs|ghc|₵|¢/gi, "")
    .replace(/[\s\u00A0\u202F]/g, "");
  const lastComma = compact.lastIndexOf(",");
  const firstDot = compact.indexOf(".");
  let body = compact;
  if (firstDot === -1 && lastComma !== -1) {
    const after = compact.slice(lastComma + 1).replace(/[^\d]/g, "");
    const commas = compact.split(",").length - 1;
    if (commas === 1 && after.length <= 2) {
      body = `${compact.slice(0, lastComma)}.${after}`;
    }
  } else if (firstDot !== -1 && lastComma > firstDot) {
    const after = compact.slice(lastComma + 1).replace(/[^\d]/g, "");
    const whole = compact.slice(0, lastComma).replace(/[^\d]/g, "");
    body = `${whole}.${after}`;
  }
  const cleaned = body.replace(/,/g, "").replace(/[^\d.]/g, "");
  const dot = cleaned.indexOf(".");
  const wholeDigits = (dot === -1 ? cleaned : cleaned.slice(0, dot)).replace(/^0+(?=\d)/, "");
  const fraction = dot === -1 ? undefined : cleaned.slice(dot + 1).replace(/\D/g, "").slice(0, 2);
  const grouped = wholeDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (fraction === undefined) return grouped;
  return `${grouped || "0"}.${fraction}`;
}

/** Pads a typed decimal to two places. Whole amounts stay without a trailing period. */
export function finalizeAmountInput(raw: string): string {
  const typing = formatAmountTyping(raw);
  if (!typing.includes(".")) return typing;
  const [whole, fraction = ""] = typing.split(".");
  if (!fraction) return whole;
  return `${whole}.${fraction.padEnd(2, "0")}`;
}

/** Ghana cedi amount in cedis, rounded to pesewas. Blank input is 0. */
export function parseAmountInput(value: string): number {
  const typed = formatAmountTyping(value);
  if (!typed) return 0;
  const amount = Number(typed.replace(/,/g, ""));
  if (!Number.isFinite(amount)) return Number.NaN;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
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

/**
 * Reconstructs a pot from contribution unit prices. This is not a valuation
 * history: prices between contributions are unknown, paid withdrawals are
 * applied only on the final point at the latest price, and the member record
 * stores no separate valuation series. Do not plot this as pension value
 * over time.
 */
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
