import "server-only";

import { randomUUID } from "crypto";
import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";

import type {
  StatementHistoryPoint,
  StatementImport,
} from "@/lib/statements/types";

type StatementLedger = {
  imports: StatementImport[];
  contributions: StatementHistoryPoint[];
};

const EMPTY_LEDGER: StatementLedger = {
  imports: [],
  contributions: [],
};

const queues = new Map<string, Promise<unknown>>();

function safeUserId(userId: string): string {
  const cleaned = userId.replace(/[^a-zA-Z0-9_-]+/g, "");
  return cleaned || "client";
}

function ledgerDir(userId: string): string {
  return path.join(
    process.cwd(),
    "data",
    "statement-imports",
    safeUserId(userId),
  );
}

function ledgerPath(userId: string): string {
  return path.join(ledgerDir(userId), "ledger.json");
}

export function statementFilePath(
  userId: string,
  importId: string,
  extension: string,
): string {
  const ext = extension.replace(/[^a-z0-9]+/gi, "").toLowerCase() || "bin";
  return path.join(ledgerDir(userId), "files", `${importId}.${ext}`);
}

async function readLedger(userId: string): Promise<StatementLedger> {
  try {
    const raw = await readFile(ledgerPath(userId), "utf8");
    const parsed = JSON.parse(raw) as Partial<StatementLedger>;
    return {
      imports: Array.isArray(parsed.imports) ? parsed.imports : [],
      contributions: Array.isArray(parsed.contributions)
        ? parsed.contributions
        : [],
    };
  } catch {
    return {
      imports: [],
      contributions: [],
    };
  }
}

async function writeLedger(
  userId: string,
  ledger: StatementLedger,
): Promise<void> {
  const directory = ledgerDir(userId);
  await mkdir(directory, { recursive: true });
  const destination = ledgerPath(userId);
  const temporary = path.join(directory, `.ledger-${randomUUID()}.json`);
  await writeFile(temporary, JSON.stringify(ledger), "utf8");
  await rename(temporary, destination);
}

export async function withStatementLedger<T>(
  userId: string,
  update: (ledger: StatementLedger) => Promise<T> | T,
): Promise<T> {
  const previous = queues.get(userId) ?? Promise.resolve();
  const run = previous.catch(() => undefined).then(async () => {
    const ledger = await readLedger(userId);
    const result = await update(ledger);
    await writeLedger(userId, ledger);
    return result;
  });
  queues.set(userId, run);
  return run;
}

export async function readStatementLedger(
  userId: string,
): Promise<StatementLedger> {
  return readLedger(userId);
}

export async function saveStatementFile(
  userId: string,
  importId: string,
  extension: string,
  bytes: Buffer,
): Promise<string> {
  const destination = statementFilePath(userId, importId, extension);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, bytes);
  return destination;
}

export async function readStatementFile(
  userId: string,
  importId: string,
  extension: string,
): Promise<Buffer | null> {
  try {
    return await readFile(statementFilePath(userId, importId, extension));
  } catch {
    return null;
  }
}

export function emptyLedger(): StatementLedger {
  return {
    imports: [...EMPTY_LEDGER.imports],
    contributions: [...EMPTY_LEDGER.contributions],
  };
}
