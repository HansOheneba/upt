export function normalizeStatementDescription(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function transactionFingerprint(input: {
  clientId: string;
  date: string;
  amount: number;
  currency: string;
  description: string;
}): string {
  const raw = [
    input.clientId,
    input.date,
    input.amount.toFixed(2),
    input.currency.toUpperCase(),
    normalizeStatementDescription(input.description),
  ].join("|");

  let hash = 5381;

  for (let index = 0; index < raw.length; index += 1) {
    hash = Math.imul(hash, 33) ^ raw.charCodeAt(index);
  }

  return (hash >>> 0).toString(16);
}

export function priorFingerprintSet(
  imports: Array<{
    id: string;
    status: string;
    transactions: Array<{
      date: string;
      amount: number;
      currency: string;
      description: string;
      excluded: boolean;
    }>;
  }>,
  clientId: string,
  ignoreImportId?: string,
): Set<string> {
  const fingerprints = new Set<string>();

  for (const statementImport of imports) {
    if (statementImport.id === ignoreImportId) {
      continue;
    }

    if (
      statementImport.status !== "confirmed" &&
      statementImport.status !== "review_required"
    ) {
      continue;
    }

    for (const transaction of statementImport.transactions) {
      if (transaction.excluded) {
        continue;
      }

      fingerprints.add(
        transactionFingerprint({
          clientId,
          date: transaction.date,
          amount: transaction.amount,
          currency: transaction.currency,
          description: transaction.description,
        }),
      );
    }
  }

  return fingerprints;
}

export function withDuplicateFlags<
  T extends {
    date: string;
    amount: number;
    currency: string;
    description: string;
    duplicate: boolean;
    excluded: boolean;
  },
>(
  transactions: T[],
  clientId: string,
  prior: Set<string>,
  options?: { preserveExcluded?: boolean },
): T[] {
  const seen = new Set(prior);

  return transactions.map((transaction) => {
    const fingerprint = transactionFingerprint({
      clientId,
      date: transaction.date,
      amount: transaction.amount,
      currency: transaction.currency,
      description: transaction.description,
    });
    const duplicate = seen.has(fingerprint);
    seen.add(fingerprint);

    return {
      ...transaction,
      duplicate,
      excluded: options?.preserveExcluded
        ? transaction.excluded
        : duplicate || transaction.excluded,
    };
  });
}
