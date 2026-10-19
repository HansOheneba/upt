"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  Cell,
  ReferenceLine,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCurrency, type CashFlowPoint } from "@/lib/client-data";

const surplusChartConfig = {
  surplus: { label: "Surplus", color: "var(--chart-1)" },
  deficit: { label: "Deficit", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function SurplusHistoryChart({ history }: { history: CashFlowPoint[] }) {
  const data = [...history]
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6)
    .map((p) => ({
      label: new Date(p.month + "-01").toLocaleDateString("en-US", {
        month: "short",
      }),
      value:
        p.source === "statement"
          ? p.income - p.expenses
          : p.statementIncome != null || p.statementExpenses != null
            ? p.income +
              (p.statementIncome ?? 0) -
              (p.expenses + (p.statementExpenses ?? 0))
            : (p.surplus ?? p.income - p.expenses),
    }));

  return (
    <ChartContainer config={surplusChartConfig} className="h-30 w-full">
      <BarChart data={data} barSize={28}>
        <CartesianGrid
          vertical={false}
          strokeDasharray="3 3"
          className="stroke-muted"
        />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={6}
          className="text-xs"
        />
        <ReferenceLine y={0} stroke="currentColor" strokeOpacity={0.2} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(v) => formatCurrency(v as number)}
              indicator="dot"
            />
          }
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.value >= 0 ? "var(--chart-1)" : "var(--chart-2)"}
              fillOpacity={0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
