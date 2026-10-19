export type RetirementStorageValue =
  | "employer_pension"
  | "personal_pension"
  | "roth_account"
  | "brokerage"
  | "target_date_fund"
  | "savings_account"
  | "physical_cash"
  | "mixed"
  | "other";

export const RETIREMENT_STORAGE_LOCATIONS: {
  value: RetirementStorageValue;
  label: string;
}[] = [
  { value: "employer_pension", label: "Employer pension / 401(k)" },
  { value: "personal_pension", label: "Personal pension / Traditional IRA" },
  { value: "roth_account", label: "Roth IRA / tax-free account" },
  { value: "brokerage", label: "Stocks & ETFs (taxable brokerage)" },
  { value: "target_date_fund", label: "Target-date / balanced fund" },
  { value: "savings_account", label: "Savings account" },
  { value: "physical_cash", label: "Cash / checking account" },
  { value: "mixed", label: "Split across multiple accounts" },
  { value: "other", label: "Other" },
];

export const RETIREMENT_STORAGE_LABELS: Record<string, string> =
  Object.fromEntries(
    RETIREMENT_STORAGE_LOCATIONS.map(({ value, label }) => [value, label]),
  );

export type StorageTipTone = "good" | "warning" | "info";

export interface RetirementStorageTip {
  tone: StorageTipTone;
  title: string;
  text: string;
}

export const RETIREMENT_STORAGE_TIPS: Record<string, RetirementStorageTip> = {
  employer_pension: {
    tone: "good",
    title: "Strong foundation.",
    text: "Employer plans often include matching contributions. Make sure you are capturing the full match before investing elsewhere.",
  },
  personal_pension: {
    tone: "good",
    title: "Tax-advantaged growth.",
    text: "Traditional pensions and IRAs defer taxes until withdrawal. Pair this with a Roth account if you expect a higher tax bracket in retirement.",
  },
  roth_account: {
    tone: "good",
    title: "Tax-free in retirement.",
    text: "Roth accounts grow tax-free and withdrawals in retirement are not taxed. Excellent for long-term compounding, especially early in your career.",
  },
  brokerage: {
    tone: "info",
    title: "Flexible, but taxable.",
    text: "Taxable brokerage accounts offer flexibility. Max out tax-advantaged accounts (401k, IRA) first, then use brokerage for overflow.",
  },
  target_date_fund: {
    tone: "good",
    title: "Hands-off diversification.",
    text: "Target-date funds automatically adjust risk as you approach retirement. A solid choice if you prefer not to manage individual holdings.",
  },
  savings_account: {
    tone: "warning",
    title: "Cash loses to inflation over decades.",
    text: "Savings accounts earn very little. For retirement, low-cost index funds inside a 401(k) or IRA typically grow much faster over 20+ years.",
  },
  physical_cash: {
    tone: "warning",
    title: "Cash is not a retirement strategy.",
    text: "Keeping retirement savings in cash or checking means missing decades of compound growth and losing purchasing power to inflation. Move long-term savings into invested accounts.",
  },
  mixed: {
    tone: "info",
    title: "Diversified across accounts.",
    text: "Spreading across account types can be smart. Prioritize maxing employer match and tax-advantaged limits before adding to taxable accounts.",
  },
  other: {
    tone: "info",
    title: "Review your setup.",
    text: "Make sure your retirement savings are in accounts designed for long-term growth, with fees below 0.5% where possible.",
  },
};

export function getRetirementStorageLabel(value?: string | null): string {
  if (!value) return "Not specified";
  return RETIREMENT_STORAGE_LABELS[value] ?? value;
}

export function getRetirementStorageTip(
  value?: string | null,
): RetirementStorageTip | null {
  if (!value) return null;
  return RETIREMENT_STORAGE_TIPS[value] ?? null;
}

export const STORAGE_TIP_TONE_COLORS: Record<
  StorageTipTone,
  { bg: string; border: string; text: string; sub: string }
> = {
  good: {
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    text: "text-emerald-800",
    sub: "text-emerald-700",
  },
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-100",
    text: "text-amber-800",
    sub: "text-amber-700",
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-100",
    text: "text-blue-800",
    sub: "text-blue-700",
  },
};
