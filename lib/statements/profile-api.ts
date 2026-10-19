import "server-only";

import type { CashFlowRow, ExpenseCategory } from "@/lib/client-data";
import { categoryLabel } from "@/lib/statements/categories";
import type { StatementProfile } from "@/lib/statements/apply";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function unwrapList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  const root = asRecord(payload);
  if (!root) {
    return [];
  }

  if (Array.isArray(root.data)) {
    return root.data;
  }

  const nested = asRecord(root.data);
  if (nested && Array.isArray(nested.data)) {
    return nested.data;
  }

  return [];
}

function apiBase(): string {
  const base = process.env.NEXT_PUBLIC_BASE_API_URL?.replace(/\/$/, "");
  if (!base) {
    throw new Error("Missing API base URL.");
  }
  return base;
}

async function apiRequest(
  token: string,
  path: string,
  method: "GET" | "POST" | "PUT",
  body?: unknown,
): Promise<unknown> {
  const response = await fetch(`${apiBase()}/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(method === "GET" ? {} : { "Content-Type": "application/json" }),
    },
    body: method === "GET" || body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok || asRecord(payload)?.success === false) {
    throw new Error("Couldn't update your cash flow.");
  }

  return payload;
}

function toIncome(raw: unknown): CashFlowRow | null {
  const row = asRecord(raw);
  if (!row || typeof row.id !== "string") {
    return null;
  }

  return {
    id: row.id,
    name: typeof row.name === "string" ? row.name : "Income",
    amount: Number(row.amount ?? row.amount_monthly) || 0,
    category: typeof row.category === "string" ? row.category : undefined,
    isRecurring: row.recurring_type !== "one-time" && row.is_recurring !== false,
    recurringType: row.recurring_type === "one-time" ? "one-time" : "monthly",
    startDate: typeof row.start_date === "string" ? row.start_date : undefined,
    endDate: typeof row.end_date === "string" ? row.end_date : undefined,
  };
}

function toExpense(raw: unknown): ExpenseCategory | null {
  const row = asRecord(raw);
  if (!row || typeof row.id !== "string") {
    return null;
  }

  return {
    id: row.id,
    name: typeof row.name === "string" ? row.name : "Expense",
    amount: Number(row.amount ?? row.amount_monthly) || 0,
    category: typeof row.category === "string" ? row.category : undefined,
    essential: row.essential === true,
    isRecurring: row.recurring_type !== "one-time" && row.is_recurring !== false,
    recurringType: row.recurring_type === "one-time" ? "one-time" : "monthly",
    startDate: typeof row.start_date === "string" ? row.start_date : undefined,
    endDate: typeof row.end_date === "string" ? row.end_date : undefined,
  };
}

export async function loadStatementProfile(
  token: string,
): Promise<StatementProfile> {
  const [incomePayload, expensePayload] = await Promise.all([
    apiRequest(token, "cashflow.income.find?is_active=true", "GET"),
    apiRequest(token, "cashflow.expense.find?is_active=true", "GET"),
  ]);

  return {
    incomeRows: unwrapList(incomePayload)
      .map(toIncome)
      .filter((row): row is CashFlowRow => row !== null),
    expenseCategories: unwrapList(expensePayload)
      .map(toExpense)
      .filter((row): row is ExpenseCategory => row !== null),
  };
}

function categoryForApi(
  type: "income" | "expense",
  category: string | undefined,
): string | undefined {
  if (!category) {
    return undefined;
  }

  return categoryLabel(type, category);
}

export async function saveStatementProfile(
  token: string,
  currency: string,
  before: StatementProfile,
  after: StatementProfile,
): Promise<void> {
  const incomeBefore = new Map(before.incomeRows.map((row) => [row.id, row]));
  const expenseBefore = new Map(
    before.expenseCategories.map((row) => [row.id, row]),
  );

  for (const row of after.incomeRows) {
    const previous = incomeBefore.get(row.id);
    const category = categoryForApi("income", row.category);
    if (!previous) {
      await apiRequest(token, "cashflow.income.create", "POST", {
        name: row.name,
        category: category || "Other",
        amount: row.amount,
        source_currency: currency,
        recurring_type: "monthly",
        start_date: row.startDate ?? new Date().toISOString().slice(0, 10),
        end_date: null,
      });
      continue;
    }

    if (
      previous.amount === row.amount &&
      (previous.category ?? "") === (row.category ?? "")
    ) {
      continue;
    }

    await apiRequest(token, "cashflow.income.update", "PUT", {
      id: row.id,
      amount: row.amount,
      ...(category ? { category } : {}),
    });
  }

  for (const row of after.expenseCategories) {
    const previous = expenseBefore.get(row.id);
    const category = categoryForApi("expense", row.category);
    if (!previous) {
      await apiRequest(token, "cashflow.expense.create", "POST", {
        name: row.name,
        category: category || "Other",
        amount: row.amount,
        source_currency: currency,
        recurring_type: "monthly",
        start_date: row.startDate ?? new Date().toISOString().slice(0, 10),
        end_date: null,
        essential: row.essential,
      });
      continue;
    }

    if (
      previous.amount === row.amount &&
      (previous.category ?? "") === (row.category ?? "")
    ) {
      continue;
    }

    await apiRequest(token, "cashflow.expense.update", "PUT", {
      id: row.id,
      amount: row.amount,
      essential: row.essential,
      ...(category ? { category } : {}),
    });
  }
}

export async function uploadStatementDocument(
  token: string,
  fileName: string,
  contentType: string,
  bytes: Buffer,
): Promise<{ documentId: string; downloadUrl: string | null } | null> {
  const form = new FormData();
  form.append(
    "file",
    new File([new Uint8Array(bytes)], fileName, { type: contentType }),
  );
  form.append("title", fileName);
  form.append("category", "statement");

  const response = await fetch(`${apiBase()}/client.documents.upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    return null;
  }

  const root = asRecord(payload);
  const data = asRecord(root?.data) ?? root;
  const documentId = data?.documentId ?? data?.id;
  if (typeof documentId !== "string" || documentId.length === 0) {
    return null;
  }

  const downloadUrl =
    typeof data?.downloadUrl === "string" ? data.downloadUrl : null;
  return { documentId, downloadUrl };
}
