import {
  isKnownCategory,
  suggestCategory,
} from "@/lib/statements/categories";
import {
  currencyFromText,
  isBalanceRow,
  majorityCurrency,
  parseAmount,
  parseDate,
  statementColumnRole,
  typeFromHint,
  type ParseStatementResult,
  type StatementColumnRole,
} from "@/lib/statements/parse";
import type { ParsedTransaction } from "@/lib/statements/types";

const MAX_TRANSACTIONS = 2000;
const DESCRIPTION_LIMIT = 180;
const LINE_Y_TOLERANCE = 2;

const UNREADABLE_PDF =
  "We couldn't read this statement. Please upload a different copy.";
const SCANNED_PDF =
  "This PDF doesn't contain selectable text. Export the statement as CSV or Excel, or upload a text-based PDF.";
const NO_COLUMNS =
  "We couldn't identify transaction columns in this PDF.";
const NO_TRANSACTIONS =
  "We couldn't identify any transactions in this document.";
const TOO_MANY_ROWS = "This statement has too many rows to import at once.";

type PdfTextItem = {
  str: string;
  transform: number[];
};

type PdfDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<{
    getTextContent: () => Promise<{ items: unknown[] }>;
  }>;
  cleanup: () => void;
};

type PdfLoadingTask = {
  promise: Promise<PdfDocument>;
  destroy: () => Promise<void> | void;
};

type PdfToken = {
  text: string;
  x: number;
  y: number;
};

type PdfLine = {
  y: number;
  tokens: Array<{ text: string; x: number }>;
};

type Anchor = {
  role: StatementColumnRole;
  x: number;
};

type ColumnBound = {
  role: StatementColumnRole;
  start: number;
};

type AmountHint = "credit" | "debit" | null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isTextItem(item: unknown): item is PdfTextItem {
  if (!isRecord(item)) {
    return false;
  }

  return typeof item.str === "string" && Array.isArray(item.transform);
}

function clip(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, DESCRIPTION_LIMIT);
}

function isPageFurniture(text: string): boolean {
  return /^(page\s+\d+(\s+of\s+\d+)?|\d+\s+of\s+\d+)$/i.test(text.trim());
}

function groupLines(items: PdfToken[]): PdfLine[] {
  const sorted = [...items].sort((left, right) => right.y - left.y || left.x - right.x);
  const lines: PdfLine[] = [];

  for (const item of sorted) {
    const current = lines.at(-1);
    if (current && Math.abs(current.y - item.y) <= LINE_Y_TOLERANCE) {
      current.tokens.push({ text: item.text, x: item.x });
      continue;
    }

    lines.push({
      y: item.y,
      tokens: [{ text: item.text, x: item.x }],
    });
  }

  for (const line of lines) {
    line.tokens.sort((left, right) => left.x - right.x);
  }

  return lines;
}

function headerAnchors(line: PdfLine): Anchor[] | null {
  if (line.tokens.length < 2) {
    return null;
  }

  const anchors: Anchor[] = [];

  for (let index = 0; index < line.tokens.length; index += 1) {
    const token = line.tokens[index];
    const next = line.tokens[index + 1];
    const pair = next ? statementColumnRole(`${token.text} ${next.text}`) : null;
    const single = statementColumnRole(token.text);

    if (pair && !single) {
      anchors.push({ role: pair, x: token.x });
      index += 1;
      continue;
    }

    if (!single) {
      return null;
    }

    anchors.push({ role: single, x: token.x });
  }

  const roles = new Set(anchors.map((anchor) => anchor.role));
  if (!roles.has("date")) {
    return null;
  }

  if (!roles.has("debit") && !roles.has("credit") && !roles.has("amount")) {
    return null;
  }

  return anchors;
}

function columnBounds(anchors: Anchor[]): ColumnBound[] {
  const sorted = [...anchors].sort((left, right) => left.x - right.x);
  return sorted.map((anchor, index) => {
    const previous = sorted[index - 1];
    return {
      role: anchor.role,
      start: previous ? (previous.x + anchor.x) / 2 : Number.NEGATIVE_INFINITY,
    };
  });
}

