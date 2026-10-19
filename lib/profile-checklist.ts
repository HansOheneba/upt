/** Shared profile checklist used by the setup panel and welcome-back dialog. */

import {
  getRiskBand,
  isCompleteRiskAssessment,
  type RiskAssessmentResult,
} from "@/lib/dashboard-api";
import { brand } from "@/lib/tenant";

export type ProfileChecklistItem = {
  id: string;
  label: string;
  description: string;
  /** What completing this step unlocks (insights, features, accuracy). */
  benefit: string;
  href?: string;
  actionLabel: string;
  completed: boolean;
};

export type ProfileStoreSnapshot = {
  user: {
    display_name?: string | null;
    email?: string | null;
    resident_country?: string | null;
    risk_profile?: string | null;
  } | null;
  incomeRows: unknown[];
  expenseCategories: unknown[];
  goals: unknown[];
  retirement: {
    desiredMonthlyIncome: number;
    retirementAge: number;
    currentInvested: number;
    existingPensionBalance: number;
  };
  liabilities: unknown[];
  propertyAssets: Array<{
    is_active: boolean;
    mortgage?: unknown;
    insurance: unknown[];
  }>;
  emergencyFund: { currentCashBalance: number };
  holdings: unknown[];
  accounts: unknown[];
  insurancePolicies: unknown[];
  /** Latest risk assessment from the API (risk.latest / dashboard.summary). */
  riskAssessment?: RiskAssessmentResult | null;
};

/** API assessment is authoritative; user.risk_profile is a synced mirror. */
export function hasCompletedRiskAssessment(
  store: Pick<ProfileStoreSnapshot, "user" | "riskAssessment">,
): boolean {
  if (isCompleteRiskAssessment(store.riskAssessment)) return true;
  if (getRiskBand(store.riskAssessment)) return true;
  const profile = store.user?.risk_profile;
  return typeof profile === "string" && profile.trim().length > 0;
}

