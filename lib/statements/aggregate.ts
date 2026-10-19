import { categoryLabel } from "@/lib/statements/categories";
import type {
  CategorySuggestion,
  StatementHistoryPoint,
  StatementTransaction,
} from "@/lib/statements/types";

function roundWhole(value: number): number {
  return Math.round(value);
}

export function includedCashTransactions(
  transactions: StatementTransaction[],
): StatementTransaction[] {
  return transactions.filter(
    (transaction) => !transaction.excluded && transaction.type !== "transfer",
  );
}

export function statementHistoryPoints(
  transactions: StatementTransaction[],
): StatementHistoryPoint[] {
  const totals = new Map<string, { income: number; expenses: number }>();

  for (const transaction of includedCashTransactions(transactions)) {
    const month = transaction.date.slice(0, 7);
    const current = totals.get(month) ?? { income: 0, expenses: 0 };

    if (transaction.type === "income") {
      current.income += transaction.amount;
    } else if (transaction.type === "expense") {
      current.expenses += transaction.amount;
    }

    totals.set(month, current);
  }

  return [...totals.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([month, value]) => {
      const income = roundWhole(value.income);
      const expenses = roundWhole(value.expenses);

      return {
        month,
        income,
        expenses,
        surplus: income - expenses,
        source: "statement" as const,
      };
    });
}

export function mergeStatementHistory(
  history: StatementHistoryPoint[],
  imported: StatementHistoryPoint[],
): StatementHistoryPoint[] {
  const byMonth = new Map(
    history.map((point) => [point.month, { ...point }]),
  );

  for (const point of imported) {
    const existing = byMonth.get(point.month);

    if (!existing) {
      byMonth.set(point.month, {
        month: point.month,
        income: point.income,
        expenses: point.expenses,
        surplus: point.income - point.expenses,
        source: "statement",
      });
      continue;
    }

    if (existing.source === "statement") {
      const income = existing.income + point.income;
      const expenses = existing.expenses + point.expenses;
      byMonth.set(point.month, {
        month: point.month,
        income,
        expenses,
        surplus: income - expenses,
        source: "statement",
      });
      continue;
    }

    const statementIncome = (existing.statementIncome ?? 0) + point.income;
    const statementExpenses = (existing.statementExpenses ?? 0) + point.expenses;
    byMonth.set(point.month, {
      ...existing,
      statementIncome,
      statementExpenses,
    });
  }

  return [...byMonth.values()].sort((left, right) =>
    left.month.localeCompare(right.month),
  );
}

export function buildCategorySuggestions(
  transactions: StatementTransaction[],
): CategorySuggestion[] {
  const included = includedCashTransactions(transactions);
  const months = new Set(included.map((transaction) => transaction.date.slice(0, 7)));
  const monthCount = Math.max(months.size, 1);
  const groups = new Map<
    string,
    { type: "income" | "expense"; category: string; total: number; count: number }
  >();

  for (const transaction of included) {
    if (transaction.type === "transfer") {
      continue;
    }

    const key = `${transaction.type}:${transaction.category}`;
    const current = groups.get(key) ?? {
      type: transaction.type,
      category: transaction.category,
      total: 0,
      count: 0,
    };
    current.total += transaction.amount;
    current.count += 1;
    groups.set(key, current);
  }

  return [...groups.values()]
    .map((group) => ({
      key: `${group.type}:${group.category}`,
      type: group.type,
      category: group.category,
      label: categoryLabel(group.type, group.category),
      monthlyAverage: roundWhole(group.total / monthCount),
      transactionCount: group.count,
    }))
    .filter((suggestion) => suggestion.monthlyAverage > 0)
    .sort((left, right) => right.monthlyAverage - left.monthlyAverage);
}

export function statementTotals(transactions: StatementTransaction[]): {
  count: number;
  income: number;
  expenses: number;
  transfers: number;
} {
  const included = transactions.filter((transaction) => !transaction.excluded);

  return included.reduce(
    (totals, transaction) => {
      totals.count += 1;
      if (transaction.type === "income") {
        totals.income += transaction.amount;
      } else if (transaction.type === "expense") {
        totals.expenses += transaction.amount;
      } else {
        totals.transfers += transaction.amount;
      }
      return totals;
    },
    { count: 0, income: 0, expenses: 0, transfers: 0 },
  );
}

export function statementPeriod(transactions: Array<{ date: string }>): {
  periodStart: string | null;
  periodEnd: string | null;
} {
  const dates = transactions
    .map((transaction) => transaction.date)
    .filter((date) => date.length > 0)
    .sort();

  return {
    periodStart: dates[0] ?? null,
    periodEnd: dates.at(-1) ?? null,
  };
}
