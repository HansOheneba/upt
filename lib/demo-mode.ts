/**
 * Demo dashboard mode — preloads sample client data without API calls.
 * Visit /dashboard/demo and any /dashboard/demo/* tab.
 */

import sampleData from "@/lib/sample-client-data.json";
import { brand } from "@/lib/tenant";
import { useFinancialStore, DEFAULT_LEGACY } from "@/store/financialStore";
import { computeProfileCompletionScore } from "@/lib/profile-checklist";
import {
  setSubscriptionData,
  normalizePropertyMortgage,
  setDefaultCurrency,
} from "@/lib/client-data";
import { markPageKeysFetched } from "@/hooks/usePageData";
import type { ProfileStoreSnapshot } from "@/lib/profile-checklist";

export const DEMO_BASE = "/dashboard/demo";
/** Populated UPT dashboard. Every tab under this prefix is the filled account. */
export const UPT_DEMO_BASE = "/demo/dashboard";

function demoBase(): string {
  return brand.id === "upt" ? UPT_DEMO_BASE : DEMO_BASE;
}

let _demoActive = false;

export function isPopulatedDashboardPath(pathname: string): boolean {
  return pathname === UPT_DEMO_BASE || pathname.startsWith(`${UPT_DEMO_BASE}/`);
}

export function isDemoPath(pathname: string): boolean {
  return (
    pathname === DEMO_BASE ||
    pathname.startsWith(`${DEMO_BASE}/`) ||
    isPopulatedDashboardPath(pathname)
  );
}

export function markDemoModeActive(): void {
  _demoActive = true;
}

export function isDemoMode(): boolean {
  if (_demoActive) return true;
  if (typeof window === "undefined") return false;
  return isDemoPath(window.location.pathname);
}

/**
 * Populated dashboard: the /demo/dashboard prefix, the legacy demo path,
 * or the saved demo view. The empty customer account is not included.
 */
export function usesLocalSampleData(): boolean {
  if (isDemoMode()) return true;
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("upt_local_view") === "demo";
  } catch {
    return false;
  }
}

/** Map a demo dashboard path back to its real equivalent. */
export function fromDemoPath(path: string): string {
  if (path === UPT_DEMO_BASE || path === DEMO_BASE) return "/dashboard";
  if (path.startsWith(`${UPT_DEMO_BASE}/`)) {
    return path.replace(UPT_DEMO_BASE, "/dashboard");
  }
  if (path.startsWith(`${DEMO_BASE}/`)) {
    return path.replace(DEMO_BASE, "/dashboard");
  }
  return path;
}

/** Map a real dashboard path to its demo equivalent. */
export function toDemoPath(path: string): string {
  const base = demoBase();
  if (path === "/dashboard") return base;
  if (path.startsWith("/dashboard/")) {
    return path.replace("/dashboard", base);
  }
  return path;
}

type SampleState = (typeof sampleData)["state"];

function buildSnapshot(state: SampleState): ProfileStoreSnapshot {
  return {
    user: state.user,
    incomeRows: state.incomeRows,
    expenseCategories: state.expenseCategories,
    goals: state.goals,
    retirement: state.retirement,
    liabilities: state.liabilities,
    propertyAssets: state.propertyAssets,
    emergencyFund: state.emergencyFund,
    holdings: state.holdings,
    accounts: state.accounts,
    insurancePolicies: state.insurancePolicies,
    riskAssessment: state.riskAssessment ?? null,
  };
}

/** Load the sample client into the Zustand store. Safe to call multiple times. */
export function hydrateDemoStore(): void {
  const state = sampleData.state as SampleState;
  const snapshot = buildSnapshot(state);

  const properties = state.propertyAssets.map((p) => ({
    ...p,
    mortgage: p.mortgage ? normalizePropertyMortgage(p.mortgage) : undefined,
  }));

  useFinancialStore.setState({
    user: state.user,
    riskAssessment: state.riskAssessment ?? null,
    incomeRows: state.incomeRows,
    expenseCategories: state.expenseCategories,
    goals: state.goals,
    goalsMeta: state.goalsMeta,
    holdings: state.holdings,
    accounts: state.accounts,
    propertyAssets: properties,
    liabilities: state.liabilities,
    insurancePolicies: state.insurancePolicies,
    retirement: state.retirement,
    emergencyFund: state.emergencyFund,
    cashFlowHistory: state.cashFlowHistory,
    cashFlowSummary: state.cashFlowSummary ?? null,
    portfolioPerformance: state.portfolioPerformance,
    allocation: state.allocation,
    taxProfile: state.taxProfile,
    freshness: state.freshness,
    legacy: DEFAULT_LEGACY,
    profileCompletionScore: computeProfileCompletionScore(snapshot),
  } as unknown as ReturnType<typeof useFinancialStore.getState>);

  setDefaultCurrency(state.user?.currency ?? "USD");

  setSubscriptionData({
    subscription_status: "active",
    subscription_plan: "pro",
    trial_started_at: null,
    trial_ends_at: null,
    renewed_at: "2026-09-01T00:00:00.000Z",
    is_enterprise: false,
    entitlements: {
      insights_full: true,
      advisor_chat: true,
      concierge_requests: true,
      export_data: true,
      retirement_scenarios: true,
      live_market_data: true,
      portfolio_charts: true,
      cash_flow_projections: true,
      goal_scenarios: true,
    },
    record_limits: {
      goals: 10,
      assets: 20,
      properties: 5,
      liabilities: 10,
      insurance_policies: 10,
    },
  });

  markPageKeysFetched(
    "overview",
    "goals",
    "cash-flow",
    "assets",
    "insurance",
    "properties",
    "liabilities",
    "retirement",
    "profile",
  );
}