export function buildProfileChecklist(
  store: ProfileStoreSnapshot,
): { basics: ProfileChecklistItem[]; completePicture: ProfileChecklistItem[] } {
  const identityComplete =
    !!store.user?.display_name &&
    !!store.user?.email &&
    !!store.user?.resident_country;
  const hasIncome = store.incomeRows.length > 0;
  const hasExpenses = store.expenseCategories.length > 0;
  const hasGoals = store.goals.length > 0;
  const retirementBasicsComplete =
    store.retirement.desiredMonthlyIncome > 0 &&
    store.retirement.retirementAge > 0;
  const retirementDetailComplete =
    store.retirement.currentInvested > 0 ||
    store.retirement.existingPensionBalance > 0;
  const hasRiskProfile = hasCompletedRiskAssessment(store);
  const hasLiabilities =
    store.liabilities.length > 0 ||
    store.propertyAssets.some((p) => p.is_active && !!p.mortgage);
  const hasEmergencyFund = store.emergencyFund.currentCashBalance > 0;
  const hasAssets = store.holdings.length > 0 || store.accounts.length > 0;
  const hasInsurance =
    store.insurancePolicies.length > 0 ||
    store.propertyAssets.some((p) => p.is_active && p.insurance.length > 0);

  const basics: ProfileChecklistItem[] = [
    {
      id: "identity",
      label: "Tell us about yourself",
      description: "Your name, email, and country.",
      benefit:
        "Personalises currency, tax context, and advisor recommendations for your region.",
      href: "/dashboard/account/profile",
      actionLabel: "Go to profile",
      completed: identityComplete,
    },
    {
      id: "income",
      label: "Add your income",
      description: "The foundation of your financial picture.",
      benefit:
        "Unlocks cash flow charts, monthly surplus, and retirement contribution capacity.",
      href: "/dashboard/cash-flow",
      actionLabel: "Add income",
      completed: hasIncome,
    },
    {
      id: "expenses",
      label: "Add your expenses",
      description: "Understand your monthly cash flow.",
      benefit:
        "Powers burn rate, emergency fund runway, and realistic goal timelines.",
      href: "/dashboard/cash-flow",
      actionLabel: "Add expenses",
      completed: hasExpenses,
    },
    {
      id: "goals",
      label: "Set your first goal",
      description: "Give your money direction.",
      benefit:
        "Enables goal health tracking, monthly contribution planning, and progress insights.",
      href: "/dashboard/goals",
      actionLabel: "Set a goal",
      completed: hasGoals,
    },
    {
      id: "retirement-basics",
      label: "Set your retirement target",
      description: "Desired income and target retirement age.",
      benefit:
        "Activates retirement projections and on-track status on your Overview.",
      href: "/dashboard/retirement",
      actionLabel: "Plan retirement",
      completed: retirementBasicsComplete,
    },
  ];

  const completePicture: ProfileChecklistItem[] = [
    {
      id: "risk-assessment",
      label: "Complete your risk assessment",
      description: "Understand your risk tolerance and investment profile.",
      benefit:
        `Tailors portfolio insights and ${brand.aiAssistantName} advice to your comfort level.`,
      href: "/dashboard/account/settings",
      actionLabel: "Take quiz",
      completed: hasRiskProfile,
    },
    {
      id: "retirement-detail",
      label: "Complete retirement details",
      description: "Current invested amount and pension balance.",
      benefit:
        "Sharpens retirement trajectory charts and projected balance accuracy.",
      href: "/dashboard/retirement",
      actionLabel: "Complete",
      completed: retirementDetailComplete,
    },
    {
      id: "liabilities",
      label: "Add your liabilities",
      description: "Mortgages, loans, and credit cards.",
      benefit:
        "Completes your net worth picture and debt payoff prioritisation insights.",
      href: "/dashboard/liabilities",
      actionLabel: "Add liabilities",
      completed: hasLiabilities,
    },
    {
      id: "emergency-fund",
      label: "Set up emergency fund",
      description: "3-6 months of expenses as a safety net.",
      benefit:
        "Shows runway months on Overview and flags when your buffer is low.",
      href: "/dashboard/cash-flow",
      actionLabel: "Configure",
      completed: hasEmergencyFund,
    },
    {
      id: "assets",
      label: "Add your first asset",
      description: "Stocks, ETFs, crypto, savings.",
      benefit:
        "Unlocks portfolio allocation, performance tracking, and asset-level AI insights.",
      href: "/dashboard/assets",
      actionLabel: "Add assets",
      completed: hasAssets,
    },
    {
      id: "insurance",
      label: "Add an insurance policy",
      description: "Know your coverage, never miss a renewal.",
      benefit:
        "Surfaces coverage gaps, renewal alerts, and protection insights on Overview.",
      href: "/dashboard/insurance",
      actionLabel: "Add policy",
      completed: hasInsurance,
    },
  ];

  return { basics, completePicture };
}

/** Percent complete; derived from checklist items so score and checklist stay in sync. */
export function computeProfileCompletionScore(
  store: ProfileStoreSnapshot,
): number {
  const { basics, completePicture } = buildProfileChecklist(store);
  const items = [...basics, ...completePicture];
  if (items.length === 0) return 0;
  const completed = items.filter((i) => i.completed).length;
  return Math.round((completed / items.length) * 100);
}

export function getIncompleteChecklistItems(
  store: ProfileStoreSnapshot,
): ProfileChecklistItem[] {
  const { basics, completePicture } = buildProfileChecklist(store);
  return [...basics, ...completePicture].filter((i) => !i.completed);
}

export function pickRandomIncompleteItem(
  store: ProfileStoreSnapshot,
): ProfileChecklistItem | null {
  const incomplete = getIncompleteChecklistItems(store);
  if (incomplete.length === 0) return null;
  return incomplete[Math.floor(Math.random() * incomplete.length)]!;
}
