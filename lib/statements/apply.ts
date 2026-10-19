import type { CashFlowRow, ExpenseCategory } from "@/lib/client-data";
import {
  canonicalLineCategory,
  categoryLabel,
  expenseIsEssential,
} from "@/lib/statements/categories";
import type { CategorySuggestion } from "@/lib/statements/types";

export type StatementProfile = {
  incomeRows: CashFlowRow[];
  expenseCategories: ExpenseCategory[];
};

function nextLineId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function upsertIncome(
  profile: StatementProfile,
  suggestion: CategorySuggestion,
  startDate: string,
) {
  const index = profile.incomeRows.findIndex(
    (row) => canonicalLineCategory(row) === suggestion.category,
  );

  if (index >= 0) {
    const current = profile.incomeRows[index];
    profile.incomeRows[index] = {
      ...current,
      amount: suggestion.monthlyAverage,
      category: suggestion.category,
    };
    return;
  }

  profile.incomeRows.push({
    id: nextLineId("income"),
    name: categoryLabel("income", suggestion.category),
    category: suggestion.category,
    amount: suggestion.monthlyAverage,
    isRecurring: true,
    recurringType: "monthly",
    startDate,
    endDate: undefined,
  });
}

function upsertExpense(
  profile: StatementProfile,
  suggestion: CategorySuggestion,
  startDate: string,
) {
  const index = profile.expenseCategories.findIndex(
    (row) => canonicalLineCategory(row) === suggestion.category,
  );

  if (index >= 0) {
    const current = profile.expenseCategories[index];
    profile.expenseCategories[index] = {
      ...current,
      amount: suggestion.monthlyAverage,
      category: suggestion.category,
    };
    return;
  }

  profile.expenseCategories.push({
    id: nextLineId("expense"),
    name: categoryLabel("expense", suggestion.category),
    category: suggestion.category,
    amount: suggestion.monthlyAverage,
    essential: expenseIsEssential(suggestion.category),
    isRecurring: true,
    recurringType: "monthly",
    startDate,
  });
}

export function applyCategorySuggestions(
  profile: StatementProfile,
  suggestions: CategorySuggestion[],
  acceptedKeys: string[],
  startDate: string,
) {
  const accepted = new Set(acceptedKeys);

  for (const suggestion of suggestions) {
    if (!accepted.has(suggestion.key) || suggestion.monthlyAverage <= 0) {
      continue;
    }

    if (suggestion.type === "income") {
      upsertIncome(profile, suggestion, startDate);
    } else {
      upsertExpense(profile, suggestion, startDate);
    }
  }
}
