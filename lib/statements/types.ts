export type StatementImportStatus =
  | "uploaded"
  | "processing"
  | "review_required"
  | "confirmed"
  | "failed";

export type StatementTransactionType = "income" | "expense" | "transfer";

export type StatementTransaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  type: StatementTransactionType;
  category: string;
  confidence: number;
  reference: string | null;
  duplicate: boolean;
  excluded: boolean;
};

export type StatementImport = {
  id: string;
  clientId: string;
  documentId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  status: StatementImportStatus;
  currency: string;
  periodStart: string | null;
  periodEnd: string | null;
  skippedRowCount: number;
  errorMessage: string | null;
  transactions: StatementTransaction[];
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
};

export type ParsedTransaction = Omit<
  StatementTransaction,
  "id" | "duplicate" | "excluded"
>;

export type ParsedStatement = {
  transactions: ParsedTransaction[];
  skippedRowCount: number;
  detectedCurrency: string | null;
};

export type StatementHistoryPoint = {
  month: string;
  income: number;
  expenses: number;
  surplus: number;
  /**
   * "statement" means income and expenses are only the imported statement.
   * The chart adds that on top of planned cash flow for the month.
   * Planned months keep their own totals and store the import in
   * statementIncome and statementExpenses.
   */
  source?: "statement" | "plan";
  statementIncome?: number;
  statementExpenses?: number;
};

export type CategorySuggestion = {
  key: string;
  type: "income" | "expense";
  category: string;
  label: string;
  monthlyAverage: number;
  transactionCount: number;
};
