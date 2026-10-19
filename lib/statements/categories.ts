import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
} from "@/lib/cash-flow/categories";
import type { StatementTransactionType } from "@/lib/statements/types";

const INCOME_RULES: Array<{ category: string; pattern: RegExp }> = [
  { category: "salary", pattern: /\b(salary|payroll|wages?|net pay)\b/i },
  { category: "freelance", pattern: /\b(freelance|contract payment|consulting fee)\b/i },
  { category: "rental", pattern: /\b(rental income|rent received|tenant)\b/i },
  { category: "dividends", pattern: /\b(dividend|distribution|coupon)\b/i },
  { category: "business", pattern: /\b(business income|invoice paid|sales receipt)\b/i },
  { category: "pension", pattern: /\b(pension|annuity|social security)\b/i },
];

const EXPENSE_RULES: Array<{ category: string; pattern: RegExp }> = [
  { category: "food", pattern: /\b(uber eats|bolt food|glovo|grocery|groceries|restaurant|shoprite|kfc|chicken inn)\b/i },
  { category: "transport", pattern: /\b(uber|bolt|fuel|petrol|diesel|shell|transport|trotro|yango)\b/i },
  { category: "housing", pattern: /\b(rent|mortgage|landlord|housing|hoa)\b/i },
  { category: "healthcare", pattern: /\b(hospital|pharmacy|clinic|medical|health)\b/i },
  { category: "entertainment", pattern: /\b(netflix|spotify|cinema|entertainment|dstv|showmax)\b/i },
  { category: "utilities", pattern: /\b(electricity|utility|utilities|ecg|gwcl|water bill|airtime|mtn|vodafone|airteltigo|telecel)\b/i },
  { category: "education", pattern: /\b(school|tuition|education|university)\b/i },
  { category: "insurance", pattern: /\b(insurance|premium)\b/i },
];

const TRANSFER_PATTERN =
  /\b(transfer|trf|own account|internal transfer|between accounts|funds transfer)\b/i;

const LINE_ALIASES: Record<string, string> = {
  "employment income": "salary",
  "portfolio distributions": "dividends",
  "rental income": "rental",
  household: "housing",
  education: "education",
  "travel & lifestyle": "entertainment",
  "travel and lifestyle": "entertainment",
  "insurance & health": "insurance",
  "insurance and health": "insurance",
  philanthropy: "other",
};

const ESSENTIAL_EXPENSES = new Set([
  "housing",
  "food",
  "healthcare",
  "utilities",
  "insurance",
  "education",
]);

export function isTransferDescription(description: string): boolean {
  return TRANSFER_PATTERN.test(description);
}

export function categoryLabel(
  type: "income" | "expense",
  category: string,
): string {
  const options = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return options.find((option) => option.value === category)?.label ?? "Other";
}

export function isKnownCategory(
  type: StatementTransactionType,
  category: string,
): boolean {
  if (type === "transfer") {
    return category === "transfer";
  }

  const options = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return options.some((option) => option.value === category);
}

export function suggestCategory(
  description: string,
  type: StatementTransactionType,
): { category: string; confidence: number } {
  if (type === "transfer") {
    return { category: "transfer", confidence: 0.86 };
  }

  const rules = type === "income" ? INCOME_RULES : EXPENSE_RULES;

  for (const rule of rules) {
    if (rule.pattern.test(description)) {
      return { category: rule.category, confidence: 0.92 };
    }
  }

  return { category: "other", confidence: 0.45 };
}

export function canonicalLineCategory(row: {
  name: string;
  category?: string;
}): string | null {
  const raw = (row.category ?? row.name).trim().toLowerCase();
  const options = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];
  const slug = options.find((option) => option.value === raw);
  if (slug) {
    return slug.value;
  }

  const label = options.find((option) => option.label.toLowerCase() === raw);
  if (label) {
    return label.value;
  }

  return LINE_ALIASES[raw] ?? null;
}

export function expenseIsEssential(category: string): boolean {
  return ESSENTIAL_EXPENSES.has(category);
}
