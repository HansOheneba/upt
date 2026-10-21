"use client";

import { useMemo, useState } from "react";
import { Area, Bar, CartesianGrid, ComposedChart, XAxis, YAxis } from "recharts";
import { FileText } from "lucide-react";
import {
  DashCard,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/dash-card";
import { DashboardEmptyState } from "@/components/dashboard/empty-state";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatGhs } from "@/lib/pension/metrics";
import {
  schemeValueHistory,
  type ValueChartRange,
  type ValueHistoryPoint,
  type ValueHistoryScheme,
} from "@/lib/pension/value-history";
import type { Contribution, Membership, Withdrawal } from "@/lib/pension/types";

const RANGES: { id: ValueChartRange; label: string }[] = [
  { id: "1", label: "1 month" },
  { id: "3", label: "3 months" },
  { id: "6", label: "6 months" },
  { id: "12", label: "12 months" },
  { id: "all", label: "All" },
];

export function ValueHistoryChart({
  title,
  description,
  memberships,
  contributions,
  withdrawals,
  emptyHref = "/dashboard/contributions",
}: {
  title: string;
  description: string;
  memberships: Membership[];
  contributions: Contribution[];
  withdrawals: Withdrawal[];
  emptyHref?: string;
}) {
  const [range, setRange] = useState<ValueChartRange>("12");
  const history = useMemo(
    () => schemeValueHistory(memberships, contributions, withdrawals, range),
    [memberships, contributions, withdrawals, range],
  );
  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    for (const scheme of history.schemes) {
      config[scheme.id] = { label: scheme.name, color: scheme.color };
    }
    return config;
  }, [history.schemes]);
  const rows = useMemo(
    () =>
      history.points.map((point) => {
        const row: Record<string, string | number | null> = {
          tick: point.tick,
          fullLabel: point.fullLabel,
        };
        for (const scheme of history.schemes) {
          row[scheme.id] = point.values[scheme.id];
        }
        return row;
      }),
    [history],
  );
  const hasPrices = history.schemes.length > 0 && rows.length > 0;
  const showDots = rows.length < 2;

  return (
    <DashCard>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction>
          <Select value={range} onValueChange={(value) => setRange(value as ValueChartRange)}>
            <SelectTrigger size="sm" aria-label="Value history range" className="w-full min-w-0 @sm/card-header:w-[8.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {RANGES.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent>
        {!hasPrices ? (
          <DashboardEmptyState
            size="sm"
            icon={<FileText />}
            title="No value history yet"
            description="Each scheme appears here once a contribution has a unit price."
            action={{ label: "View contributions", href: emptyHref }}
          />
        ) : (
          <>
            <ChartContainer
              config={chartConfig}
              className="aspect-auto h-72 w-full"
              aria-label="Pension scheme value over time, in Ghana cedis"
            >
              <ComposedChart
                accessibilityLayer
                data={rows}
                barGap={3}
                barCategoryGap="42%"
                margin={{ top: 8, right: 8, left: 4, bottom: 0 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="tick"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={28}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={36}
                  tickFormatter={compactAxis}
                  domain={[0, (max: number) => (max > 0 ? max : 1)]}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      indicator="dot"
                      labelFormatter={(_value, payload) => {
                        const point = payload?.[0]?.payload as { fullLabel?: string } | undefined;
                        return point?.fullLabel ?? "";
                      }}
                      formatter={(value, name, item) => (
                        <ValueTooltipRow
                          value={value}
                          name={name}
                          color={item.color}
                          schemes={history.schemes}
                        />
                      )}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent className="flex-wrap" />} />
                {history.schemes.map((scheme) => (
                  <Area
                    key={`${scheme.id}-area`}
                    type="natural"
                    dataKey={scheme.id}
                    name={scheme.name}
                    stroke={`var(--color-${scheme.id})`}
                    fill={`var(--color-${scheme.id})`}
                    fillOpacity={0.14}
                    strokeWidth={2}
                    dot={showDots}
                    connectNulls={false}
                    legendType="none"
                    tooltipType="none"
                  />
                ))}
                {history.schemes.map((scheme) => (
                  <Bar
                    key={`${scheme.id}-bar`}
                    dataKey={scheme.id}
                    name={scheme.name}
                    fill={`var(--color-${scheme.id})`}
                    maxBarSize={8}
                    radius={[2, 2, 0, 0]}
                  />
                ))}
              </ComposedChart>
            </ChartContainer>
            <ValueTable points={history.points} schemes={history.schemes} />
          </>
        )}
      </CardContent>
    </DashCard>
  );
}

function compactAxis(value: number): string {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount === 0) return "0";
  if (Math.abs(amount) >= 1000) {
    const thousands = Math.round((amount / 1000) * 10) / 10;
    return `${thousands}k`;
  }
  return String(Math.round(amount));
}

function ValueTooltipRow({
  value,
  name,
  color,
  schemes,
}: {
  value: unknown;
  name: unknown;
  color?: string;
  schemes: ValueHistoryScheme[];
}) {
  if (value == null || value === "") return null;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  const scheme = schemes.find((item) => item.id === name || item.name === name);
  return (
    <>
      <div className="size-2.5 shrink-0 rounded-[2px]" style={{ background: color ?? scheme?.color }} />
      <span className="text-muted-foreground">{scheme?.name ?? String(name)}</span>
      <span className="ml-auto font-mono font-medium tabular-nums text-foreground">
        {formatGhs(amount, 2)}
      </span>
    </>
  );
}

function ValueTable({
  points,
  schemes,
}: {
  points: ValueHistoryPoint[];
  schemes: ValueHistoryScheme[];
}) {
  return (
    <ul className="sr-only">
      {points.map((point) => (
        <li key={point.key}>
          {point.fullLabel}
          {": "}
          {schemes
            .map((scheme) => {
              const value = point.values[scheme.id];
              return `${scheme.name} ${value == null ? "not started" : formatGhs(value, 2)}`;
            })
            .join(", ")}
        </li>
      ))}
    </ul>
  );
}
