import { formatPensionDate } from "@/lib/pension/metrics";

export const STATEMENT_PERIODS = [
  { id: "this-year", label: "This year" },
  { id: "last-year", label: "Last year" },
  { id: "last-12", label: "Last 12 months" },
  { id: "all", label: "All activity" },
  { id: "custom", label: "Custom range" },
] as const;

export type StatementPeriodId = (typeof STATEMENT_PERIODS)[number]["id"];

const PERIOD_IDS = new Set<string>(STATEMENT_PERIODS.map((row) => row.id));

export function isStatementPeriod(value: string | null): value is StatementPeriodId {
  return value != null && PERIOD_IDS.has(value);
}

export type StatementRange = { start: string; end: string };

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function namedRange(period: Exclude<StatementPeriodId, "all" | "custom">, today: Date): StatementRange {
  if (period === "this-year") {
    return { start: `${today.getFullYear()}-01-01`, end: toIsoDate(today) };
  }
  if (period === "last-year") {
    const year = today.getFullYear() - 1;
    return { start: `${year}-01-01`, end: `${year}-12-31` };
  }
  const start = new Date(today);
  start.setFullYear(start.getFullYear() - 1);
  return { start: toIsoDate(start), end: toIsoDate(today) };
}

export function resolveStatementPeriod(
  period: StatementPeriodId,
  from: string,
  to: string,
  today = new Date(),
): { range: StatementRange | null; valid: boolean; label: string } {
  if (period === "all") {
    return { range: null, valid: true, label: "All activity" };
  }
  if (period === "custom") {
    if (!isIsoDate(from) || !isIsoDate(to) || from > to) {
      return { range: null, valid: false, label: "Custom range" };
    }
    return {
      range: { start: from, end: to },
      valid: true,
      label: `${formatPensionDate(from)} to ${formatPensionDate(to)}`,
    };
  }
  const range = namedRange(period, today);
  const named = STATEMENT_PERIODS.find((row) => row.id === period)?.label ?? "Period";
  return {
    range,
    valid: true,
    label: `${named}, ${formatPensionDate(range.start)} to ${formatPensionDate(range.end)}`,
  };
}

export function customPeriodError(from: string, to: string): string {
  if (!isIsoDate(from) || !isIsoDate(to)) return "Choose a start date and an end date.";
  return "The start date has to be on or before the end date.";
}

/** Null range means every dated row. Undated rows stay out of a bounded period. */
export function inStatementRange(iso: string, range: StatementRange | null): boolean {
  if (!range) return true;
  const day = iso.slice(0, 10);
  if (!isIsoDate(day)) return false;
  return day >= range.start && day <= range.end;
}

export function statementHref(
  scope: string,
  period: StatementPeriodId,
  from: string,
  to: string,
): string {
  const params = new URLSearchParams();
  params.set("membership", scope);
  if (period !== "all") params.set("period", period);
  if (period === "custom") {
    if (from) params.set("from", from);
    if (to) params.set("to", to);
  }
  return `/dashboard/statement?${params.toString()}`;
}
