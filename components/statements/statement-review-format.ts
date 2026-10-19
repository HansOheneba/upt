import type { DisplayCurrency } from "@/lib/format";

export function formatStatementMoney(
  value: number,
  currency: DisplayCurrency,
): string {
  const fraction = Math.abs(value - Math.trunc(value)) > 0.001;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: fraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatSignedStatementMoney(
  value: number,
  currency: DisplayCurrency,
): string {
  const formatted = formatStatementMoney(Math.abs(value), currency);

  if (value > 0) {
    return `+${formatted}`;
  }

  if (value < 0) {
    return `−${formatted}`;
  }

  return formatted;
}

export function formatReviewDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value || "-";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export function confidenceLabel(confidence: number): "High" | "Medium" | "Needs review" {
  if (confidence >= 0.9) {
    return "High";
  }

  if (confidence >= 0.7) {
    return "Medium";
  }

  return "Needs review";
}
