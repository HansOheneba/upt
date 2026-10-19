"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { confirmStatementImportAction } from "@/app/actions/statement-import";
import { clearPageCache } from "@/hooks/usePageData";
import { isDemoMode, isDemoPath } from "@/lib/demo-mode";
import { useFinancialStore } from "@/store/financialStore";
import { StatementCashFlowImpact } from "@/components/statements/statement-cash-flow-impact";
import { StatementFlowSummary } from "@/components/statements/statement-flow-summary";
import {
  StatementReviewTable,
  type ReviewEdit,
  type TransactionPatch,
} from "@/components/statements/statement-review-table";
import { formatStatementMoney } from "@/components/statements/statement-review-format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dashboardTheme } from "@/lib/dashboard-theme";
import type { DisplayCurrency } from "@/lib/format";
import {
  buildCategorySuggestions,
  statementPeriod,
} from "@/lib/statements/aggregate";
import { applyCategorySuggestions } from "@/lib/statements/apply";
import {
  isKnownCategory,
  suggestCategory,
  categoryLabel,
} from "@/lib/statements/categories";
import { withDuplicateFlags } from "@/lib/statements/fingerprint";
import type {
  StatementTransaction,
  StatementTransactionType,
} from "@/lib/statements/types";
import { cn } from "@/lib/utils";

type StatementImportReviewProps = {
  clientId: string;
  importId: string;
  currency: DisplayCurrency;
  skippedRowCount: number;
  priorFingerprints: string[];
  transactions: StatementTransaction[];
};

type TypeFilter = "all" | StatementTransactionType;
type ConfidenceFilter = "all" | "high" | "medium" | "review";

const PAGE_SIZE = 50;

const filterClassName =
  "h-8 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function useDebounced(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

function transactionCountLabel(count: number): string {
  return `${count} ${count === 1 ? "transaction" : "transactions"}`;
}

