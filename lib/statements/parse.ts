import "server-only";

import * as XLSX from "xlsx";

import {
  isKnownCategory,
  isTransferDescription,
  suggestCategory,
} from "@/lib/statements/categories";
import type {
  ParsedStatement,
  ParsedTransaction,
  StatementTransactionType,
} from "@/lib/statements/types";

const MAX_TRANSACTIONS = 2000;

const DATE_HEADERS = new Set([
  "date",
  "transaction date",
  "posted date",
  "posting date",
  "value date",
  "txn date",
  "trans date",
]);

const DESCRIPTION_HEADERS = new Set([
  "description",
  "narrative",
  "details",
  "memo",
  "particulars",
  "remarks",
  "remark",
  "transaction details",
  "narration",
  "transaction description",
]);

const AMOUNT_HEADERS = new Set([
  "amount",
  "value",
  "transaction amount",
  "amt",
]);

const DEBIT_HEADERS = new Set([
  "debit",
  "debits",
  "withdrawal",
  "withdrawals",
  "money out",
  "dr",
  "paid out",
]);

const CREDIT_HEADERS = new Set([
  "credit",
  "credits",
  "deposit",
  "deposits",
  "money in",
  "cr",
  "paid in",
]);

const TYPE_HEADERS = new Set(["type", "transaction type", "dr cr", "dr/cr"]);

const REFERENCE_HEADERS = new Set([
  "reference",
  "ref",
  "cheque",
  "check",
  "transaction id",
  "txn id",
]);

const CURRENCY_HEADERS = new Set(["currency", "ccy", "curr"]);

const BALANCE_HEADERS = new Set([
  "balance",
  "running balance",
  "available balance",
  "book balance",
  "ledger balance",
]);

export type StatementColumnRole =
  | "date"
  | "description"
  | "amount"
  | "debit"
  | "credit"
  | "type"
  | "reference"
  | "currency"
  | "balance";

const KNOWN_CURRENCIES = new Set([
  "GHS",
  "USD",
  "GBP",
  "EUR",
  "NGN",
  "KES",
  "ZAR",
  "CAD",
  "AED",
]);

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

type ColumnMap = {
  date: number;
  description: number | null;
  amount: number | null;
  debit: number | null;
  credit: number | null;
  type: number | null;
  reference: number | null;
  currency: number | null;
};

type Cell = string | number | boolean | Date | null | undefined;

