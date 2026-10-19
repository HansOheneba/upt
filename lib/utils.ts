import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Currency utilities ───────────────────────────────────────────────────────
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  GBP: "£",
  EUR: "€",
  GHS: "GHS",
  NGN: "NGN",
  KES: "KES",
  ZAR: "R",
  CAD: "$",
  AUD: "$",
  CHF: "CHF",
  JPY: "¥",
  SGD: "$",
  AED: "د.إ",
  INR: "₹",
};

/**
 * Get the currency symbol or code for a given currency
 * Only returns symbols for major currencies; uses code for others
 */
export function getCurrencySymbol(currencyCode: string | undefined): string {
  if (!currencyCode) return "";
  return CURRENCY_SYMBOLS[currencyCode] || currencyCode;
}

/**
 * Format a number with dynamic currency symbol/code
 * Shows currency code if not USD to keep it clear for international users
 * @param amount The numeric amount to format
 * @param currencyCode The ISO currency code (e.g., "USD", "GHS", "NGN")
 * @param showCode If true, shows currency code for non-USD. If false, only shows symbol
 */
export function formatCurrencyAmount(
  amount: number | undefined,
  currencyCode: string | undefined,
  showCode: boolean = true,
): string {
  if (amount === undefined || amount === null) return "";

  const formatted = Number(amount).toLocaleString();
  const symbol = getCurrencySymbol(currencyCode);

  // For USD, just show the $
  if (currencyCode === "USD") {
    return `$${formatted}`;
  }

  // For other currencies, show the code/symbol
  if (showCode && currencyCode && currencyCode !== "USD") {
    return `${symbol} ${formatted}`;
  }

  return `${symbol}${formatted}`;
}

/**
 * Get the currency prefix for input fields
 * Shows just the code/symbol, not the full formatted amount
 */
export function getCurrencyPrefix(currencyCode: string | undefined): string {
  if (!currencyCode) return "$";
  if (currencyCode === "USD") return "$";
  return currencyCode;
}
