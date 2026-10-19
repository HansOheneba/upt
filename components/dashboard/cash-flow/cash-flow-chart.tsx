"use client";

import * as React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  type CashFlowPoint,
  type RecurringType,
  formatCurrency,
  projectMonthlyAmount,
} from "@/lib/client-data";
import { useFinancialStore } from "@/store/financialStore";
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";

// ─── Colors ───────────────────────────────────────────────────────────────────
const INCOME_COLOR = "var(--brand-primary)";
const EXPENSES_COLOR = "#7eb8e8";
const SURPLUS_COLOR = "#10b981";
const DEFICIT_COLOR = "#f43f5e";

const chartConfig = {
  income: { label: "Income", color: INCOME_COLOR },
  expenses: { label: "Expenses", color: EXPENSES_COLOR },
} satisfies ChartConfig;

type EnrichedPoint = CashFlowPoint & { isProjected?: boolean; label: string };

function addMonths(base: Date, offset: number): string {
  const d = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function toLabel(isoMonth: string): string {
  return new Date(isoMonth + "-01").toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

function monthWithStatement(
  actual: CashFlowPoint | undefined,
  planIncome: number,
  planExpenses: number,
): { income: number; expenses: number } {
  const plannedIncome = planIncome > 0 ? planIncome : 0;
  const plannedExpenses = planExpenses > 0 ? planExpenses : 0;

  if (!actual) {
    return { income: plannedIncome, expenses: plannedExpenses };
  }

  if (actual.source === "statement") {
    return {
      income: plannedIncome + actual.income,
      expenses: plannedExpenses + actual.expenses,
    };
  }

  return {
    income: actual.income + (actual.statementIncome ?? 0),
    expenses: actual.expenses + (actual.statementExpenses ?? 0),
  };
}

/** Advance an ISO month string by one month (e.g. "2026-03" to "2026-04"). */
function nextIsoMonth(m: string): string {
  const [y, mon] = m.split("-").map(Number);
  // mon is 1-indexed; new Date(y, mon-1, 1) = that month; +1 offset advances by one month
  return addMonths(new Date(y, mon - 1, 1), 1);
}

/**
 * Like `projectMonthlyAmount` but ONLY counts rows that carry an explicit
 * `startDate` that falls on or before `isoMonth`.  Used to build synthetic
 * historical data - rows with no startDate are ignored (we don't know when
 * they started).
 */
function projectHistoricalMonthlyAmount(
  rows: Array<{
    amount: number;
    isRecurring?: boolean;
    recurringType?: RecurringType;
    recurringMonths?: number;
    startDate?: string;
    endDate?: string;
  }>,
  isoMonth: string,
): number {
  return rows
    .filter((row) => {
      const isOngoing =
        row.recurringType !== "one-time" && row.isRecurring !== false;

      // No startDate + ongoing forever: treat as always active (matches
      // projectMonthlyAmount which includes these in all future months too)
      if (!row.startDate) return isOngoing;

      const startMonth = row.startDate.slice(0, 7);
      if (isoMonth < startMonth) return false;

      if (!row.isRecurring || row.recurringType === "one-time") {
        return startMonth === isoMonth;
      }
      // Stop counting after the row's end date
      if (row.endDate && isoMonth > row.endDate.slice(0, 7)) return false;
      return true; // "forever" with an explicit startDate
    })
    .reduce((s, r) => s + r.amount, 0);
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────
function CashFlowTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const incomeValue: number | undefined =
    payload.find((p: any) => p.dataKey === "income" && p.value != null)
      ?.value ??
    payload.find((p: any) => p.dataKey === "projIncome" && p.value != null)
      ?.value;
  const expensesValue: number | undefined =
    payload.find((p: any) => p.dataKey === "expenses" && p.value != null)
      ?.value ??
    payload.find((p: any) => p.dataKey === "projExpenses" && p.value != null)
      ?.value;
  const isProjected: boolean =
    payload.some((p: any) => p.dataKey === "projIncome" && p.value != null) &&
    !payload.some((p: any) => p.dataKey === "income" && p.value != null);

  const surplus =
    incomeValue != null && expensesValue != null
      ? incomeValue - expensesValue
      : null;

  return (
    <div className="rounded-lg border bg-background shadow-md px-3 py-2.5 text-xs space-y-1.5 min-w-40">
      <p className="font-semibold text-foreground mb-1">
        {label}
        {isProjected && (
          <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
            (projected)
          </span>
        )}
      </p>
      {incomeValue != null && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: INCOME_COLOR }}
            />
            <span className="text-muted-foreground">Income</span>
          </div>
          <span className="font-medium">{formatCurrency(incomeValue)}</span>
        </div>
      )}
      {expensesValue != null && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: EXPENSES_COLOR }}
            />
            <span className="text-muted-foreground">Expenses</span>
          </div>
          <span className="font-medium">{formatCurrency(expensesValue)}</span>
        </div>
      )}
      {surplus != null && (
        <div className="flex items-center justify-between gap-4 border-t pt-1.5 mt-1">
          <span className="text-muted-foreground">
            {surplus >= 0 ? "Surplus" : "Deficit"}
          </span>
          <span
            className="font-semibold"
            style={{ color: surplus >= 0 ? SURPLUS_COLOR : DEFICIT_COLOR }}
          >
            {surplus >= 0 ? "+" : ""}
            {formatCurrency(surplus)}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── New-user snapshot banner ─────────────────────────────────────────────────
function NewUserBanner({
  monthlyIncome,
  monthlyExpenses,
  preferredCurrency,
}: {
  monthlyIncome: number;
  monthlyExpenses: number;
  preferredCurrency?: string;
}) {
  const surplus = monthlyIncome - monthlyExpenses;
  const isPositive = surplus >= 0;
  const annualSavings = surplus * 12;
  const savingsRate =
    monthlyIncome > 0
      ? Math.round((Math.max(surplus, 0) / monthlyIncome) * 100)
      : 0;

  const SurplusIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div className="grid grid-cols-3 gap-3 mb-4">
      {/* Monthly surplus / deficit */}
      <div
        className="col-span-1 rounded-xl p-3.5 flex flex-col gap-1"
        style={{
          background: isPositive
            ? "rgba(16,185,129,0.07)"
            : "rgba(244,63,94,0.07)",
        }}
      >
        <p className="text-[10px] font-semibold capitalize uppercase tracking-widest text-slate-400">
          Monthly {isPositive ? "surplus" : "deficit"}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <SurplusIcon
            className="h-4 w-4 shrink-0"
            style={{ color: isPositive ? SURPLUS_COLOR : DEFICIT_COLOR }}
          />
          <p
            className="text-xl font-semibold tabular-nums"
            style={{ color: isPositive ? SURPLUS_COLOR : DEFICIT_COLOR }}
          >
            {isPositive ? "+" : ""}
            {formatCurrency(surplus)}
          </p>
        </div>
        <p className="text-[11px] text-slate-400">
          {savingsRate}% savings rate
        </p>
      </div>

      {/* Projected annual savings */}
      <div className="col-span-1 rounded-xl bg-slate-50 p-3.5 flex flex-col gap-1">
        <p className="text-[10px] font-semibold capitalize uppercase tracking-widest text-slate-400">
          12-month projection
        </p>
        <p className="text-xl font-semibold tabular-nums text-slate-800 mt-0.5">
          {formatCurrency(Math.max(annualSavings, 0))}
        </p>
        <p className="text-[11px] text-slate-400">
          {isPositive ? "saved if you keep this up" : "review your expenses"}
        </p>
      </div>

      {/* Data notice */}
      <div className="col-span-1 rounded-xl bg-slate-50 p-3.5 flex flex-col gap-1">
        <p className="text-[10px] font-semibold capitalize uppercase tracking-widest text-slate-400">
          Trend data
        </p>
        <div className="flex items-start gap-1.5 mt-0.5">
          <Info className="h-3.5 w-3.5 text-slate-300 mt-0.5 shrink-0" />
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Chart below shows your projected flow. Actuals build up over time.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface CashFlowChartProps {
  data: CashFlowPoint[];
  title?: string;
  description?: string;
  className?: string;
}

export function CashFlowChart({
  data,
  title = "Income vs Expenses",
  description = "Cash flow over time",
  className,
}: CashFlowChartProps) {
  const incomeRows = useFinancialStore((s) => s.incomeRows);
  const expenseCategories = useFinancialStore((s) => s.expenseCategories);

  // "New user" = no recorded actual history yet
  const isNewUser = data.length === 0;

  // "This year" is the default - shows the full calendar year with solid actuals + dashed future
  const [timeRange, setTimeRange] = React.useState<string>("this-year");

  // Projected monthly totals for banner
  const projectedIncome = React.useMemo(
    () => projectMonthlyAmount(incomeRows, addMonths(new Date(), 0)),
    [incomeRows],
  );
  const projectedExpenses = React.useMemo(
    () => projectMonthlyAmount(expenseCategories, addMonths(new Date(), 0)),
    [expenseCategories],
  );

  // ── Build merged dataset ────────────────────────────────────────────────
  const mergedData = React.useMemo<EnrichedPoint[]>(() => {
    const today = new Date();
    const currentMonth = addMonths(today, 0);

    // How far back we're willing to generate synthetic data (cap at 24 months)
    const minHistoricalMonth = addMonths(
      new Date(today.getFullYear(), today.getMonth() - 24, 1),
      0,
    );

    // Find the earliest explicit startDate across all configured rows
    const allStartMonths = [
      ...incomeRows
        .filter((r) => r.startDate && r.startDate.slice(0, 7) <= currentMonth)
        .map((r) => r.startDate!.slice(0, 7)),
      ...expenseCategories
        .filter((r) => r.startDate && r.startDate.slice(0, 7) <= currentMonth)
        .map((r) => r.startDate!.slice(0, 7)),
      ...data
        .filter(
          (point) =>
            point.month <= currentMonth &&
            (point.source === "statement" ||
              point.statementIncome != null ||
              point.statementExpenses != null),
        )
        .map((point) => point.month),
    ];

    // When no rows have an explicit startDate (e.g. seeded from onboarding),
    // fall back to Jan 1 of the current year so «This year» shows all 12 months.
    const currentYearStart = `${today.getFullYear()}-01`;
    const earliestHistoricalMonth =
      allStartMonths.length > 0
        ? allStartMonths.reduce((a, b) => (a < b ? a : b)) > minHistoricalMonth
          ? allStartMonths.reduce((a, b) => (a < b ? a : b))
          : minHistoricalMonth
        : currentYearStart;

    const actualByMonth = new Map(data.map((d) => [d.month, d]));
    const points: EnrichedPoint[] = [];

    // ── Historical: cashFlowHistory wins; synthetic fills gaps only ──
    let m = earliestHistoricalMonth;
    while (m <= currentMonth) {
      const actual = actualByMonth.get(m);
      const synthIncome = projectHistoricalMonthlyAmount(incomeRows, m);
      const synthExpenses = projectHistoricalMonthlyAmount(
        expenseCategories,
        m,
      );
      const totals = monthWithStatement(actual, synthIncome, synthExpenses);
      const finalIncome = totals.income;
      const finalExpenses = totals.expenses;
      const statementAdded =
        !!actual &&
        (actual.source === "statement" ||
          actual.statementIncome != null ||
          actual.statementExpenses != null);

      if (actual || finalIncome > 0 || finalExpenses > 0) {
        points.push({
          month: m,
          income: finalIncome,
          expenses: finalExpenses,
          surplus: statementAdded
            ? finalIncome - finalExpenses
            : actual?.income != null
              ? (actual.surplus ?? actual.income - actual.expenses)
              : undefined,
          isProjected: false,
          label: toLabel(m),
        });
      }
      m = nextIsoMonth(m);
    }

    // ── Future: forward projection for the next 12 months ────────────────
    for (let i = 1; i <= 12; i++) {
      const futureMonth = addMonths(today, i);
      const actual = actualByMonth.get(futureMonth);
      const planIncome = projectMonthlyAmount(incomeRows, futureMonth);
      const planExpenses = projectMonthlyAmount(expenseCategories, futureMonth);

      if (
        actual?.source === "statement" ||
        actual?.statementIncome != null ||
        actual?.statementExpenses != null
      ) {
        const totals = monthWithStatement(actual, planIncome, planExpenses);
        points.push({
          month: futureMonth,
          income: totals.income,
          expenses: totals.expenses,
          surplus: totals.income - totals.expenses,
          isProjected: false,
          label: toLabel(futureMonth),
        });
        continue;
      }

      if (!actual) {
        points.push({
          month: futureMonth,
          income: planIncome,
          expenses: planExpenses,
          isProjected: true,
          label: toLabel(futureMonth),
        });
      }
    }

    return points.sort((a, b) => a.month.localeCompare(b.month));
  }, [data, incomeRows, expenseCategories]);

  // ── Historical months (non-projected) - used for range availability ────
  const historicalMonths = React.useMemo(
    () => mergedData.filter((p) => !p.isProjected),
    [mergedData],
  );

  // ── Filter by time range ────────────────────────────────────────────────
  const filteredData = React.useMemo<EnrichedPoint[]>(() => {
    const historical = mergedData.filter((p) => !p.isProjected);
    const future = mergedData.filter((p) => p.isProjected);

    if (timeRange === "this-year") {
      // Show the full calendar year: past months solid, future months dashed
      const year = new Date().getFullYear();
      const yearStart = `${year}-01`;
      const yearEnd = `${year}-12`;
      return mergedData.filter(
        (p) => p.month >= yearStart && p.month <= yearEnd,
      );
    }

    if (timeRange === "12m-forward") {
      // Anchor on the last real/synthetic point so the dashed line starts
      // from the right value instead of floating in mid-air
      return [...historical.slice(-1), ...future];
    }

    // Historical views: ONLY historical/synthetic data - no future projection
    const n = timeRange === "3m" ? 3 : timeRange === "6m" ? 6 : 12;
    return historical.slice(-n);
  }, [mergedData, timeRange]);

  const todayMonthLabel = React.useMemo(
    () => toLabel(addMonths(new Date(), 0)),
    [],
  );

  const yMax = React.useMemo(() => {
    const max = Math.max(
      0,
      ...filteredData.flatMap((d) => [d.income, d.expenses]),
    );
    return Math.ceil((max * 1.2) / 1000) * 1000 || 10000;
  }, [filteredData]);

  const chartData = React.useMemo(() => {
    const hasFutureProjected = filteredData.some((p) => p.isProjected);
    const lastActualIdx = filteredData.reduce<number>(
      (last, p, i) => (!p.isProjected ? i : last),
      -1,
    );
    return filteredData.map((p, i) => ({
      label: p.label,
      month: p.month,
      income: p.isProjected ? null : p.income,
      expenses: p.isProjected ? null : p.expenses,
      // Only bridge solid→dashed when there are actual future projected points
      projIncome:
        p.isProjected || (hasFutureProjected && i === lastActualIdx)
          ? p.income
          : null,
      projExpenses:
        p.isProjected || (hasFutureProjected && i === lastActualIdx)
          ? p.expenses
          : null,
    }));
  }, [filteredData]);

  // ── Range availability ────────────────────────────────────────────────────
  const earliestLabel =
    historicalMonths.length > 0 ? historicalMonths[0].label : null;
  const ranges: {
    value: string;
    label: string;
    disabled: boolean;
    reason: string;
  }[] = [
    { value: "this-year", label: "This year", disabled: false, reason: "" },
    {
      value: "3m",
      label: "3m",
      disabled: historicalMonths.length < 2,
      reason: `No cash flow going back 3 months${
        earliestLabel ? ` - earliest entry: ${earliestLabel}` : ""
      }`,
    },
    {
      value: "6m",
      label: "6m",
      disabled: historicalMonths.length < 4,
      reason: `No cash flow going back 6 months${
        earliestLabel ? ` - earliest entry: ${earliestLabel}` : ""
      }`,
    },
    {
      value: "12m",
      label: "12m",
      disabled: historicalMonths.length < 7,
      reason: `No cash flow going back 12 months${
        earliestLabel ? ` - earliest entry: ${earliestLabel}` : ""
      }`,
    },
    { value: "12m-forward", label: "12m →", disabled: false, reason: "" },
  ];

  // ── Empty state ─────────────────────────────────────────────────────────
  if (
    incomeRows.length === 0 &&
    expenseCategories.length === 0 &&
    data.length === 0
  ) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
            <p className="text-sm text-muted-foreground max-w-70">
              Set up your income and expenses to see your projected cash flow.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex items-center gap-2 space-y-0 py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {isNewUser
              ? "Based on your setup - actuals will appear as months go by"
              : description}
          </CardDescription>
        </div>
        <TooltipProvider>
          <div className="hidden sm:ml-auto sm:flex items-center rounded-lg border bg-muted/40 p-0.5 gap-0.5">
            {ranges.map(({ value, label, disabled, reason }) =>
              disabled ? (
                <Tooltip key={value}>
                  <TooltipTrigger asChild>
                    {/* span wrapper needed - disabled buttons can't fire pointer events */}
                    <span className="inline-flex">
                      <button
                        disabled
                        className="px-3 py-1.5 text-xs rounded-md text-muted-foreground/40 cursor-not-allowed select-none"
                      >
                        {label}
                      </button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    className="max-w-52 text-center"
                  >
                    {reason}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <button
                  key={value}
                  onClick={() => setTimeRange(value)}
                  className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                    timeRange === value
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ),
            )}
          </div>
        </TooltipProvider>
      </CardHeader>

      <CardContent className="px-2 pt-2 sm:px-6 sm:pt-4">
        {/* New-user snapshot banner */}
        {isNewUser && (
          <NewUserBanner
            monthlyIncome={projectedIncome}
            monthlyExpenses={projectedExpenses}
          />
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 mb-3 px-1 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="inline-block h-2 w-6 rounded-full"
              style={{ backgroundColor: INCOME_COLOR }}
            />
            Income
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="inline-block h-2 w-6 rounded-full"
              style={{ backgroundColor: EXPENSES_COLOR }}
            />
            Expenses
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <svg width="24" height="8" className="overflow-visible">
              <line
                x1="0"
                y1="4"
                x2="24"
                y2="4"
                stroke={INCOME_COLOR}
                strokeWidth="2"
                strokeDasharray="4 3"
                opacity="0.55"
              />
            </svg>
            Projected
          </div>
        </div>

        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-55 w-full"
        >
          <LineChart data={chartData} margin={{ left: 12, right: 12 }}>
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              className="stroke-muted"
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
              className="text-xs text-muted-foreground"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v: number) => formatCurrency(v)}
              width={80}
              domain={[0, yMax]}
              className="text-xs text-muted-foreground"
            />
            <ChartTooltip cursor={false} content={<CashFlowTooltip />} />
            <ReferenceLine
              x={todayMonthLabel}
              stroke={INCOME_COLOR}
              strokeOpacity={0.3}
              strokeDasharray="4 3"
              label={{
                value: "Today",
                position: "top",
                offset: 10,
                fontSize: 10,
                fill: "var(--muted-foreground)",
              }}
            />
            <Line
              dataKey="income"
              type="linear"
              stroke={INCOME_COLOR}
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
            <Line
              dataKey="expenses"
              type="linear"
              stroke={EXPENSES_COLOR}
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
            <Line
              dataKey="projIncome"
              type="linear"
              stroke={INCOME_COLOR}
              strokeWidth={2}
              strokeDasharray="4 3"
              strokeOpacity={0.55}
              dot={false}
              connectNulls
              legendType="none"
            />
            <Line
              dataKey="projExpenses"
              type="linear"
              stroke={EXPENSES_COLOR}
              strokeWidth={2}
              strokeDasharray="4 3"
              strokeOpacity={0.55}
              dot={false}
              connectNulls
              legendType="none"
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
