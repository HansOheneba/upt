"use client";

import * as React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  DashCard,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/dash-card";
import { Separator } from "@/components/ui/separator";
import type {
  PerformancePoint,
  PerformanceMetrics,
  SectionFreshness,
} from "@/lib/client-data";
import { DataFreshnessBadge } from "./DataFreshnessBadge";

interface PerformanceChartProps {
  points: PerformancePoint[];
  metrics: PerformanceMetrics;
  freshness: SectionFreshness[];
}

function fmtUSD(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

function fmtPct(n: number | null, decimals = 1): string {
  if (n === null) return "N/A";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(decimals)}%`;
}

export function PerformanceChart({
  points,
  metrics,
  freshness,
}: PerformanceChartProps) {
  const chartData = points.map((p) => ({
    month: p.month.slice(0, 7),
    value: p.value,
    contributions: p.contributions,
  }));

  const ytdPositive =
    metrics.ytdReturnPct === null || metrics.ytdReturnPct >= 0;

  return (
    <DashCard>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">Portfolio Performance</CardTitle>
          <DataFreshnessBadge freshness={freshness} section="portfolio" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval={2}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => fmtUSD(v)}
                width={52}
              />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(v: any, name: any) => [
                  typeof v === "number" ? fmtUSD(v) : "-",
                  name === "value" ? "Portfolio" : "Contributions",
                ]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#perfGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">YTD Return</p>
            <p
              className={`text-sm font-semibold ${ytdPositive ? "text-emerald-600" : "text-rose-500"}`}
            >
              {fmtPct(metrics.ytdReturnPct)}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">1-Year Return</p>
            <p
              className={`text-sm font-semibold ${(metrics.oneYearReturnPct ?? 0) >= 0 ? "text-emerald-600" : "text-rose-500"}`}
            >
              {fmtPct(metrics.oneYearReturnPct)}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Total Contributions</p>
            <p className="text-sm font-semibold">
              {fmtUSD(metrics.totalContributions)}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Total Growth</p>
            <p
              className={`text-sm font-semibold ${metrics.totalGrowth >= 0 ? "text-emerald-600" : "text-rose-500"}`}
            >
              {fmtUSD(metrics.totalGrowth)}
            </p>
          </div>
        </div>
      </CardContent>
    </DashCard>
  );
}