export type ParseStatementResult =
  | { ok: true; statement: ParsedStatement }
  | { ok: false; message: string };

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function normalizeHeader(value: string): string {
  return value
    .toLowerCase()
    .replace(/[_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cellText(value: Cell): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function isRealIsoDate(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${year}-${pad(month)}-${pad(day)}`;
}

export function statementColumnRole(label: string): StatementColumnRole | null {
  const header = normalizeHeader(label);
  if (!header) {
    return null;
  }
  if (DATE_HEADERS.has(header)) {
    return "date";
  }
  if (DESCRIPTION_HEADERS.has(header)) {
    return "description";
  }
  if (AMOUNT_HEADERS.has(header)) {
    return "amount";
  }
  if (DEBIT_HEADERS.has(header)) {
    return "debit";
  }
  if (CREDIT_HEADERS.has(header)) {
    return "credit";
  }
  if (TYPE_HEADERS.has(header)) {
    return "type";
  }
  if (REFERENCE_HEADERS.has(header)) {
    return "reference";
  }
  if (CURRENCY_HEADERS.has(header)) {
    return "currency";
  }
  if (BALANCE_HEADERS.has(header)) {
    return "balance";
  }
  return null;
}

export function parseDate(value: Cell): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const shifted = new Date(value.getTime() + 12 * 60 * 60 * 1000);
    return isRealIsoDate(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth() + 1,
      shifted.getUTCDate(),
    );
  }

  if (typeof value === "number" && value > 20_000 && value < 80_000) {
    const parseDateCode = XLSX.SSF?.parse_date_code as
      | ((serial: number) => { y: number; m: number; d: number } | null)
      | undefined;
    const parsed = parseDateCode?.(Math.round(value));
    if (!parsed) {
      return null;
    }
    return isRealIsoDate(parsed.y, parsed.m, parsed.d);
  }

  const text = cellText(value);
  if (!text) {
    return null;
  }

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (iso) {
    return isRealIsoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  const named = /^(\d{1,2})[\s\-/]([A-Za-z]{3,9})[\s\-/](\d{2,4})$/.exec(text);
  if (named) {
    const month = MONTHS[named[2].toLowerCase()];
    let year = Number(named[3]);
    if (year < 100) {
      year += 2000;
    }
    if (!month) {
      return null;
    }
    return isRealIsoDate(year, month, Number(named[1]));
  }

  const numeric = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/.exec(text);
  if (!numeric) {
    return null;
  }

  const first = Number(numeric[1]);
  const second = Number(numeric[2]);
  let year = Number(numeric[3]);
  if (year < 100) {
    year += 2000;
  }

  let day = first;
  let month = second;

  if (first > 12 && second <= 12) {
    day = first;
    month = second;
  } else if (second > 12 && first <= 12) {
    day = second;
    month = first;
  }

  return isRealIsoDate(year, month, day);
}

export function currencyFromText(value: string): string | null {
  const upper = value.toUpperCase();
  if (upper.includes("GHS") || value.includes("₵")) {
    return "GHS";
  }
  if (upper.includes("GBP") || value.includes("£")) {
    return "GBP";
  }
  if (upper.includes("USD") || value.includes("$")) {
    return "USD";
  }
  if (upper.includes("EUR") || value.includes("€")) {
    return "EUR";
  }
  if (upper.includes("NGN")) {
    return "NGN";
  }
  if (upper.includes("KES")) {
    return "KES";
  }
  if (upper.includes("ZAR")) {
    return "ZAR";
  }
  if (upper.includes("CAD")) {
    return "CAD";
  }
  if (upper.includes("AED")) {
    return "AED";
  }

  const code = /^[A-Z]{3}$/.exec(upper.trim());
  return code && KNOWN_CURRENCIES.has(code[0]) ? code[0] : null;
}

export function parseAmount(value: Cell): {
  amount: number;
  hint: "credit" | "debit" | null;
} | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value === 0) {
      return null;
    }
    return {
      amount: Math.abs(value),
      hint: value < 0 ? "debit" : "credit",
    };
  }

  const text = cellText(value);
  if (!text || text === "-" || text === "—") {
    return null;
  }

  const upper = text.toUpperCase();
  let hint: "credit" | "debit" | null = null;
  if (/\bCR\b/.test(upper)) {
    hint = "credit";
  } else if (/\bDR\b/.test(upper)) {
    hint = "debit";
  }

  const negative = /^\(.*\)$/.test(text) || text.trim().startsWith("-");
  const cleaned = text.replace(/[(),]/g, "").replace(/[^\d.-]/g, "");
  const parsed = Number(cleaned);

  if (!Number.isFinite(parsed) || parsed === 0) {
    return null;
  }

  return {
    amount: Math.abs(parsed),
    hint: hint ?? (negative || parsed < 0 ? "debit" : "credit"),
  };
}

function headerIndex(headers: string[], aliases: Set<string>): number | null {
  const index = headers.findIndex((header) => aliases.has(header));
  return index >= 0 ? index : null;
}

function findColumns(matrix: Cell[][]): { headerIndex: number; columns: ColumnMap } | null {
  const limit = Math.min(matrix.length, 25);

  for (let index = 0; index < limit; index += 1) {
    const headers = (matrix[index] ?? []).map((cell) =>
      normalizeHeader(cellText(cell)),
    );
    const date = headerIndex(headers, DATE_HEADERS);
    const amount = headerIndex(headers, AMOUNT_HEADERS);
    const debit = headerIndex(headers, DEBIT_HEADERS);
    const credit = headerIndex(headers, CREDIT_HEADERS);

    if (date === null || (amount === null && debit === null && credit === null)) {
      continue;
    }

    return {
      headerIndex: index,
      columns: {
        date,
        description: headerIndex(headers, DESCRIPTION_HEADERS),
        amount,
        debit,
        credit,
        type: headerIndex(headers, TYPE_HEADERS),
        reference: headerIndex(headers, REFERENCE_HEADERS),
        currency: headerIndex(headers, CURRENCY_HEADERS),
      },
    };
  }

  return null;
}

export function typeFromHint(
  description: string,
  hint: "credit" | "debit" | null,
  typeCell: string,
): StatementTransactionType {
  if (isTransferDescription(description) || /\btransfer\b/i.test(typeCell)) {
    return "transfer";
  }

  const normalized = typeCell.toLowerCase();
  if (/\b(debit|dr|withdrawal|expense)\b/.test(normalized)) {
    return "expense";
  }
  if (/\b(credit|cr|deposit|income)\b/.test(normalized)) {
    return "income";
  }

  return hint === "debit" ? "expense" : "income";
}

export function isBalanceRow(description: string): boolean {
  return /\b(opening balance|closing balance|balance brought forward|balance carried forward|total)\b/i.test(
    description,
  );
}

function sheetMatrix(sheet: XLSX.WorkSheet): Cell[][] {
  return XLSX.utils.sheet_to_json<Cell[]>(sheet, {
    header: 1,
    defval: "",
    raw: true,
    blankrows: false,
  });
}

function readMatrix(buffer: Buffer, kind: "csv" | "xlsx"): Cell[][] | null {
  const workbook =
    kind === "csv"
      ? XLSX.read(buffer.toString("utf8").replace(/^\uFEFF/, ""), {
          type: "string",
          raw: true,
        })
      : XLSX.read(buffer, { type: "buffer", cellDates: true });

  const preferredName = workbook.SheetNames.find((name) =>
    /transaction|statement|history/i.test(name),
  );
  const names = preferredName
    ? [preferredName, ...workbook.SheetNames.filter((name) => name !== preferredName)]
    : workbook.SheetNames;

  let best: Cell[][] | null = null;
  let bestScore = 0;

  for (const name of names) {
    const sheet = workbook.Sheets[name];
    if (!sheet) {
      continue;
    }

    const matrix = sheetMatrix(sheet);
    const columns = findColumns(matrix);
    if (!columns) {
      continue;
    }

    const score = matrix.length - columns.headerIndex;
    if (name === preferredName) {
      return matrix;
    }

    if (score > bestScore) {
      best = matrix;
      bestScore = score;
    }
  }

  return best;
}

export function majorityCurrency(currencies: string[]): string | null {
  if (currencies.length === 0) {
    return null;
  }

  const counts = new Map<string, number>();
  for (const currency of currencies) {
    counts.set(currency, (counts.get(currency) ?? 0) + 1);
  }

  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
}

export async function parseStatementFile(
  buffer: Buffer,
  kind: "csv" | "xlsx" | "pdf",
  fallbackCurrency: string,
): Promise<ParseStatementResult> {
  if (kind === "pdf") {
    const { parsePdfStatement } = await import("@/lib/statements/parse-pdf");
    return parsePdfStatement(buffer, fallbackCurrency);
  }

  let matrix: Cell[][] | null;

  try {
    matrix = readMatrix(buffer, kind);
  } catch {
    return {
      ok: false,
      message: "We couldn't read this statement. Please upload a different copy.",
    };
  }

  if (!matrix) {
    return {
      ok: false,
      message: "We couldn't identify columns for date, description, and amount.",
    };
  }

  const located = findColumns(matrix);
  if (!located) {
    return {
      ok: false,
      message: "We couldn't identify columns for date, description, and amount.",
    };
  }

  const transactions: ParsedTransaction[] = [];
  const detectedCurrencies: string[] = [];
  let skippedRowCount = 0;
  const { columns } = located;

  for (const row of matrix.slice(located.headerIndex + 1)) {
    if (transactions.length >= MAX_TRANSACTIONS) {
      return {
        ok: false,
        message: "This statement has too many rows to import at once.",
      };
    }

    const date = parseDate(row[columns.date]);
    const description =
      columns.description === null
        ? "Transaction"
        : cellText(row[columns.description]) || "Transaction";

    if (!date || isBalanceRow(description)) {
      if (row.some((cell) => cellText(cell).length > 0)) {
        skippedRowCount += 1;
      }
      continue;
    }

    const typeCell = columns.type === null ? "" : cellText(row[columns.type]);
    const debit = columns.debit === null ? null : parseAmount(row[columns.debit]);
    const credit = columns.credit === null ? null : parseAmount(row[columns.credit]);
    const amountCell = columns.amount === null ? null : parseAmount(row[columns.amount]);

    let amount = 0;
    let hint: "credit" | "debit" | null = null;

    if (debit && credit) {
      skippedRowCount += 1;
      continue;
    }

    if (debit) {
      amount = debit.amount;
      hint = "debit";
    } else if (credit) {
      amount = credit.amount;
      hint = "credit";
    } else if (amountCell) {
      amount = amountCell.amount;
      hint = amountCell.hint;
    } else {
      skippedRowCount += 1;
      continue;
    }

    if (amount <= 0) {
      skippedRowCount += 1;
      continue;
    }

    const type = typeFromHint(description, hint, typeCell);
    const suggestion = suggestCategory(description, type);
    const category = isKnownCategory(type, suggestion.category)
      ? suggestion.category
      : "other";
    const currencyCell =
      columns.currency === null ? "" : cellText(row[columns.currency]);
    const amountSource =
      columns.amount !== null
        ? cellText(row[columns.amount])
        : cellText(row[(columns.debit ?? columns.credit) as number]);
    const detected =
      currencyFromText(currencyCell) ?? currencyFromText(amountSource);

    if (detected) {
      detectedCurrencies.push(detected);
    }

    const reference =
      columns.reference === null
        ? null
        : cellText(row[columns.reference]) || null;

    transactions.push({
      date,
      description: description.slice(0, 180),
      amount: Math.round(amount * 100) / 100,
      currency: fallbackCurrency,
      type,
      category,
      confidence: suggestion.confidence,
      reference,
    });
  }

  if (transactions.length === 0) {
    return {
      ok: false,
      message: "We couldn't identify any transactions in this document.",
    };
  }

  return {
    ok: true,
    statement: {
      transactions,
      skippedRowCount,
      detectedCurrency: majorityCurrency(detectedCurrencies),
    },
  };
}

export function statementFileKind(
  fileName: string,
  contentType: string,
): "csv" | "xlsx" | "pdf" | null {
  const lowerName = fileName.toLowerCase();
  const lowerType = contentType.toLowerCase();

  if (lowerName.endsWith(".pdf") || lowerType.includes("pdf")) {
    return "pdf";
  }

  if (
    lowerName.endsWith(".xlsx") ||
    lowerName.endsWith(".xls") ||
    lowerType.includes("spreadsheet") ||
    lowerType.includes("excel")
  ) {
    return "xlsx";
  }

  if (lowerName.endsWith(".csv") || lowerType.includes("csv")) {
    return "csv";
  }

  return null;
}
