import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { CashFlowLink } from "@/components/statements/cash-flow-link";
import { StatementFlowSummary } from "@/components/statements/statement-flow-summary";
import { StatementImportReview } from "@/components/statements/statement-import-review";
import { formatStatementMoney } from "@/components/statements/statement-review-format";
import { buttonVariants } from "@/components/ui/button";
import { StatusPill, type StatusPillTone } from "@/components/ui/status-pill";
import { dashboardTheme } from "@/lib/dashboard-theme";
import { loadStatementReview } from "@/lib/statements/load";
import { statementTotals } from "@/lib/statements/aggregate";
import type { StatementImportStatus } from "@/lib/statements/types";
import { cn } from "@/lib/utils";

type StatementImportPageProps = {
  params: Promise<{ importId: string }>;
};

function importStatus(status: StatementImportStatus): {
  label: string;
  tone: StatusPillTone;
} {
  if (status === "confirmed") {
    return { label: "Confirmed", tone: "success" };
  }

  if (status === "failed") {
    return { label: "Couldn't process", tone: "danger" };
  }

  if (status === "processing" || status === "uploaded") {
    return { label: "Processing", tone: "info" };
  }

  return { label: "Review required", tone: "warning" };
}

function formatPeriod(start: string | null, end: string | null): string {
  const format = (value: string) =>
    new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(`${value}T00:00:00`));

  if (start && end && start !== end) {
    return `${format(start)} - ${format(end)}`;
  }

  if (start) {
    return format(start);
  }

  return "Period unavailable";
}

export async function generateMetadata({
  params,
}: StatementImportPageProps): Promise<Metadata> {
  const { importId } = await params;
  const review = await loadStatementReview(importId);

  return {
    title: review
      ? `Review ${review.statementImport.fileName}`
      : "Statement import",
  };
}

export default async function StatementImportPage({
  params,
}: StatementImportPageProps) {
  const { importId } = await params;
  const review = await loadStatementReview(importId);

  if (!review) {
    notFound();
  }

  const { statementImport, clientId, priorFingerprints } = review;
  const totals = statementTotals(statementImport.transactions);
  const status = importStatus(statementImport.status);
  const period = formatPeriod(
    statementImport.periodStart,
    statementImport.periodEnd,
  );
  const transactionCount = statementImport.transactions.length;
  const description =
    statementImport.status === "confirmed"
      ? "These transactions are on your cash-flow chart."
      : statementImport.status === "failed"
        ? "This statement couldn't be processed."
        : statementImport.status === "processing" ||
            statementImport.status === "uploaded"
          ? "We're extracting and checking transactions."
          : "Review the extracted transactions before adding them to your cash flow.";

  return (
    <div className={dashboardTheme.pageContainer}>
      <CashFlowLink
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2")}
      >
        <ArrowLeft />
        Cash flow
      </CashFlowLink>

      <section className="space-y-2">
        <p className={dashboardTheme.sectionLabel}>Statement import</p>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h1 className={cn(dashboardTheme.pageTitle, "min-w-0 break-words")}>
            {statementImport.fileName}
          </h1>
          <StatusPill label={status.label} tone={status.tone} />
        </div>
        <p className="text-sm text-muted-foreground">
          {period}
          <span aria-hidden="true"> · </span>
          {transactionCount}{" "}
          {transactionCount === 1 ? "transaction" : "transactions"}
        </p>
        <p className={dashboardTheme.pageDescription}>{description}</p>
      </section>

      {statementImport.status === "confirmed" ? (
        <div className="space-y-6">
          <StatementFlowSummary
            count={totals.count}
            inflows={totals.income}
            outflows={totals.expenses}
            currency={statementImport.currency}
            detail={
              totals.transfers > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {formatStatementMoney(totals.transfers, statementImport.currency)}{" "}
                  in transfers stayed out of income and expenses.
                </p>
              ) : null
            }
          />
          <CashFlowLink className={cn(buttonVariants())}>
            View cash flow
          </CashFlowLink>
        </div>
      ) : statementImport.status === "failed" ? (
        <div className={dashboardTheme.emptyState}>
          <h2 className="text-base font-medium text-foreground">
            This statement couldn&apos;t be processed.
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {statementImport.errorMessage ??
              "Try uploading the file again or choose a different statement."}
          </p>
          <CashFlowLink
            className={cn(buttonVariants({ variant: "outline" }), "mt-5")}
          >
            Back to cash flow
          </CashFlowLink>
        </div>
      ) : statementImport.status === "processing" ||
        statementImport.status === "uploaded" ? (
        <div className={dashboardTheme.emptyState}>
          <h2 className="text-base font-medium text-foreground">
            Processing statement
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            We&apos;re extracting and checking transactions.
          </p>
        </div>
      ) : statementImport.transactions.length === 0 ? (
        <div className={dashboardTheme.emptyState}>
          <h2 className="text-base font-medium text-foreground">
            No transactions found
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            We couldn&apos;t identify any financial transactions in this
            statement.
          </p>
          <CashFlowLink
            className={cn(buttonVariants({ variant: "outline" }), "mt-5")}
          >
            Back to cash flow
          </CashFlowLink>
        </div>
      ) : (
        <StatementImportReview
          clientId={clientId}
          importId={importId}
          currency={statementImport.currency}
          skippedRowCount={statementImport.skippedRowCount}
          priorFingerprints={priorFingerprints}
          transactions={statementImport.transactions}
        />
      )}
    </div>
  );
}
