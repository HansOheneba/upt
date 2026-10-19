"use client";

import * as React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  DashCard,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/dash-card";

const PRIMARY = "var(--brand-primary)";
const ACCENT = "var(--brand-accent)";
const GREEN = "rgb(139, 167, 141)";

export type ProgressMetric = {
  label: string;
  before: string;
  after: string;
  direction: "up" | "down" | "flat";
  /** Whether "up" is good (e.g. net worth) or "down" is good (e.g. debt) */
  positiveDirection: "up" | "down";
  changeLabel: string;
};

type Props = {
  sinceDate: string;
  metrics: ProgressMetric[];
};

function DirectionIcon({
  direction,
}: {
  direction: ProgressMetric["direction"];
}) {
  if (direction === "up") return <TrendingUp className="h-4 w-4" />;
  if (direction === "down") return <TrendingDown className="h-4 w-4" />;
  return <Minus className="h-4 w-4" />;
}

function metricColor(
  direction: ProgressMetric["direction"],
  positiveDirection: ProgressMetric["positiveDirection"],
): string {
  if (direction === "flat") return "var(--muted-foreground)";
  const isPositive = direction === positiveDirection;
  if (isPositive) return GREEN;
  return ACCENT;
}

export function ProgressSinceSessionCard({ sinceDate, metrics }: Props) {
  return (
    <DashCard className="flex-col justify-around">
      <CardHeader>
        <CardTitle className="text-base" style={{ color: PRIMARY }}>
          Progress since last session
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Key financial metrics since your session on {sinceDate}.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {metrics.map((m) => {
            const color = metricColor(m.direction, m.positiveDirection);
            return (
              <div
                key={m.label}
                className="rounded-xl border p-4 bg-background/60 space-y-2"
              >
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {m.label}
                </p>
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <p className="text-xl font-semibold text-foreground">
                      {m.after}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      was {m.before}
                    </p>
                  </div>
                  <div
                    className="flex items-center gap-1 text-sm font-medium rounded-full px-2 py-1"
                    style={{
                      color,
                      backgroundColor: `${color}18`,
                    }}
                  >
                    <DirectionIcon direction={m.direction} />
                    <span className="text-xs">{m.changeLabel}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </DashCard>
  );
}
