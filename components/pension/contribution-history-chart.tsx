"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { FileText } from "lucide-react";
import { DashboardEmptyState } from "@/components/dashboard/empty-state";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import {
  monthlyContributionSeries,
  type ContributionChartRange,
  type MonthlyContributionPoint,
} from "@/lib/pension/contributions";
import { formatGhs } from "@/lib/pension/metrics";
import type { Contribution } from "@/lib/pension/types";

const RANGES: { id: ContributionChartRange; label: string }[] = [
  { id: "6", label: "6 months" },
  { id: "12", label: "12 months" },
  { id: "all", label: "All" },
];

const chartConfig = {
  amount: { label: "Contributions", color: "var(--brand-primary)" },
} satisfies ChartConfig;

export function ContributionHistoryChart({
  contributions,
}: {
  contributions: Contribution[];
}) {
  const [range, setRange] = useState<ContributionChartRange>("12");
  const points = useMemo(
    () => monthlyContributionSeries(contributions, range),
    [contributions, range],
  );
  const axisDigits = points.every((point) => Number.isInteger(point.amount)) ? 0 : 2;
  const tickInterval = points.length <= 12 ? 0 : Math.ceil(points.length / 6) - 1;
  const periodTotal = points.reduce((sum, point) => sum + point.amount, 0);
  const hasHistory = contributions.some(
    (row) => Number.isFinite(row.amount) && /^\d{4}-\d{2}/.test(row.date ?? ""),
  );

  return (
    <div className="flex h-full flex-col gap-4">
      <div
        role="radiogroup"
        aria-label="Contribution date range"
        className="inline-flex w-fit rounded-lg bg-muted/70 p-1"
      >
        {RANGES.map((item) => {
          const selected = range === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setRange(item.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected
                  ? "bg-card text-foreground ring-1 ring-foreground/10"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {!hasHistory ? (
        <DashboardEmptyState
          size="sm"
          icon={<FileText />}
          title="No contributions yet"
          description="Monthly totals appear here once a contribution is recorded."
          action={{ label: "View contributions", href: "/dashboard/contributions" }}
        />
      ) : points.length === 0 ? (
        <DashboardEmptyState
          size="sm"
          icon={<FileText />}
          title="No contributions in this range"
          description="Choose another range to see earlier payments."
        />
      ) : (
        <>
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-64 w-full"
            aria-label="Monthly contribution amounts in Ghana cedis"
          >
            <BarChart data={points} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="tick"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval={tickInterval}
                minTickGap={16}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={78}
                tickFormatter={(value: number) => formatGhs(Number(value), axisDigits)}
                domain={[0, (dataMax: number) => (dataMax > 0 ? dataMax : 1)]}
              />
              <ChartTooltip
                cursor={{ fill: "color-mix(in srgb, var(--brand-primary) 8%, transparent)" }}
                content={<ContributionTooltip />}
              />
              <Bar
                dataKey="amount"
                fill="var(--brand-primary)"
                radius={[2, 2, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ChartContainer>
          <ul className="sr-only">
            {points.map((point) => (
              <li key={point.key}>
                {point.fullLabel}: {formatGhs(point.amount, 2)}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            {points[0]?.fullLabel} – {points[points.length - 1]?.fullLabel}
            {" · "}
            {formatGhs(periodTotal, 2)} contributed
            {periodTotal === 0 ? ". No contributions in these months." : "."}
          </p>
        </>
      )}
    </div>
  );
}

function ContributionTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload?: MonthlyContributionPoint }[];
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  return (
    <div className="rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-md">
      <p className="font-medium">{point.fullLabel}</p>
      <p className="mt-1 tabular-nums text-muted-foreground">{formatGhs(point.amount, 2)}</p>
    </div>
  );
}