function roleAt(bounds: ColumnBound[], x: number): StatementColumnRole | null {
  let role: StatementColumnRole | null = null;

  for (const bound of bounds) {
    if (x >= bound.start) {
      role = bound.role;
    }
  }

  return role;
}

function columnGroups(line: PdfLine, bounds: ColumnBound[]): Map<StatementColumnRole, string> {
  const groups = new Map<StatementColumnRole, string[]>();

  for (const token of line.tokens) {
    const role = roleAt(bounds, token.x);
    if (!role) {
      continue;
    }

    const parts = groups.get(role) ?? [];
    parts.push(token.text);
    groups.set(role, parts);
  }

  const text = new Map<StatementColumnRole, string>();
  for (const [role, parts] of groups) {
    text.set(role, parts.join(" ").replace(/\s+/g, " ").trim());
  }

  return text;
}

function lineText(line: PdfLine): string {
  return line.tokens
    .map((token) => token.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function classifyTransaction(
  description: string,
  hint: AmountHint,
  typeCell: string,
): Pick<ParsedTransaction, "type" | "category" | "confidence"> {
  const type = typeFromHint(description, hint, typeCell);
  const suggestion = suggestCategory(description, type);

  return {
    type,
    category: isKnownCategory(type, suggestion.category) ? suggestion.category : "other",
    confidence: suggestion.confidence,
  };
}

function buildTransaction(input: {
  date: string;
  description: string;
  amount: number;
  hint: AmountHint;
  typeCell: string;
  reference: string | null;
  fallbackCurrency: string;
  detectedCurrencies: string[];
  amountText: string;
  currencyText: string;
}): ParsedTransaction {
  const description = clip(input.description) || "Transaction";
  const classification = classifyTransaction(description, input.hint, input.typeCell);
  const detected =
    currencyFromText(input.currencyText) ?? currencyFromText(input.amountText);

  if (detected) {
    input.detectedCurrencies.push(detected);
  }

  return {
    date: input.date,
    description,
    amount: Math.round(input.amount * 100) / 100,
    currency: input.fallbackCurrency,
    type: classification.type,
    category: classification.category,
    confidence: classification.confidence,
    reference: input.reference ? clip(input.reference) : null,
  };
}

function hasColumnAmount(groups: Map<StatementColumnRole, string>): boolean {
  return Boolean(
    parseAmount(groups.get("debit") ?? "") ||
      parseAmount(groups.get("credit") ?? "") ||
      parseAmount(groups.get("amount") ?? ""),
  );
}

function movementFromColumns(groups: Map<StatementColumnRole, string>): {
  amount: number;
  hint: AmountHint;
  amountText: string;
} | null {
  const debit = parseAmount(groups.get("debit") ?? "");
  const credit = parseAmount(groups.get("credit") ?? "");
  const amount = parseAmount(groups.get("amount") ?? "");

  if (debit && credit) {
    return null;
  }

  if (debit) {
    return { amount: debit.amount, hint: "debit", amountText: groups.get("debit") ?? "" };
  }

  if (credit) {
    return { amount: credit.amount, hint: "credit", amountText: groups.get("credit") ?? "" };
  }

  if (amount) {
    return { amount: amount.amount, hint: amount.hint, amountText: groups.get("amount") ?? "" };
  }

  return null;
}

type ColumnRead = {
  foundColumns: boolean;
  transactions: ParsedTransaction[];
  skippedRowCount: number;
  detectedCurrencies: string[];
  tooMany: boolean;
};

function readColumnStatement(
  pages: PdfLine[][],
  fallbackCurrency: string,
): ColumnRead {
  const transactions: ParsedTransaction[] = [];
  const detectedCurrencies: string[] = [];
  let skippedRowCount = 0;
  let bounds: ColumnBound[] | null = null;
  let current: ParsedTransaction | null = null;
  let currentHint: AmountHint = null;

  for (const page of pages) {
    for (const line of page) {
      const anchors = headerAnchors(line);
      if (anchors) {
        bounds = columnBounds(anchors);
        continue;
      }

      if (!bounds) {
        continue;
      }

      const plain = lineText(line);
      if (!plain || isPageFurniture(plain)) {
        continue;
      }

      if (transactions.length >= MAX_TRANSACTIONS) {
        return {
          foundColumns: true,
          transactions,
          skippedRowCount,
          detectedCurrencies,
          tooMany: true,
        };
      }

      const groups = columnGroups(line, bounds);
      const date = parseDate(groups.get("date") ?? "");
      const description = groups.get("description") ?? "";
      const reference = groups.get("reference") ?? "";

      if (isBalanceRow(plain) || isBalanceRow(description)) {
        skippedRowCount += 1;
        current = null;
        currentHint = null;
        continue;
      }

      if (!date) {
        if (!hasColumnAmount(groups) && current) {
          if (description) {
            current.description = clip(`${current.description} ${description}`);
            const classification = classifyTransaction(current.description, currentHint, "");
            current.type = classification.type;
            current.category = classification.category;
            current.confidence = classification.confidence;
          }
          if (reference) {
            current.reference = clip(
              current.reference ? `${current.reference} ${reference}` : reference,
            );
          }
        }
        continue;
      }

      const debit = parseAmount(groups.get("debit") ?? "");
      const credit = parseAmount(groups.get("credit") ?? "");
      if (debit && credit) {
        skippedRowCount += 1;
        current = null;
        currentHint = null;
        continue;
      }

      const movement = movementFromColumns(groups);
      if (!movement || movement.amount <= 0) {
        skippedRowCount += 1;
        current = null;
        currentHint = null;
        continue;
      }

      currentHint = movement.hint;
      current = buildTransaction({
        date,
        description,
        amount: movement.amount,
        hint: movement.hint,
        typeCell: groups.get("type") ?? "",
        reference: reference || null,
        fallbackCurrency,
        detectedCurrencies,
        amountText: movement.amountText,
        currencyText: groups.get("currency") ?? "",
      });
      transactions.push(current);
    }
  }

  return {
    foundColumns: bounds !== null,
    transactions,
    skippedRowCount,
    detectedCurrencies,
    tooMany: false,
  };
}

function readLooseStatement(
  pages: PdfLine[][],
  fallbackCurrency: string,
): ColumnRead {
  const transactions: ParsedTransaction[] = [];
  const detectedCurrencies: string[] = [];
  let skippedRowCount = 0;
  let current: ParsedTransaction | null = null;
  let currentHint: AmountHint = null;
  let previousBalance: number | null = null;

  for (const page of pages) {
    for (const line of page) {
      const plain = lineText(line);
      if (!plain || isPageFurniture(plain) || headerAnchors(line)) {
        continue;
      }

      if (transactions.length >= MAX_TRANSACTIONS) {
        return {
          foundColumns: false,
          transactions,
          skippedRowCount,
          detectedCurrencies,
          tooMany: true,
        };
      }

      const dateToken = line.tokens.find((token) => parseDate(token.text));
      if (!dateToken) {
        if (isBalanceRow(plain)) {
          current = null;
          currentHint = null;
          const opening = line.tokens
            .map((token) => parseAmount(token.text))
            .find((amount) => amount !== null);
          if (opening && /opening/i.test(plain)) {
            previousBalance = opening.amount;
          }
          continue;
        }

        if (current && line.tokens.every((token) => parseAmount(token.text) === null)) {
          current.description = clip(`${current.description} ${plain}`);
          const classification = classifyTransaction(current.description, currentHint, "");
          current.type = classification.type;
          current.category = classification.category;
          current.confidence = classification.confidence;
        }
        continue;
      }

      const date = parseDate(dateToken.text);
      if (!date) {
        continue;
      }

      const rest = line.tokens.filter((token) => token !== dateToken);
      const amountTokens = rest.filter((token) => parseAmount(token.text) !== null);
      const description =
        rest
          .filter((token) => parseAmount(token.text) === null)
          .map((token) => token.text)
          .join(" ") || "Transaction";

      if (isBalanceRow(description) || isBalanceRow(plain)) {
        skippedRowCount += 1;
        current = null;
        currentHint = null;
        const balance = amountTokens.at(-1);
        const parsedBalance = balance ? parseAmount(balance.text) : null;
        if (parsedBalance) {
          previousBalance = parsedBalance.amount;
        }
        continue;
      }

      if (amountTokens.length === 0) {
        skippedRowCount += 1;
        current = null;
        currentHint = null;
        continue;
      }

      const balanceToken = amountTokens.length >= 2 ? amountTokens.at(-1) : null;
      const movementToken =
        amountTokens.length >= 2 ? amountTokens.at(-2) : amountTokens[0];
      const movement = movementToken ? parseAmount(movementToken.text) : null;
      const balance = balanceToken ? parseAmount(balanceToken.text) : null;

      if (!movement || movement.amount <= 0) {
        skippedRowCount += 1;
        current = null;
        currentHint = null;
        continue;
      }

      let hint = movement.hint;
      if (balance && previousBalance !== null) {
        const delta = Math.round((balance.amount - previousBalance) * 100) / 100;
        hint = delta < 0 ? "debit" : "credit";
      }

      if (balance) {
        previousBalance = balance.amount;
      }

      currentHint = hint;
      current = buildTransaction({
        date,
        description,
        amount: movement.amount,
        hint,
        typeCell: "",
        reference: null,
        fallbackCurrency,
        detectedCurrencies,
        amountText: movementToken?.text ?? "",
        currencyText: "",
      });
      transactions.push(current);
    }
  }

  return {
    foundColumns: false,
    transactions,
    skippedRowCount,
    detectedCurrencies,
    tooMany: false,
  };
}

function statementResult(
  read: ColumnRead,
  emptyMessage: string,
): ParseStatementResult {
  if (read.tooMany) {
    return { ok: false, message: TOO_MANY_ROWS };
  }

  if (read.transactions.length === 0) {
    return { ok: false, message: emptyMessage };
  }

  return {
    ok: true,
    statement: {
      transactions: read.transactions,
      skippedRowCount: read.skippedRowCount,
      detectedCurrency: majorityCurrency(read.detectedCurrencies),
    },
  };
}

async function openPdf(buffer: Buffer): Promise<{
  document: PdfDocument;
  close: () => Promise<void>;
}> {
  const pdfjs = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as {
    getDocument: (params: { data: Uint8Array; verbosity: number }) => PdfLoadingTask;
  };
  const task = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    verbosity: 0,
  });
  const document = await task.promise;

  return {
    document,
    close: async () => {
      document.cleanup();
      await task.destroy();
    },
  };
}

