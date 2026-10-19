"use client";

/**
 * FinancialDashboard
 *
 * A self-contained financial overview component.
 * Uses getDashboardData() to pull domain data + computed metrics,
 * then renders all dashboard sections.
 *
 * Designed for dummy data now; swap getDashboardData() with an API
 * call when the backend is ready - the component code stays the same.
 */

import * as React from "react";
import { Separator } from "@/components/ui/separator";
import {
  selectDashboardMetrics,
  type FinancialDomainData,
} from "@/lib/client-data";

import { useFinancialStore } from "@/store/financialStore";

import { OverviewCards } from "./financial/OverviewCards";
import { NetWorthBreakdown } from "./financial/NetWorthBreakdown";
import { AllocationChart } from "./financial/AllocationChart";
import { CashFlowSection } from "./financial/CashFlowSection";
import { GoalsSection } from "./financial/GoalsSection";
import { RetirementSection } from "./financial/RetirementSection";
import { ProtectionSection } from "./financial/ProtectionSection";
import { DashCard, CardContent, CardHeader, CardTitle } from "./dash-card";
import { PerformanceChart } from "./financial/PerformanceChart";

export function FinancialDashboard() {
  const store = useFinancialStore();

  const financialData: FinancialDomainData = {
    accounts: store.accounts,
    liabilities: store.liabilities,
    propertyAssets: store.propertyAssets.map((p) => ({
      id: p.property_id,
      name: p.name,
      value: p.market_value,
      updatedAt: p.updated_at,
    })),
    portfolioPerformance: store.portfolioPerformance,
    allocation: store.allocation,
    taxProfile: store.taxProfile,
    emergencyFund: store.emergencyFund,
    insurancePolicies: store.insurancePolicies,
    incomeRows: store.incomeRows,
    expenseCategories: store.expenseCategories,
    freshness: store.freshness,
    retirement: store.retirement,
    cashFlowHistory: store.cashFlowHistory,
  };

  const metrics = selectDashboardMetrics(financialData, store.goals);
  const data = financialData;

  return (
    <div className="w-full space-y-6 px-6 py-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Financial Overview
        </h1>
        <p className="text-sm text-muted-foreground">
          Your complete financial picture in one place.
        </p>
      </div>

      {/* 1. Overview KPI cards */}
      <section>
        <OverviewCards
          netWorth={metrics.netWorth}
          cashFlow={metrics.cashFlow}
          retirementOnTrack={metrics.retirement.onTrack}
          freshness={data.freshness}
        />
      </section>

      <Separator />

      {/* 2. Performance + Allocation row */}
      <section>
        <SectionHeading>Portfolio</SectionHeading>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <PerformanceChart
            points={data.portfolioPerformance}
            metrics={metrics.performance}
            freshness={data.freshness}
          />
          <AllocationChart
            allocation={data.allocation}
            freshness={data.freshness}
          />
        </div>
      </section>

      <Separator />

      {/* 3. Net Worth Breakdown + Cash Flow */}
      <section>
        <SectionHeading>Balance Sheet</SectionHeading>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <NetWorthBreakdown
            netWorth={metrics.netWorth}
            freshness={data.freshness}
          />
          <CashFlowSection
            cashFlow={metrics.cashFlow}
            emergencyFund={metrics.emergencyFund}
            incomeRows={data.incomeRows}
            expenseCategories={data.expenseCategories}
            freshness={data.freshness}
          />
        </div>
      </section>

      <Separator />

      {/* 4. Goals */}
      <section>
        <SectionHeading>Goals</SectionHeading>
        <GoalsSection goals={metrics.goals} freshness={data.freshness} />
      </section>

      <Separator />

      {/* 5. Retirement */}
      <section>
        <SectionHeading>Retirement</SectionHeading>
        <RetirementSection
          outputs={metrics.retirement}
          config={data.retirement}
          freshness={data.freshness}
        />
      </section>

      <Separator />

      {/* 6. Protection row */}
      <section>
        <SectionHeading>Protection</SectionHeading>
        <ProtectionSection
          insurance={metrics.insurance}
          freshness={data.freshness}
        />
      </section>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold capitalize text-muted-foreground uppercase tracking-wider mb-3">
      {children}
    </h2>
  );
}
