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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type {
  RetirementOutputs,
  RetirementConfig,
  SectionFreshness,
} from "@/lib/client-data";
import { DataFreshnessBadge } from "./DataFreshnessBadge";

interface RetirementSectionProps {
  outputs: RetirementOutputs;
  config: RetirementConfig;
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

function fmtUSDFull(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Build a simple year-by-year projection curve for the chart. */
function buildProjectionCurve(
  config: RetirementConfig,
): { year: number; balance: number }[] {
  const r = config.expectedReturnPct / 100 / 12;
  const monthlyTotal =
    config.monthlySavings + config.monthlyPensionContribution;
  const points: { year: number; balance: number }[] = [];
  let pv = config.currentInvested + config.existingPensionBalance;

  const totalYears = config.retirementAge - config.currentAge;
  for (let yr = 0; yr <= totalYears; yr++) {
    points.push({ year: config.currentAge + yr, balance: Math.round(pv) });
    if (r === 0) {
      pv += monthlyTotal * 12;
    } else {
      pv =
        pv * Math.pow(1 + r, 12) +
        monthlyTotal * ((Math.pow(1 + r, 12) - 1) / r);
    }
  }
  return points;
}

export function RetirementSection({
  outputs,
  config,
  freshness,
}: RetirementSectionProps) {
  const curve = buildProjectionCurve(config);

  const metrics: {
    label: string;
    value: string;
    sub?: string;
    highlight?: boolean;
  }[] = [
    {
      label: "Years to Retirement",
      value: `${outputs.yearsToRetirement} yrs`,
      sub: `Target age: ${config.retirementAge}`,
    },
    {
      label: "Projected Balance",
      value: fmtUSD(outputs.projectedBalanceAtRetirement),
      sub: "At retirement age",
      highlight: true,
    },
    {
      label: "Sustainable Monthly Income",
      value: fmtUSD(outputs.sustainableMonthlyIncome),
      sub: `${config.lifeExpectancy - config.retirementAge} yr retirement span`,
    },
    {
      label: "Inflation-Adjusted Income",
      value: fmtUSD(outputs.inflationAdjustedSustainableMonthlyIncome),
      sub: "In today's dollars",
    },
    {
      label: "Desired Monthly Income",
      value: fmtUSD(config.desiredMonthlyIncome),
      sub: "In today's dollars",
    },
    {
      label: outputs.incomeGap > 0 ? "Income Gap" : "Income Surplus",
      value: fmtUSD(Math.abs(outputs.incomeGap)),
      sub:
        outputs.incomeGap > 0
          ? "Additional income needed"
          : "Above desired income",
      highlight: outputs.incomeGap < 0,
    },
  ];

  return (
    <DashCard>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">Retirement Projection</CardTitle>
          <DataFreshnessBadge freshness={freshness} section="retirement" />
        </div>
        <div className="mt-1">
          <Badge
            className={`text-xs ${outputs.onTrack ? "bg-emerald-600 text-white" : "bg-amber-100 text-amber-700 border-0"}`}
          >
            {outputs.onTrack
              ? "On Track for Desired Income"
              : "Income gap detected"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Projection curve */}
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={curve}
              margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id="retirementGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval={Math.floor(curve.length / 5)}
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
                formatter={(v: any) => [
                  typeof v === "number" ? fmtUSDFull(v) : "-",
                  "Balance",
                ]}
                labelFormatter={(l: unknown) => `Age ${l}`}
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#retirementGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <Separator />

        {/* Metric grid */}
        <div className="grid grid-cols-2 gap-3">
          {metrics.map((m) => (
            <div key={m.label} className="space-y-0.5">
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <p
                className={`text-sm font-semibold ${m.highlight ? "text-emerald-600" : ""}`}
              >
                {m.value}
              </p>
              {m.sub && (
                <p className="text-xs text-muted-foreground">{m.sub}</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </DashCard>
  );
}
