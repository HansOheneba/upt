"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  Cell,
  Legend,
} from "recharts";
import {
  DashCard,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/dash-card";
import { Separator } from "@/components/ui/separator";
import type {
  NetWorthBreakdownMetrics,
  SectionFreshness,
} from "@/lib/client-data";
import { useWealthFormatting } from "@/hooks/useUserCurrency";
import { DataFreshnessBadge } from "./DataFreshnessBadge";

interface NetWorthBreakdownProps {
  netWorth: NetWorthBreakdownMetrics;
  freshness: SectionFreshness[];
}

const ASSET_COLOR = "#10b981";
const LIABILITY_COLOR = "#f43f5e";
const NET_COLOR = "#6366f1";

export function NetWorthBreakdown({
  netWorth,
  freshness,
}: NetWorthBreakdownProps) {
  const { convertAmount, displayCurrency, baseCurrency, fmtNetWorth } =
    useWealthFormatting();

  const fmtCompact = React.useCallback(
    (n: number) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: displayCurrency,
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(convertAmount(n, baseCurrency)),
    [convertAmount, displayCurrency, baseCurrency],
  );
  const chartData = [
    {
      name: "Investments",
      value: netWorth.totalInvestments,
      fill: ASSET_COLOR,
    },
    { name: "Cash", value: netWorth.totalCash, fill: "#60a5fa" },
    { name: "Property", value: netWorth.totalPropertyValue, fill: "#f59e0b" },
    {
      name: "Mortgages",
      value: -netWorth.totalMortgages,
      fill: LIABILITY_COLOR,
    },
    { name: "ST Debt", value: -netWorth.totalShortTermDebt, fill: "#fb923c" },
  ];

  const rows: { label: string; value: number; positive: boolean }[] = [
    { label: "Investments", value: netWorth.totalInvestments, positive: true },
    { label: "Cash", value: netWorth.totalCash, positive: true },
    {
      label: "Real Estate",
      value: netWorth.totalPropertyValue,
      positive: true,
    },
    { label: "Mortgages", value: netWorth.totalMortgages, positive: false },
    {
      label: "Short-term Debt",
      value: netWorth.totalShortTermDebt,
      positive: false,
    },
  ];

  return (
    <DashCard>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">Net Worth Breakdown</CardTitle>
          <DataFreshnessBadge freshness={freshness} section="overview" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 4, right: 8, bottom: 0, left: 8 }}
            >
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) =>
                  typeof value === "number" ? fmtCompact(Math.abs(value)) : "-"
                }
                cursor={{ fill: "rgba(0,0,0,0.04)" }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <Separator />

        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-muted-foreground">{row.label}</span>
              <span
                className={
                  row.positive
                    ? "font-medium text-emerald-600"
                    : "font-medium text-rose-500"
                }
              >
                {row.positive ? "+" : "-"}
                {fmtCompact(row.value)}
              </span>
            </div>
          ))}
          <Separator />
          <div className="flex items-center justify-between text-sm font-semibold">
            <span>Total Net Worth</span>
            <span style={{ color: NET_COLOR }}>
              {fmtNetWorth(netWorth.totalNetWorth)}
            </span>
          </div>
        </div>
      </CardContent>
    </DashCard>
  );
}
