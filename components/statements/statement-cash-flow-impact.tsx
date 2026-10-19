"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { dashboardTheme } from "@/lib/dashboard-theme";
import type { DisplayCurrency } from "@/lib/format";
import type { CategorySuggestion } from "@/lib/statements/types";
import { cn } from "@/lib/utils";

import {
  formatSignedStatementMoney,
  formatStatementMoney,
} from "./statement-review-format";

type StatementCashFlowImpactProps = {
  currency: DisplayCurrency;
  inflows: number;
  outflows: number;
  transferTotal: number;
  suggestions: CategorySuggestion[];
  acceptedKeys: string[];
  onToggle: (key: string, checked: boolean) => void;
};

function MagnitudeBar({
  value,
  max,
  className,
}: {
  value: number;
  max: number;
  className: string;
}) {
  const width = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;

  return (
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
      <div
        className={cn("h-full rounded-full", className)}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

function CategoryColumn({
  title,
  items,
  max,
  currency,
  barClassName,
  acceptedKeys,
  onToggle,
}: {
  title: string;
  items: CategorySuggestion[];
  max: number;
  currency: DisplayCurrency;
  barClassName: string;
  acceptedKeys: string[];
  onToggle: (key: string, checked: boolean) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
        <h3 className="text-sm font-medium">{title}</h3>
        <span className="text-xs text-muted-foreground">Monthly</span>
      </div>
      {items.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">
          No {title.toLowerCase()} in the selected transactions.
        </p>
      ) : (
        <ul className="mt-1">
          {items.map((item) => {
            const checked = acceptedKeys.includes(item.key);

            return (
              <li key={item.key} className="flex items-start gap-3 py-3">
                <Checkbox
                  className="mt-0.5"
                  checked={checked}
                  onCheckedChange={(value) => onToggle(item.key, value === true)}
                  aria-label={`Add ${item.label} to the cash-flow profile`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm font-medium">{item.label}</span>
                    <span className="shrink-0 text-sm tabular-nums">
                      {formatStatementMoney(item.monthlyAverage, currency)}
                    </span>
                  </div>
                  <div
                    className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted"
                    aria-hidden
                  >
                    <div
                      className={cn("h-full rounded-full", barClassName)}
                      style={{
                        width: `${max > 0 ? (item.monthlyAverage / max) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.transactionCount}{" "}
                    {item.transactionCount === 1 ? "transaction" : "transactions"}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function StatementCashFlowImpact({
  currency,
  inflows,
  outflows,
  transferTotal,
  suggestions,
  acceptedKeys,
  onToggle,
}: StatementCashFlowImpactProps) {
  const income = suggestions.filter((item) => item.type === "income");
  const expenses = suggestions.filter((item) => item.type === "expense");
  const incomeMax = income.reduce(
    (max, item) => Math.max(max, item.monthlyAverage),
    0,
  );
  const expenseMax = expenses.reduce(
    (max, item) => Math.max(max, item.monthlyAverage),
    0,
  );
  const flowMax = Math.max(inflows, outflows);
  const net = inflows - outflows;

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h2 className={dashboardTheme.sectionTitle}>Cash-flow impact</h2>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Selected transactions are added to the months they fall in. They do
          not replace cash flow already on the plan. Check a category to add
          its monthly average to your income or expenses.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <p className={dashboardTheme.statLabel}>Inflows</p>
          <p className="mt-1 text-xl font-medium tracking-tight text-success tabular-nums">
            {formatStatementMoney(inflows, currency)}
          </p>
          <MagnitudeBar value={inflows} max={flowMax} className="bg-success" />
        </div>
        <div>
          <p className={dashboardTheme.statLabel}>Outflows</p>
          <p className="mt-1 text-xl font-medium tracking-tight tabular-nums">
            {formatStatementMoney(outflows, currency)}
          </p>
          <MagnitudeBar
            value={outflows}
            max={flowMax}
            className="bg-foreground/55"
          />
        </div>
      </div>

      <div>
        <p className={dashboardTheme.statLabel}>Net movement</p>
        <p className="mt-1 text-lg font-medium tabular-nums">
          {formatSignedStatementMoney(net, currency)}
        </p>
        {transferTotal > 0 ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {formatStatementMoney(transferTotal, currency)} in transfers stays
            out of income and expenses.
          </p>
        ) : null}
      </div>

      <div className="grid gap-8 border-t border-border pt-5 lg:grid-cols-2">
        <CategoryColumn
          title="Income"
          items={income}
          max={incomeMax}
          currency={currency}
          barClassName="bg-success"
          acceptedKeys={acceptedKeys}
          onToggle={onToggle}
        />
        <CategoryColumn
          title="Expenses"
          items={expenses}
          max={expenseMax}
          currency={currency}
          barClassName="bg-foreground/45"
          acceptedKeys={acceptedKeys}
          onToggle={onToggle}
        />
      </div>
    </section>
  );
}
