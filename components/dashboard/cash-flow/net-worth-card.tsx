"use client";

import * as React from "react";
import {
  TrendingUp,
  TrendingDown,
  Landmark,
  Home,
  Wallet,
  Shield,
  Package,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  DashCard,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/dash-card";
import { Separator } from "@/components/ui/separator";
import {
  type NetWorthBreakdown,
  assetTypeLabel,
  formatCurrency,
} from "@/lib/client-data";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

// ── Bar component for visual breakdown ──────────────────────────
function BreakdownBar({
  segments,
}: {
  segments: { label: string; value: number; color: string }[];
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total <= 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted/40">
        {segments
          .filter((s) => s.value > 0)
          .map((seg, i) => {
            const pct = (seg.value / total) * 100;
            return (
              <div
                key={i}
                className={cn(
                  "h-full transition-[width] duration-200 ease-out",
                  seg.color,
                )}
                style={{ width: `${pct}%` }}
                title={`${seg.label}: ${formatCurrency(seg.value)} (${pct.toFixed(1)}%)`}
              />
            );
          })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {segments
          .filter((s) => s.value > 0)
          .map((seg, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs">
              <div className={cn("h-2 w-2 rounded-full", seg.color)} />
              <span className="text-muted-foreground">{seg.label}</span>
              <span className="font-medium tabular-nums">
                {((seg.value / total) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}

// ── Stat row ────────────────────────────────────────────────────
function StatRow({
  label,
  value,
  icon: Icon,
  tone,
  sub,
}: {
  label: string;
  value: string;
  icon?: React.ElementType;
  tone?: "good" | "warn" | "danger" | "default";
  sub?: string;
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : tone === "danger"
          ? "text-rose-600 dark:text-rose-400"
          : "";

  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div className="text-right">
        <span className={cn("text-sm font-semibold tabular-nums", toneClass)}>
          {value}
        </span>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────
export function NetWorthCard({ breakdown }: { breakdown: NetWorthBreakdown }) {
  const assetSegments = [
    {
      label: "Investments",
      value: breakdown.investmentAssets,
      color: "bg-sky-500",
    },
    {
      label: "Cash",
      value: breakdown.cashAssets,
      color: "bg-emerald-500",
    },
    {
      label: "Property",
      value: breakdown.propertyValues,
      color: "bg-violet-500",
    },
    {
      label: "Other",
      value: breakdown.totalOtherAssets,
      color: "bg-amber-500",
    },
  ];

  return (
    <DashCard>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Net Worth</CardTitle>
          {breakdown.netWorth >= 0 ? (
            <TrendingUp className="h-4 w-4 text-blue-900" />
          ) : (
            <TrendingDown className="h-4 w-4 text-rose-500" />
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Big number */}
        <div>
          <div
            className={cn(
              "text-3xl font-bold tracking-tight tabular-nums",
              breakdown.netWorth >= 0
                ? "text-blue-950"
                : "text-rose-600 dark:text-rose-400",
            )}
          >
            {formatCurrency(breakdown.netWorth)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Assets minus liabilities across all accounts
          </p>
        </div>

        {/* Asset composition bar */}
        <BreakdownBar segments={assetSegments} />

        <Separator />

        {/* Assets section */}
        <div>
          <div className="mb-2 flex items-center gap-1.5">
            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-xs font-semibold capitalize uppercase tracking-wider text-muted-foreground">
              Assets
            </span>
            <span className="ml-auto text-sm font-semibold tabular-nums">
              {formatCurrency(breakdown.totalAssets)}
            </span>
          </div>

          <div className="space-y-0.5">
            <StatRow
              label="Investments"
              value={formatCurrency(breakdown.investmentAssets)}
              icon={Landmark}
            />
            <StatRow
              label="Cash & Equivalents"
              value={formatCurrency(breakdown.cashAssets)}
              icon={Wallet}
            />
            <StatRow
              label="Property (Market Value)"
              value={formatCurrency(breakdown.propertyValues)}
              icon={Home}
            />
            <StatRow
              label="Other Assets"
              value={formatCurrency(breakdown.totalOtherAssets)}
              icon={Package}
            />
          </div>

          {/* Other assets sub-breakdown */}
          {breakdown.otherAssets.length > 0 && (
            <div className="mt-2 ml-5 space-y-0.5 border-l border-muted/40 pl-3">
              {breakdown.otherAssets.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between py-0.5"
                >
                  <span className="text-xs text-muted-foreground">
                    {a.name}
                  </span>
                  <span className="text-xs font-medium tabular-nums">
                    {formatCurrency(a.value)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Investment sub-breakdown */}
          {breakdown.investmentByType.length > 0 && (
            <div className="mt-2 ml-5 space-y-0.5 border-l border-muted/40 pl-3">
              {breakdown.investmentByType
                .filter((t) => t.type !== "cash")
                .map((t) => (
                  <div
                    key={t.type}
                    className="flex items-center justify-between py-0.5"
                  >
                    <span className="text-xs text-muted-foreground capitalize">
                      {assetTypeLabel(t.type as any)}
                    </span>
                    <span className="text-xs font-medium tabular-nums">
                      {formatCurrency(t.value)}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Liabilities section */}
        <div>
          <div className="mb-2 flex items-center gap-1.5">
            <ArrowDownRight className="h-3.5 w-3.5 text-rose-500" />
            <span className="text-xs font-semibold capitalize uppercase tracking-wider text-muted-foreground">
              Liabilities
            </span>
            <span className="ml-auto text-sm font-semibold tabular-nums text-rose-600 dark:text-rose-400">
              {formatCurrency(breakdown.totalLiabilities)}
            </span>
          </div>

          <div className="space-y-0.5">
            <StatRow
              label="Mortgage Balances"
              value={formatCurrency(breakdown.mortgageBalances)}
              tone="danger"
            />
          </div>

          {/* Property mortgage sub-breakdown */}
          {breakdown.propertyBreakdown.length > 0 && (
            <div className="mt-2 ml-5 space-y-0.5 border-l border-muted/40 pl-3">
              {breakdown.propertyBreakdown
                .filter((p) => p.mortgage > 0)
                .map((p) => (
                  <div
                    key={p.name}
                    className="flex items-center justify-between py-0.5"
                  >
                    <span className="text-xs text-muted-foreground">
                      {p.name}
                    </span>
                    <span className="text-xs font-medium tabular-nums">
                      {formatCurrency(p.mortgage)}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Key ratios */}
        <div>
          <div className="mb-2 text-xs font-semibold capitalize uppercase tracking-wider text-muted-foreground">
            Key Ratios
          </div>
          <div className="space-y-0.5">
            <StatRow
              label="Debt-to-Asset Ratio"
              value={`${breakdown.debtToAssetRatio}%`}
              tone={
                breakdown.debtToAssetRatio > 50
                  ? "danger"
                  : breakdown.debtToAssetRatio > 30
                    ? "warn"
                    : "good"
              }
            />
            <StatRow
              label="Liquidity (months of expenses)"
              value={`${breakdown.liquidityRatio} mo`}
              tone={
                breakdown.liquidityRatio < 3
                  ? "danger"
                  : breakdown.liquidityRatio < 6
                    ? "warn"
                    : "good"
              }
            />
            <StatRow
              label="Insurance-to-Income"
              value={`${breakdown.insuranceToIncomeRatio}%`}
              icon={Shield}
              sub={`${formatCurrency(breakdown.monthlyInsuranceCost)}/mo`}
            />
          </div>
        </div>
      </CardContent>
    </DashCard>
  );
}
