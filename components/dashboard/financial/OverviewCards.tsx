"use client";

import * as React from "react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Droplets,
  BarChart2,
  AlertCircle,
  PiggyBank,
  CheckCircle2,
} from "lucide-react";
import { DashCard, CardContent } from "@/components/dashboard/dash-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  NetWorthBreakdownMetrics,
  CashFlowMetrics,
  SectionFreshness,
} from "@/lib/client-data";
import { DataFreshnessBadge } from "./DataFreshnessBadge";

interface OverviewCardsProps {
  netWorth: NetWorthBreakdownMetrics;
  cashFlow: CashFlowMetrics;
  retirementOnTrack: boolean;
  freshness: SectionFreshness[];
}

function fmt(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function fmtFull(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

interface StatCardProps {
  title: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  accentClass?: string;
  badge?: React.ReactNode;
  freshness?: SectionFreshness[];
  freshnessSection?: string;
}

function StatCard({
  title,
  value,
  sub,
  icon,
  badge,
  accentClass,
  freshness,
  freshnessSection,
}: StatCardProps) {
  return (
    <DashCard className="flex flex-col gap-2 p-5">
      <div className="flex items-start justify-between gap-2">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg",
            accentClass ?? "bg-muted text-muted-foreground",
          )}
        >
          {icon}
        </div>
        {badge}
      </div>
      <CardContent className="p-0 space-y-0.5">
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="text-xl font-semibold tracking-tight">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        {freshness && freshnessSection && (
          <DataFreshnessBadge
            freshness={freshness}
            section={freshnessSection}
            className="mt-1"
          />
        )}
      </CardContent>
    </DashCard>
  );
}

export function OverviewCards({
  netWorth,
  cashFlow,
  retirementOnTrack,
  freshness,
}: OverviewCardsProps) {
  const surplus = cashFlow.monthlySurplus;
  const surplusPositive = surplus >= 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      <StatCard
        title="Total Net Worth"
        value={fmt(netWorth.totalNetWorth)}
        sub={fmtFull(netWorth.totalNetWorth)}
        icon={<Wallet className="h-4 w-4" />}
        accentClass="bg-emerald-100 text-emerald-700"
        freshness={freshness}
        freshnessSection="overview"
      />

      <StatCard
        title="Liquid Net Worth"
        value={fmt(netWorth.liquidNetWorth)}
        sub={`Cash + taxable - ST debt`}
        icon={<Droplets className="h-4 w-4" />}
        accentClass="bg-sky-100 text-sky-700"
        freshness={freshness}
        freshnessSection="overview"
      />

      <StatCard
        title="Invested Assets"
        value={fmt(netWorth.totalInvestments)}
        sub={`Accounts + retirement + crypto`}
        icon={<BarChart2 className="h-4 w-4" />}
        accentClass="bg-violet-100 text-violet-700"
        freshness={freshness}
        freshnessSection="portfolio"
      />

      <StatCard
        title="Total Debt"
        value={fmt(netWorth.totalLiabilities)}
        sub={`Mortgages + ST liabilities`}
        icon={<AlertCircle className="h-4 w-4" />}
        accentClass="bg-rose-100 text-rose-700"
        freshness={freshness}
        freshnessSection="overview"
      />

      <StatCard
        title="Savings Rate"
        value={`${cashFlow.savingsRate.toFixed(1)}%`}
        sub={`${surplusPositive ? "+" : ""}${fmt(surplus)} / mo`}
        icon={
          surplusPositive ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )
        }
        accentClass={
          surplusPositive
            ? "bg-amber-100 text-amber-700"
            : "bg-rose-100 text-rose-700"
        }
        freshness={freshness}
        freshnessSection="cash-flow"
      />

      <StatCard
        title="Retirement"
        value={retirementOnTrack ? "On Track" : "Review Needed"}
        sub="vs desired monthly income"
        icon={
          retirementOnTrack ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <PiggyBank className="h-4 w-4" />
          )
        }
        accentClass={
          retirementOnTrack
            ? "bg-emerald-100 text-emerald-700"
            : "bg-amber-100 text-amber-700"
        }
        badge={
          <Badge
            variant={retirementOnTrack ? "default" : "secondary"}
            className={cn(
              "text-xs",
              retirementOnTrack && "bg-emerald-600 text-white",
            )}
          >
            {retirementOnTrack ? "On Track" : "Gap"}
          </Badge>
        }
        freshness={freshness}
        freshnessSection="retirement"
      />
    </div>
  );
}