export function StatementImportReview({
  clientId,
  importId,
  currency,
  skippedRowCount,
  priorFingerprints,
  transactions: initialTransactions,
}: StatementImportReviewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const cashFlowHref = `${isDemoPath(pathname) ? "/dashboard/demo" : "/dashboard"}/cash-flow`;
  const [transactions, setTransactions] = useState(initialTransactions);
  const [acceptedKeys, setAcceptedKeys] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<ReviewEdit>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>("all");
  const [page, setPage] = useState(0);
  const [pending, startTransition] = useTransition();
  const deferredQuery = useDebounced(query, 200);
  const prior = useMemo(() => new Set(priorFingerprints), [priorFingerprints]);
  const flagged = useMemo(
    () =>
      withDuplicateFlags(transactions, clientId, prior, {
        preserveExcluded: true,
      }),
    [clientId, prior, transactions],
  );
  const suggestions = useMemo(
    () => buildCategorySuggestions(flagged),
    [flagged],
  );
  const included = useMemo(
    () => flagged.filter((transaction) => !transaction.excluded && transaction.amount > 0),
    [flagged],
  );
  const flow = useMemo(() => {
    let inflows = 0;
    let outflows = 0;
    let transferTotal = 0;
    let highConfidence = 0;

    for (const transaction of included) {
      if (transaction.type === "income") {
        inflows += transaction.amount;
      } else if (transaction.type === "expense") {
        outflows += transaction.amount;
      } else {
        transferTotal += transaction.amount;
      }

      if (transaction.confidence >= 0.9) {
        highConfidence += 1;
      }
    }

    return {
      inflows,
      outflows,
      transferTotal,
      highConfidence,
      needsReview: flagged.filter((transaction) => transaction.confidence < 0.7)
        .length,
      duplicates: flagged.filter((transaction) => transaction.duplicate).length,
    };
  }, [flagged, included]);
  const categoryOptions = useMemo(() => {
    const options = new Map<string, string>();

    for (const transaction of flagged) {
      const key = `${transaction.type}:${transaction.category}`;
      const label =
        transaction.type === "transfer"
          ? "Transfer"
          : categoryLabel(transaction.type, transaction.category);
      options.set(key, label);
    }

    const labelCount = new Map<string, number>();
    for (const label of options.values()) {
      labelCount.set(label, (labelCount.get(label) ?? 0) + 1);
    }

    return [...options.entries()]
      .map(([value, label]) => {
        const type = value.slice(0, value.indexOf(":"));
        const shared = (labelCount.get(label) ?? 0) > 1 && type !== "transfer";
        const text = shared
          ? `${label} · ${type === "income" ? "Income" : "Expense"}`
          : label;
        return [value, text] as const;
      })
      .sort((left, right) => left[1].localeCompare(right[1]));
  }, [flagged]);
  const filtered = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();

    return flagged.filter((transaction) => {
      if (typeFilter !== "all" && transaction.type !== typeFilter) {
        return false;
      }

      if (
        categoryFilter !== "all" &&
        `${transaction.type}:${transaction.category}` !== categoryFilter
      ) {
        return false;
      }

      if (confidenceFilter === "high" && transaction.confidence < 0.9) {
        return false;
      }

      if (
        confidenceFilter === "medium" &&
        (transaction.confidence < 0.7 || transaction.confidence >= 0.9)
      ) {
        return false;
      }

      if (confidenceFilter === "review" && transaction.confidence >= 0.7) {
        return false;
      }

      if (!needle) {
        return true;
      }

      const label =
        transaction.type === "transfer"
          ? "transfer"
          : categoryLabel(transaction.type, transaction.category).toLowerCase();

      return (
        transaction.description.toLowerCase().includes(needle) ||
        label.includes(needle) ||
        transaction.type.includes(needle)
      );
    });
  }, [categoryFilter, confidenceFilter, deferredQuery, flagged, typeFilter]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = useMemo(
    () => filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE),
    [filtered, safePage],
  );
  const pageIncluded =
    pageRows.length > 0 && pageRows.every((transaction) => !transaction.excluded);

  useEffect(() => {
    setPage(0);
  }, [deferredQuery, typeFilter, categoryFilter, confidenceFilter]);

  useEffect(() => {
    if (!editing) {
      return;
    }

    if (!pageRows.some((transaction) => transaction.id === editing.id)) {
      setEditing(null);
    }
  }, [editing, pageRows]);

  function updateTransaction(id: string, patch: TransactionPatch) {
    setTransactions((current) =>
      current.map((transaction) => {
        if (transaction.id !== id) {
          return transaction;
        }

        const next = { ...transaction, ...patch };

        if (patch.type && patch.type !== transaction.type) {
          if (patch.type === "transfer") {
            next.category = "transfer";
          } else if (!isKnownCategory(patch.type, next.category)) {
            next.category = suggestCategory(next.description, patch.type).category;
          }
          next.confidence = suggestCategory(next.description, next.type).confidence;
        } else if (patch.category || patch.description) {
          next.confidence = suggestCategory(next.description, next.type).confidence;
        }

        return next;
      }),
    );
  }

  function setIncluded(ids: string[], nextIncluded: boolean) {
    const idSet = new Set(ids);
    setTransactions((current) =>
      current.map((transaction) =>
        idSet.has(transaction.id)
          ? { ...transaction, excluded: !nextIncluded }
          : transaction,
      ),
    );
  }

  function showNeedsReview() {
    setTypeFilter("all");
    setCategoryFilter("all");
    setQuery("");
    setConfidenceFilter("review");
    document
      .getElementById("statement-transactions")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function onConfirm() {
    const includedRows = flagged.filter((transaction) => !transaction.excluded);

    if (
      includedRows.some(
        (transaction) => !/^\d{4}-\d{2}-\d{2}$/.test(transaction.date),
      )
    ) {
      setMessage("One of the transaction dates is not valid.");
      return;
    }

    if (includedRows.some((transaction) => transaction.description.trim().length === 0)) {
      setMessage("Every included transaction needs a description.");
      return;
    }

    setMessage(null);
    startTransition(async () => {
      const result = await confirmStatementImportAction({
        clientId,
        importId,
        acceptedKeys,
        transactions: flagged.map((transaction) => ({
          id: transaction.id,
          date: transaction.date,
          description: transaction.description,
          amount: transaction.amount,
          type: transaction.type,
          category: transaction.category,
          excluded: transaction.excluded || transaction.amount <= 0,
        })),
      });

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      if (isDemoMode()) {
        const store = useFinancialStore.getState();
        const profile = {
          incomeRows: store.incomeRows.map((row) => ({ ...row })),
          expenseCategories: store.expenseCategories.map((row) => ({ ...row })),
        };
        const startDate =
          statementPeriod(flagged).periodStart ??
          new Date().toISOString().slice(0, 10);
        applyCategorySuggestions(profile, suggestions, acceptedKeys, startDate);
        store.setIncome(profile.incomeRows);
        store.setExpenses(profile.expenseCategories);
      } else {
        clearPageCache("cash-flow");
      }

      const applied =
        result.appliedCount > 0
          ? ` ${result.appliedCount} monthly ${result.appliedCount === 1 ? "line" : "lines"} updated.`
          : "";
      toast.success(
        `Imported ${result.importedCount} transactions across ${result.monthCount} ${result.monthCount === 1 ? "month" : "months"}.${applied}`,
      );
      router.push(cashFlowHref);
      router.refresh();
    });
  }

  const confirmLabel =
    included.length === 0
      ? "Confirm transactions"
      : `Confirm ${included.length} ${included.length === 1 ? "transaction" : "transactions"}`;

  return (
    <div className="space-y-8">
      <StatementFlowSummary
        count={included.length}
        inflows={flow.inflows}
        outflows={flow.outflows}
        currency={currency}
        detail={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {flow.highConfidence} high confidence
              <span aria-hidden="true"> · </span>
              {flow.needsReview}{" "}
              {flow.needsReview === 1 ? "needs review" : "need review"}
              <span aria-hidden="true"> · </span>
              {flow.duplicates}{" "}
              {flow.duplicates === 1 ? "duplicate" : "duplicates"}
            </p>
            {flow.needsReview > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={showNeedsReview}
              >
                Review {flow.needsReview}
              </Button>
            ) : null}
          </div>
        }
      />

      {skippedRowCount > 0 ? (
        <p className="text-sm text-muted-foreground">
          {skippedRowCount}{" "}
          {skippedRowCount === 1 ? "row was" : "rows were"} skipped because they
          were blank, a balance line, or missing a date or amount.
        </p>
      ) : null}

      <section id="statement-transactions" className="scroll-mt-20 space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <h2 className={dashboardTheme.sectionTitle}>Transactions</h2>
            <p className="text-xs text-muted-foreground">
              {included.length} of {flagged.length} selected
              {filtered.length !== flagged.length
                ? ` · Showing ${filtered.length}`
                : ""}
              . Select a value to correct it.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative min-w-0 sm:w-56">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search transactions"
                aria-label="Search transactions"
                className="h-8 pl-8"
              />
            </div>
            <select
              className={cn(filterClassName, "w-full sm:w-auto")}
              value={typeFilter}
              aria-label="Transaction type"
              onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
            >
              <option value="all">All types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="transfer">Transfer</option>
            </select>
            <select
              className={cn(filterClassName, "w-full sm:w-auto")}
              value={categoryFilter}
              aria-label="Category"
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="all">All categories</option>
              {categoryOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              className={cn(filterClassName, "w-full sm:w-auto")}
              value={confidenceFilter}
              aria-label="Confidence"
              onChange={(event) =>
                setConfidenceFilter(event.target.value as ConfidenceFilter)
              }
            >
              <option value="all">All confidence</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="review">Needs review</option>
            </select>
          </div>
        </div>

        {pageRows.length === 0 ? (
          <div className={dashboardTheme.emptyState}>
            <p className="text-sm font-medium text-foreground">
              No matching transactions
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try a different search or filter.
            </p>
          </div>
        ) : (
          <StatementReviewTable
            rows={pageRows}
            currency={currency}
            editing={editing}
            pageIncluded={pageIncluded}
            onEdit={setEditing}
            onChange={updateTransaction}
            onToggle={(id, nextIncluded) => setIncluded([id], nextIncluded)}
            onTogglePage={(nextIncluded) =>
              setIncluded(
                pageRows.map((transaction) => transaction.id),
                nextIncluded,
              )
            }
          />
        )}

        {pageCount > 1 ? (
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <p>
              {safePage * PAGE_SIZE + 1}-
              {Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of{" "}
              {filtered.length}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={safePage === 0}
                onClick={() => setPage(safePage - 1)}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={safePage >= pageCount - 1}
                onClick={() => setPage(safePage + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <StatementCashFlowImpact
        currency={currency}
        inflows={flow.inflows}
        outflows={flow.outflows}
        transferTotal={flow.transferTotal}
        suggestions={suggestions}
        acceptedKeys={acceptedKeys}
        onToggle={(key, checked) => {
          setAcceptedKeys((current) =>
            checked
              ? [...current, key]
              : current.filter((item) => item !== key),
          );
        }}
      />

      {message ? (
        <p className="text-sm text-destructive" role="alert">
          {message}
        </p>
      ) : null}

      <div className="dashboard-surface sticky -bottom-[calc(6.5rem+env(safe-area-inset-bottom,0px))] z-10 -mx-4 border-t border-border px-4 py-3 sm:-bottom-6 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium">
              {included.length === 0
                ? "No transactions selected"
                : `${transactionCountLabel(included.length)} selected`}
            </p>
            <p className="text-xs text-muted-foreground">
              {included.length === 0
                ? "Select at least one transaction to update your cash flow."
                : `${formatStatementMoney(flow.inflows, currency)} inflow · ${formatStatementMoney(flow.outflows, currency)} outflow`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 sm:flex-none"
              disabled={pending}
              onClick={() => router.push(cashFlowHref)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1 sm:flex-none"
              disabled={pending || included.length === 0}
              aria-busy={pending}
              onClick={onConfirm}
            >
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              {pending ? "Confirming..." : confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