export async function parsePdfStatement(
  buffer: Buffer,
  fallbackCurrency: string,
): Promise<ParseStatementResult> {
  let opened: { document: PdfDocument; close: () => Promise<void> };

  try {
    opened = await openPdf(buffer);
  } catch {
    return { ok: false, message: UNREADABLE_PDF };
  }

  const document = opened.document;

  try {
    const pages: PdfLine[][] = [];
    let textItems = 0;

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const items: PdfToken[] = [];

      for (const item of content.items) {
        if (!isTextItem(item)) {
          continue;
        }

        const text = item.str.replace(/\s+/g, " ").trim();
        const x = item.transform[4];
        const y = item.transform[5];
        if (!text || typeof x !== "number" || typeof y !== "number") {
          continue;
        }

        textItems += 1;
        items.push({ text, x, y });
      }

      pages.push(groupLines(items));
    }

    if (textItems === 0) {
      return { ok: false, message: SCANNED_PDF };
    }

    const columns = readColumnStatement(pages, fallbackCurrency);
    if (columns.foundColumns) {
      return statementResult(columns, NO_TRANSACTIONS);
    }

    return statementResult(readLooseStatement(pages, fallbackCurrency), NO_COLUMNS);
  } catch {
    return { ok: false, message: UNREADABLE_PDF };
  } finally {
    await opened.close();
  }
}
