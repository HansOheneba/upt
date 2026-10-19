"use client";

import * as React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  DashCard,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/dash-card";
import type { AllocationSlice, SectionFreshness } from "@/lib/client-data";
import { DataFreshnessBadge } from "./DataFreshnessBadge";

interface AllocationChartProps {
  allocation: AllocationSlice[];
  freshness: SectionFreshness[];
}

const COLORS = [
  "#6366f1",
  "#10b981",
  "#60a5fa",
  "#f59e0b",
  "#f43f5e",
  "#a78bfa",
];

function fmtUSD(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

export function AllocationChart({
  allocation,
  freshness,
}: AllocationChartProps) {
  return (
    <DashCard>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">Asset Allocation</CardTitle>
          <DataFreshnessBadge freshness={freshness} section="portfolio" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={allocation}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={72}
                paddingAngle={2}
              >
                {allocation.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any, name: any) => [
                  typeof value === "number" ? fmtUSD(value) : "-",
                  name ?? "",
                ]}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span className="text-xs text-muted-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-2">
          {allocation.map((slice, idx) => (
            <div
              key={slice.label}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: COLORS[idx % COLORS.length] }}
                />
                <span className="text-muted-foreground">{slice.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium">{fmtUSD(slice.value)}</span>
                <span className="text-xs text-muted-foreground w-10 text-right">
                  {slice.percentage}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </DashCard>
  );
}
