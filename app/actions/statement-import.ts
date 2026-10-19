"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { authorizeStatementClient } from "@/lib/statements/access";
import { applyCategorySuggestions } from "@/lib/statements/apply";
import {
  buildCategorySuggestions,
  mergeStatementHistory,
  statementHistoryPoints,
  statementPeriod,
} from "@/lib/statements/aggregate";
import {
  isKnownCategory,
  suggestCategory,
} from "@/lib/statements/categories";
import {
  priorFingerprintSet,
  withDuplicateFlags,
} from "@/lib/statements/fingerprint";
import { parseStatementFile, statementFileKind } from "@/lib/statements/parse";
import {
  loadStatementProfile,
  saveStatementProfile,
  uploadStatementDocument,
} from "@/lib/statements/profile-api";
import {
  readStatementLedger,
  saveStatementFile,
  withStatementLedger,
} from "@/lib/statements/store";
import type { StatementTransaction } from "@/lib/statements/types";

const MAX_FILE_BYTES = 15 * 1024 * 1024;

const reviewedTransactionSchema = z.object({
  id: z.string().trim().min(1),
  date: z.string().trim(),
  description: z.string().trim().min(1).max(180),
  amount: z.number().finite().nonnegative(),
  type: z.enum(["income", "expense", "transfer"]),
  category: z.string().trim().min(1).max(40),
  excluded: z.boolean(),
});

const confirmSchema = z.object({
  clientId: z.string().trim().min(1),
  importId: z.string().trim().min(1),
  transactions: z.array(reviewedTransactionSchema).max(2000),
  acceptedKeys: z.array(z.string().trim().min(1)).max(40),
});

function sanitizeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "statement";
  const cleaned = base
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);

  return cleaned || "statement";
}

function fileExtension(fileName: string, kind: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(fileName);
  return match?.[1]?.toLowerCase() || kind;
}

function contentTypeFor(kind: "csv" | "xlsx" | "pdf", fileType: string): string {
  if (fileType) {
    return fileType;
  }

  if (kind === "csv") {
    return "text/csv";
  }

  if (kind === "pdf") {
    return "application/pdf";
  }

  return "application/vnd.ms-excel";
}

function isIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function reviewTransactions(
  stored: StatementTransaction[],
  reviewed: z.infer<typeof reviewedTransactionSchema>[],
  clientId: string,
  currency: string,
  prior: Set<string>,
): { ok: true; transactions: StatementTransaction[] } | { ok: false; message: string } {
  if (reviewed.length !== stored.length) {
    return { ok: false, message: "The review no longer matches this import." };
  }

  const storedById = new Map(stored.map((transaction) => [transaction.id, transaction]));
  const seen = new Set<string>();
  const next: StatementTransaction[] = [];

  for (const row of reviewed) {
    if (seen.has(row.id) || !storedById.has(row.id)) {
      return { ok: false, message: "The review no longer matches this import." };
    }

    seen.add(row.id);

    if (!isIsoDate(row.date)) {
      return { ok: false, message: "One of the transaction dates is not valid." };
    }

    const original = storedById.get(row.id);
    if (!original) {
      return { ok: false, message: "The review no longer matches this import." };
    }

    const description = row.description.trim().slice(0, 180);
    const category =
      row.type === "transfer"
        ? "transfer"
        : isKnownCategory(row.type, row.category)
          ? row.category
          : suggestCategory(description, row.type).category;
    const changed =
      description !== original.description ||
      row.type !== original.type ||
      category !== original.category;
    const suggestion = suggestCategory(description, row.type);

    next.push({
      ...original,
      date: row.date,
      description,
      amount: Math.round(row.amount * 100) / 100,
      currency,
      type: row.type,
      category,
      confidence: changed ? suggestion.confidence : original.confidence,
      reference: original.reference,
      duplicate: false,
      excluded: row.excluded || row.amount <= 0,
    });
  }

  return {
    ok: true,
    transactions: withDuplicateFlags(next, clientId, prior, {
      preserveExcluded: true,
    }),
  };
}

function revalidateStatementPaths(importId: string) {
  revalidatePath("/dashboard/cash-flow");
  revalidatePath(`/dashboard/cash-flow/imports/${importId}`);
  revalidatePath("/dashboard/demo/cash-flow");
  revalidatePath(`/dashboard/demo/cash-flow/imports/${importId}`);
  revalidatePath("/dashboard/documents");
}

