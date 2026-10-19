import type { ReactNode } from "react";

import { dashboardTheme } from "@/lib/dashboard-theme";
import type { DisplayCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

import {
  formatSignedStatementMoney,
  formatStatementMoney,
} from "./statement-review-format";

type StatementFlowSummaryProps = {
  count: number;
  inflows: number;
  outflows: number;
  currency: DisplayCurrency;
  detail?: ReactNode;
  className?: string;
};

export function StatementFlowSummary({
  count,
  inflows,
  outflows,
  currency,
  detail,
  className,
}: StatementFlowSummaryProps) {
  const net = inflows - outflows;

  return (
    <section className={cn(dashboardTheme.elevatedSection, className)}>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
        <div>
          <dt className={dashboardTheme.statLabel}>Transactions</dt>
          <dd className={cn(dashboardTheme.statValueLarge, "mt-1")}>{count}</dd>
        </div>
        <div>
          <dt className={dashboardTheme.statLabel}>Inflows</dt>
          <dd className="mt-1 text-2xl font-medium tracking-tight text-success tabular-nums">
            {formatStatementMoney(inflows, currency)}
          </dd>
        </div>
        <div>
          <dt className={dashboardTheme.statLabel}>Outflows</dt>
          <dd className={cn(dashboardTheme.statValueLarge, "mt-1")}>
            {formatStatementMoney(outflows, currency)}
          </dd>
        </div>
        <div>
          <dt className={dashboardTheme.statLabel}>Net movement</dt>
          <dd className={cn(dashboardTheme.statValueLarge, "mt-1")}>
            {formatSignedStatementMoney(net, currency)}
          </dd>
        </div>
      </dl>
      {detail ? (
        <div className="mt-4 border-t border-border pt-4">{detail}</div>
      ) : null}
    </section>
  );
}
