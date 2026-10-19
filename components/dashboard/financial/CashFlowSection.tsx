"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  DashCard,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/dash-card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type {
  CashFlowMetrics,
  EmergencyFundMetrics,
  SectionFreshness,
  CashFlowRow,
  ExpenseCategory,
} from "@/lib/client-data";
import { DataFreshnessBadge } from "./DataFreshnessBadge";

interface CashFlowSectionProps {
  cashFlow: CashFlowMetrics;
  emergencyFund: EmergencyFundMetrics;
  incomeRows: CashFlowRow[];
  expenseCategories: ExpenseCategory[];
  freshness: SectionFreshness[];
}

function fmtUSD(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtCompact(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

export function CashFlowSection({
  cashFlow,
  emergencyFund,
  incomeRows,
  expenseCategories,
  freshness,
}: CashFlowSectionProps) {
  const chartData = [
    {
      name: "Income",
      amount: cashFlow.monthlyIncome,
    },
    {
      name: "Expenses",
      amount: cashFlow.monthlyExpenses,
    },
    {
      name: "Surplus",
      amount: Math.max(cashFlow.monthlySurplus, 0),
    },
  ];

  const surplusPositive = cashFlow.monthlySurplus >= 0;
  const runwayPct = Math.min(
    (emergencyFund.runwayMonths / emergencyFund.targetMonths) * 100,
    100,
  );

  return (
    <DashCard>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">Cash Flow</CardTitle>
          <DataFreshnessBadge freshness={freshness} section="cash-flow" />
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Bar Chart */}
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => fmtCompact(v)}
                width={52}
              />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(v: any) =>
                  typeof v === "number" ? fmtUSD(v) : "-"
                }
              />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]} fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Key stats */}
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Monthly Income</p>
            <p className="font-semibold text-emerald-600">
              {fmtUSD(cashFlow.monthlyIncome)}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Monthly Expenses</p>
            <p className="font-semibold text-rose-500">
              {fmtUSD(cashFlow.monthlyExpenses)}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">
              {surplusPositive ? "Surplus" : "Deficit"}
            </p>
            <p
              className={`font-semibold ${surplusPositive ? "text-emerald-600" : "text-rose-500"}`}
            >
              {fmtUSD(Math.abs(cashFlow.monthlySurplus))}
            </p>
          </div>
        </div>

        <Separator />

        {/* After-tax income */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">
              After-Tax Monthly Income
            </p>
            <p className="font-medium">
              {fmtUSD(cashFlow.afterTaxMonthlyIncome)}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Est. Annual Taxes</p>
            <p className="font-medium text-amber-600">
              {fmtUSD(cashFlow.estimatedAnnualTaxes)}
            </p>
          </div>
        </div>

        <Separator />

        {/* Emergency Fund */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Emergency Fund</span>
            <Badge
              variant={emergencyFund.funded ? "default" : "secondary"}
              className={
                emergencyFund.funded
                  ? "bg-emerald-600 text-white text-xs"
                  : "text-xs"
              }
            >
              {emergencyFund.funded
                ? "Funded"
                : `${emergencyFund.runwayMonths.toFixed(1)} / ${emergencyFund.targetMonths} mo`}
            </Badge>
          </div>

          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full w-full origin-left rounded-full transition-transform duration-200 ease-out ${emergencyFund.funded ? "bg-emerald-500" : "bg-amber-400"}`}
              style={{ transform: `scaleX(${Math.max(runwayPct, 0) / 100})` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <span>Balance: {fmtUSD(emergencyFund.currentBalance)}</span>
            <span className="text-right">
              Target: {fmtUSD(emergencyFund.targetBalance)}
            </span>
          </div>
        </div>

        <Separator />

        {/* Income breakdown */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Income Sources
          </p>
          <div className="space-y-1.5">
            {incomeRows.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground">{row.name}</span>
                <span className="font-medium text-emerald-600">
                  {fmtUSD(row.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Expense breakdown */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Expenses
          </p>
          <div className="space-y-1.5">
            {expenseCategories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{cat.name}</span>
                  {cat.essential && (
                    <span className="text-xs bg-muted rounded px-1 py-0.5 text-muted-foreground">
                      Essential
                    </span>
                  )}
                </div>
                <span className="font-medium text-rose-500">
                  {fmtUSD(cat.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </DashCard>
  );
}