export async function uploadStatementAction(
  formData: FormData,
): Promise<{ ok: true; importId: string } | { ok: false; message: string }> {
  const clientId = String(formData.get("clientId") ?? "");
  const file = formData.get("file");
  const authorized = await authorizeStatementClient(clientId);

  if (!authorized.ok) {
    return authorized;
  }

  if (!(file instanceof Blob) || file.size === 0) {
    return { ok: false, message: "Choose a statement to upload." };
  }

  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, message: "File exceeds the 15MB limit." };
  }

  const rawName = file instanceof File ? file.name : "statement.csv";
  const fileName = sanitizeFileName(rawName);
  const kind = statementFileKind(fileName, file.type);

  if (!kind) {
    return { ok: false, message: "This file format isn't supported." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = await parseStatementFile(
    buffer,
    kind,
    authorized.actor.currency,
  );

  if (!parsed.ok) {
    return parsed;
  }

  if (
    parsed.statement.detectedCurrency &&
    parsed.statement.detectedCurrency !== authorized.actor.currency
  ) {
    return {
      ok: false,
      message: `This statement is in ${parsed.statement.detectedCurrency}, but your cash flow is in ${authorized.actor.currency}.`,
    };
  }

  const actor = authorized.actor;
  const now = new Date().toISOString();
  const importId = randomUUID();
  const extension = fileExtension(fileName, kind);
  const contentType = contentTypeFor(kind, file.type);
  await saveStatementFile(actor.userId, importId, extension, buffer);

  let documentId: string = randomUUID();
  if (actor.token) {
    const uploaded = await uploadStatementDocument(
      actor.token,
      fileName,
      contentType,
      buffer,
    ).catch(() => null);
    if (uploaded) {
      documentId = uploaded.documentId;
    }
  }

  const period = statementPeriod(parsed.statement.transactions);
  const created = await withStatementLedger(actor.userId, (ledger) => {
    const prior = priorFingerprintSet(ledger.imports, actor.userId);
    const transactions = withDuplicateFlags(
      parsed.statement.transactions.map((transaction) => ({
        ...transaction,
        id: randomUUID(),
        currency: actor.currency,
        duplicate: false,
        excluded: false,
      })),
      actor.userId,
      prior,
    );

    ledger.imports.unshift({
      id: importId,
      clientId: actor.userId,
      documentId,
      fileName,
      fileType: kind,
      fileSize: file.size,
      status: "review_required",
      currency: actor.currency,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      skippedRowCount: parsed.statement.skippedRowCount,
      errorMessage: null,
      transactions,
      createdAt: now,
      updatedAt: now,
      confirmedAt: null,
    });

    return importId;
  });

  revalidateStatementPaths(created);
  return { ok: true, importId };
}

export async function confirmStatementImportAction(input: {
  clientId: string;
  importId: string;
  transactions: Array<{
    id: string;
    date: string;
    description: string;
    amount: number;
    type: "income" | "expense" | "transfer";
    category: string;
    excluded: boolean;
  }>;
  acceptedKeys: string[];
}): Promise<
  | {
      ok: true;
      importedCount: number;
      monthCount: number;
      appliedCount: number;
    }
  | { ok: false; message: string }
> {
  const parsed = confirmSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: "Review the transactions and try again." };
  }

  const { clientId, importId, transactions, acceptedKeys } = parsed.data;
  const authorized = await authorizeStatementClient(clientId);

  if (!authorized.ok) {
    return authorized;
  }

  const actor = authorized.actor;
  const ledger = await readStatementLedger(actor.userId);
  const statementImport = ledger.imports.find(
    (item) => item.id === importId && item.clientId === actor.userId,
  );

  if (!statementImport) {
    return { ok: false, message: "That import could not be found." };
  }

  if (statementImport.status === "confirmed") {
    return { ok: false, message: "This statement is already confirmed." };
  }

  if (statementImport.status !== "review_required") {
    return { ok: false, message: "This statement is not ready to confirm." };
  }

  const prior = priorFingerprintSet(ledger.imports, actor.userId, importId);
  const reviewed = reviewTransactions(
    statementImport.transactions,
    transactions,
    actor.userId,
    actor.currency,
    prior,
  );

  if (!reviewed.ok) {
    return reviewed;
  }

  const importedCount = reviewed.transactions.filter(
    (transaction) => !transaction.excluded,
  ).length;

  if (importedCount === 0) {
    return { ok: false, message: "Choose at least one transaction to import." };
  }

  const suggestions = buildCategorySuggestions(reviewed.transactions);
  const accepted = acceptedKeys.filter((key) =>
    suggestions.some((suggestion) => suggestion.key === key),
  );
  const period = statementPeriod(reviewed.transactions);
  const startDate = period.periodStart ?? new Date().toISOString().slice(0, 10);
  const history = statementHistoryPoints(reviewed.transactions);

  if (actor.token && accepted.length > 0) {
    try {
      const profile = await loadStatementProfile(actor.token);
      const nextProfile = {
        incomeRows: profile.incomeRows.map((row) => ({ ...row })),
        expenseCategories: profile.expenseCategories.map((row) => ({ ...row })),
      };
      applyCategorySuggestions(nextProfile, suggestions, accepted, startDate);
      await saveStatementProfile(
        actor.token,
        actor.currency,
        profile,
        nextProfile,
      );
    } catch {
      return {
        ok: false,
        message: "Couldn't update your income and expenses. Try again.",
      };
    }
  }

  const saved = await withStatementLedger(actor.userId, (current) => {
    const target = current.imports.find(
      (item) => item.id === importId && item.clientId === actor.userId,
    );

    if (!target || target.status !== "review_required") {
      return { ok: false as const, message: "This statement is not ready to confirm." };
    }

    const now = new Date().toISOString();
    target.transactions = reviewed.transactions;
    target.status = "confirmed";
    target.periodStart = period.periodStart;
    target.periodEnd = period.periodEnd;
    target.updatedAt = now;
    target.confirmedAt = now;
    target.errorMessage = null;
    current.contributions = mergeStatementHistory(current.contributions, history);

    return {
      ok: true as const,
      importedCount,
      monthCount: history.length,
      appliedCount: accepted.length,
    };
  });

  if (!saved.ok) {
    return saved;
  }

  revalidateStatementPaths(importId);
  return saved;
}

export async function loadStatementContributionsAction(
  clientId: string,
): Promise<
  Array<{
    month: string;
    income: number;
    expenses: number;
    surplus: number;
    source?: "statement" | "plan";
    statementIncome?: number;
    statementExpenses?: number;
  }>
> {
  const authorized = await authorizeStatementClient(clientId);
  if (!authorized.ok) {
    return [];
  }

  const ledger = await readStatementLedger(authorized.actor.userId);
  return ledger.contributions;
}
