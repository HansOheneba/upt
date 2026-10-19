import { countryDisplayName } from "@/lib/country-geo";
import { isDemoDashboardPath } from "@/lib/session-expired";

// ============================================================================
// PRIMITIVE TYPES
// ============================================================================

export type ISODateString = string;
export type ISOMonthString = string;
export type ISODateTimeString = string;
export type CurrencyCode = string;

// ============================================================================
// ACCOUNT & LIABILITY TYPES
// ============================================================================

export type AccountType =
  | "taxable"
  | "retirement"
  | "cash"
  | "crypto"
  | "other";

export interface Account {
  id: string;
  name: string;
  institution: string;
  type: AccountType;
  balance: number;
  currency: CurrencyCode;
  updatedAt: ISODateTimeString;
}

export type LiabilityType =
  | "mortgage"
  | "credit_card"
  | "personal_loan"
  | "auto_loan"
  | "student_loan"
  | "other";

export interface Liability {
  id: string;
  name: string;
  /** Lender or financial provider (e.g. Barclays, Standard Bank). */
  lender?: string;
  type: LiabilityType;
  balance: number;
  interestRatePct: number;
  minPaymentMonthly: number;
  dueDay?: number;
  /** Original principal at origination. */
  originalLoanAmount?: number;
  /** Expected full payoff date. */
  expectedPayoffDate?: string;
  updatedAt: ISODateTimeString;
}

export interface PropertyAsset {
  id: string;
  name: string;
  value: number;
  mortgageLiabilityId?: string;
  updatedAt: ISODateTimeString;
}

export interface PerformancePoint {
  month: ISOMonthString;
  value: number;
  contributions: number;
}

export interface AllocationSlice {
  label: string;
  percentage: number;
  value: number;
}

export type FilingStatus = "single" | "married" | "other";

export interface TaxProfile {
  effectiveTaxRatePct: number;
  marginalTaxRatePct: number;
  filingStatus: FilingStatus;
  stateOrRegion?: string;
  updatedAt: ISODateTimeString;
}

export interface EmergencyFundConfig {
  targetMonths: number;
  currentCashBalance: number;
  storageLocation?: string;
  includeAccountIds?: string[];
  updatedAt: ISODateTimeString;
  /** Server-computed values - preferred over client-side math when present */
  computed?: {
    monthlyBaseline: number;
    targetAmount: number;
    runwayMonths: number;
    fundedPct: number;
    shortfall: number;
  };
}

// ============================================================================
// INSURANCE TYPES — single unified type for all policies
// ============================================================================

export type InsuranceCategory =
  | "life"
  | "health"
  | "auto"
  | "home"
  | "disability"
  | "umbrella"
  | "liability"
  | "travel"
  | "pet"
  | "other";

export const INSURANCE_CATEGORIES: {
  value: InsuranceCategory;
  label: string;
  description: string;
}[] = [
  {
    value: "life",
    label: "Life",
    description: "Term, whole-life, or universal life policies",
  },
  {
    value: "health",
    label: "Health",
    description: "Medical, dental, and vision coverage",
  },
  {
    value: "auto",
    label: "Auto",
    description: "Vehicle liability, collision, and comprehensive",
  },
  {
    value: "home",
    label: "Home",
    description: "Homeowners, landlord, flood, and property policies",
  },
  {
    value: "disability",
    label: "Disability",
    description: "Short-term and long-term disability income",
  },
  {
    value: "umbrella",
    label: "Umbrella",
    description: "Excess liability policies",
  },
  {
    value: "liability",
    label: "Liability",
    description: "Personal liability coverage",
  },
  {
    value: "travel",
    label: "Travel",
    description: "Trip cancellation, medical abroad, baggage",
  },
  {
    value: "pet",
    label: "Pet",
    description: "Veterinary and accident coverage for pets",
  },
  { value: "other", label: "Other", description: "Any other insurance type" },
];

export type InsurancePolicy = {
  policy_id: string;
  user_id: string;
  category: InsuranceCategory;
  provider: string;
  name: string;
  policy_number: string;
  coverage_amount: number;
  premium_monthly: number;
  deductible: number;
  start_date: string;
  renewal_date: string;
  auto_renew: boolean;
  beneficiary?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type InsuranceRenewalStatus = "expired" | "expiring_soon" | "ok";

export interface InsuranceRenewalInfo {
  policy_id: string;
  name: string;
  category: InsuranceCategory;
  renewalDate: ISODateString;
  daysUntilRenewal: number;
  renewalStatus: InsuranceRenewalStatus;
  premiumMonthly: number;
  coverageAmount: number;
}

export interface InsuranceSummaryMetrics {
  totalPolicies: number;
  totalMonthlyPremium: number;
  totalAnnualPremium: number;
  totalCoverage: number;
  expiredCount: number;
  expiringSoonCount: number;
  premiumToIncomeRatioPct: number;
  renewals: InsuranceRenewalInfo[];
}

export function insuranceCategoryLabel(cat: InsuranceCategory): string {
  return INSURANCE_CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
}

export function insuranceCategoryDescription(cat: InsuranceCategory): string {
  return INSURANCE_CATEGORIES.find((c) => c.value === cat)?.description ?? "";
}

// ============================================================================
// CASH FLOW TYPES
// ============================================================================

export interface CashFlowRow {
  id: string;
  name: string;
  amount: number;
  category?: string;
  isRecurring?: boolean;
  recurringType?: RecurringType;
  recurringMonths?: number;
  startDate?: string;
  endDate?: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  amount: number;
  category?: string;
  essential: boolean;
  isRecurring?: boolean;
  recurringType?: RecurringType;
  recurringMonths?: number;
  startDate?: string;
  endDate?: string;
}

export type MoneyRow = {
  id: string;
  name: string;
  amount: number;
};

export type RecurringType = "monthly" | "one-time";

export interface CashFlowEntryDraft {
  name: string;
  amount: string;
  recurringType: RecurringType;
  startDate: string;
  endDate: string; // empty string = no end date (ongoing / one-time)
  category: string;
}

export interface CashFlowSettings {
  emergencyFundMonths: number;
  currentCashBalance: number;
}

export interface CashFlowPoint {
  month: ISOMonthString;
  income: number;
  expenses: number;
  surplus?: number;
  source?: "statement" | "plan";
  statementIncome?: number;
  statementExpenses?: number;
}

/**
 * Returns the effective projected monthly amount for a given ISO month
 * (YYYY-MM) from a list of income/expense rows, respecting recurring type.
 * - "one-time" or isRecurring===false: only counts for the row's startDate month.
 * - "monthly" (or legacy "forever") or no recurring info: counts from startDate forward.
 */
export function projectMonthlyAmount(
  rows: Array<{
    amount: number;
    isRecurring?: boolean;
    recurringType?: RecurringType;
    recurringMonths?: number;
    startDate?: string;
    endDate?: string;
  }>,
  isoMonth: string,
): number {
  return rows
    .filter((row) => {
      if (row.isRecurring === false || row.recurringType === "one-time") {
        if (!row.startDate) return false;
        return row.startDate.slice(0, 7) === isoMonth;
      }
      // "monthly" (or legacy "forever") - don't project before the row's start date
      if (row.startDate && isoMonth < row.startDate.slice(0, 7)) return false;
      // Stop projecting after the row's end date
      if (row.endDate && isoMonth > row.endDate.slice(0, 7)) return false;
      return true;
    })
    .reduce((s, r) => s + r.amount, 0);
}

// ============================================================================
// OTHER DOMAIN TYPES
// ============================================================================

export interface SectionFreshness {
  section: string;
  updatedAt: ISODateTimeString;
}

export interface RetirementConfig {
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  currentInvested: number;
  monthlySavings: number;
  existingPensionBalance: number;
  monthlyPensionContribution: number;
  expectedReturnPct: number;
  inflationPct: number;
  safeWithdrawalRatePct: number;
  desiredMonthlyIncome: number;
  /** Where retirement savings are primarily held (401k, IRA, cash, etc.) */
  storageLocation?: string;
}

// ============================================================================
// DASHBOARD METRIC TYPES
// ============================================================================

export interface NetWorthBreakdownMetrics {
  totalInvestments: number;
  totalCash: number;
  totalPropertyValue: number;
  totalOtherAssets: number;
  totalAssets: number;
  totalMortgages: number;
  totalShortTermDebt: number;
  totalLiabilities: number;
  totalNetWorth: number;
  liquidNetWorth: number;
}

export interface CashFlowMetrics {
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlySurplus: number;
  savingsRate: number;
  essentialExpenses: number;
  discretionaryExpenses: number;
  afterTaxMonthlyIncome: number;
  estimatedAnnualTaxes: number;
}

export interface EmergencyFundMetrics {
  currentBalance: number;
  targetBalance: number;
  runwayMonths: number;
  targetMonths: number;
  funded: boolean;
  shortfallOrSurplus: number;
}

export interface GoalMetrics {
  id: string;
  title: string;
  progressPct: number;
  requiredMonthly: number;
  onTrack: boolean;
  yearsRemaining: number;
  current: number;
  target: number;
  completed: boolean;
  completedDate?: string;
}

export interface RetirementOutputs {
  yearsToRetirement: number;
  projectedBalanceAtRetirement: number;
  sustainableAnnualIncome: number;
  sustainableMonthlyIncome: number;
  inflationAdjustedSustainableMonthlyIncome: number;
  incomeGap: number;
  onTrack: boolean;
}

export interface PerformanceMetrics {
  ytdReturnPct: number | null;
  oneYearReturnPct: number | null;
  totalContributions: number;
  totalGrowth: number;
}

export interface LiquidityMetrics {
  liquidAssets: number;
  shortTermLiabilities: number;
  liquidNetWorth: number;
  liquidityRatio: number;
}

export interface DashboardMetrics {
  netWorth: NetWorthBreakdownMetrics;
  cashFlow: CashFlowMetrics;
  emergencyFund: EmergencyFundMetrics;
  goals: GoalMetrics[];
  retirement: RetirementOutputs;
  performance: PerformanceMetrics;
  liquidity: LiquidityMetrics;
  insurance: InsuranceSummaryMetrics;
}

export interface FinancialDomainData {
  accounts: Account[];
  liabilities: Liability[];
  propertyAssets: PropertyAsset[];
  portfolioPerformance: PerformancePoint[];
  allocation: AllocationSlice[];
  taxProfile: TaxProfile;
  emergencyFund: EmergencyFundConfig;
  insurancePolicies: InsurancePolicy[];
  incomeRows: CashFlowRow[];
  expenseCategories: ExpenseCategory[];
  freshness: SectionFreshness[];
  retirement: RetirementConfig;
  cashFlowHistory: CashFlowPoint[];
}

// ============================================================================
// STORAGE UTILITIES
// ============================================================================

export type SubscriptionStatus = "none" | "trialing" | "active";

export interface SubscriptionEntitlements {
  insights_full: boolean;
  advisor_chat: boolean;
  concierge_requests: boolean;
  export_data: boolean;
  retirement_scenarios: boolean;
  live_market_data: boolean;
  portfolio_charts: boolean;
  cash_flow_projections: boolean;
  goal_scenarios: boolean;
}

export interface SubscriptionRecordLimits {
  /** null means unlimited */
  goals: number | null;
  assets: number | null;
  properties: number | null;
  liabilities: number | null;
  insurance_policies: number | null;
}

export const DEFAULT_ENTITLEMENTS: SubscriptionEntitlements = {
  insights_full: false,
  advisor_chat: false,
  concierge_requests: false,
  export_data: false,
  retirement_scenarios: false,
  live_market_data: false,
  portfolio_charts: false,
  cash_flow_projections: false,
  goal_scenarios: false,
};

export const DEFAULT_RECORD_LIMITS: SubscriptionRecordLimits = {
  goals: 3,
  assets: 5,
  properties: 1,
  liabilities: 5,
  insurance_policies: 2,
};

export type AuthState = { loggedIn: boolean; email: string | null };
export type SubState = {
  status: SubscriptionStatus;
  plan: string | null;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  isEnterprise: boolean;
  entitlements: SubscriptionEntitlements;
  recordLimits: SubscriptionRecordLimits;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
};

function mergeLimit(value: number | null | undefined): number | null {
  return value === undefined ? null : value;
}

function mergeRecordLimits(
  raw?: Partial<SubscriptionRecordLimits> & { holdings?: number | null },
): SubscriptionRecordLimits {
  const assets = raw?.assets !== undefined ? raw.assets : raw?.holdings;
  return {
    goals: mergeLimit(raw?.goals),
    assets: mergeLimit(assets),
    properties: mergeLimit(raw?.properties),
    liabilities: mergeLimit(raw?.liabilities),
    insurance_policies: mergeLimit(raw?.insurance_policies),
  };
}

const AUTH_EMAIL_KEY = "auth_email";
const AUTH_LOGGED_IN_KEY = "auth_logged_in";
const SUB_STATUS_KEY = "sub_status";
const TRIAL_STARTED_AT_KEY = "trial_started_at";
const SUB_DATA_KEY = "sub_data_v2";

function safeGetItem(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* noop */
  }
}

function safeRemoveItem(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* noop */
  }
}

export function getAuth(): AuthState {
  return {
    loggedIn: safeGetItem(AUTH_LOGGED_IN_KEY) === "true",
    email: safeGetItem(AUTH_EMAIL_KEY) ?? null,
  };
}

export function setAuth(email: string): void {
  safeSetItem(AUTH_EMAIL_KEY, email);
  safeSetItem(AUTH_LOGGED_IN_KEY, "true");
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("celerey:auth-updated"));
  }
}

export function clearAuth(): void {
  safeRemoveItem(AUTH_EMAIL_KEY);
  safeSetItem(AUTH_LOGGED_IN_KEY, "false");
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("celerey:auth-updated"));
  }
}

export function getSubscription(): SubState {
  // Try new format first (written by setSubscriptionData)
  const raw = safeGetItem(SUB_DATA_KEY);
  if (raw) {
    try {
      const d = JSON.parse(raw) as {
        subscription_status?: string;
        subscription_plan?: string;
        trial_started_at?: string;
        trial_ends_at?: string;
        is_enterprise?: boolean;
        entitlements?: Partial<SubscriptionEntitlements>;
        record_limits?: Partial<SubscriptionRecordLimits> & {
          holdings?: number | null;
        };
        cancel_at_period_end?: boolean;
        current_period_end?: string | null;
      };
      const statusRaw = d.subscription_status ?? "none";
      const status: SubscriptionStatus =
        statusRaw === "trialing" || statusRaw === "active" ? statusRaw : "none";
      return {
        status,
        plan: d.subscription_plan ?? null,
        trialStartedAt: d.trial_started_at ?? null,
        trialEndsAt: d.trial_ends_at ?? null,
        isEnterprise: d.is_enterprise ?? false,
        entitlements: { ...DEFAULT_ENTITLEMENTS, ...d.entitlements },
        recordLimits: mergeRecordLimits(d.record_limits),
        cancelAtPeriodEnd: d.cancel_at_period_end ?? false,
        currentPeriodEnd: d.current_period_end ?? null,
      };
    } catch {
      /* fall through to legacy */
    }
  }
  // Legacy fallback
  const statusRaw = safeGetItem(SUB_STATUS_KEY) ?? "none";
  const status =
    statusRaw === "trialing" || statusRaw === "active"
      ? (statusRaw as SubscriptionStatus)
      : "none";
  return {
    status,
    plan: null,
    trialStartedAt: safeGetItem(TRIAL_STARTED_AT_KEY) ?? null,
    trialEndsAt: null,
    isEnterprise: false,
    entitlements: DEFAULT_ENTITLEMENTS,
    recordLimits: {
      goals: null,
      assets: null,
      properties: null,
      liabilities: null,
      insurance_policies: null,
    },
    cancelAtPeriodEnd: false,
    currentPeriodEnd: null,
  };
}

export function setSubscription(status: SubscriptionStatus): void {
  safeSetItem(SUB_STATUS_KEY, status);
  if (status !== "trialing") safeRemoveItem(TRIAL_STARTED_AT_KEY);
}

/**
 * Persists the full subscription payload returned by subscription.find / subscription.upgrade.
 * Replaces the legacy setSubscription(status) approach.
 */
export function setSubscriptionData(data: {
  subscription_status: string;
  subscription_plan?: string | null;
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
  renewed_at?: string | null;
  is_enterprise?: boolean;
  entitlements?: Partial<SubscriptionEntitlements>;
  record_limits?: Partial<SubscriptionRecordLimits> & {
    holdings?: number | null;
  };
  cancel_at_period_end?: boolean;
  current_period_end?: string | null;
}): void {
  safeSetItem(SUB_DATA_KEY, JSON.stringify(data));
  // Keep legacy key in sync
  const status =
    data.subscription_status === "trialing" ||
    data.subscription_status === "active"
      ? data.subscription_status
      : "none";
  safeSetItem(SUB_STATUS_KEY, status);
  // Notify any listeners (e.g. useClientGate) that subscription state changed
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("celerey:sub-updated"));
  }
}

export function setTrialStartedAt(iso: string): void {
  safeSetItem(TRIAL_STARTED_AT_KEY, iso);
}

export function clearSubscription(): void {
  safeSetItem(SUB_STATUS_KEY, "none");
  safeRemoveItem(TRIAL_STARTED_AT_KEY);
  safeRemoveItem(SUB_DATA_KEY);
}

// ── Enterprise user-type helpers ──────────────────────────────────────────────

const USER_TYPE_KEY = "user_type_v1";

/**
 * Returns the stored user type. Defaults to "regular".
 * Used by paywall guards before the Zustand store is hydrated.
 */
export function getUserType(): "regular" | "enterprise" {
  return safeGetItem(USER_TYPE_KEY) === "enterprise" ? "enterprise" : "regular";
}

/** Persists the user type to localStorage — call after login / profile fetch. */
export function setUserType(type: "regular" | "enterprise"): void {
  safeSetItem(USER_TYPE_KEY, type);
}

export function clearUserType(): void {
  safeRemoveItem(USER_TYPE_KEY);
}

const ONBOARDED_KEY = "onboarded_v1";

/** Returns true if the user has completed the onboarding flow. */
export function isOnboarded(): boolean {
  return safeGetItem(ONBOARDED_KEY) === "true";
}

/** Marks the user as having completed onboarding. */
export function setOnboarded(): void {
  safeSetItem(ONBOARDED_KEY, "true");
}

export function clearOnboarded(): void {
  safeRemoveItem(ONBOARDED_KEY);
}

// ── User profile (returned by onboarding.create-user) ─────────────────────────

const USER_PROFILE_KEY = "user_profile_v1";

export interface UserProfile {
  user_id: string;
  account_mode: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone_number: string;
  resident_country: string;
  resident_state?: string;
  resident_city: string;
  date_of_birth: string | null;
  gender: string | null;
  currency: string;
  prefix: string | null;
  occupation: string | null;
  marital_status: string | null;
  user_type: string;
  is_active: boolean;
}

/** Persists the user profile returned by the API to localStorage. */
export function setUserProfile(profile: UserProfile): void {
  safeSetItem(USER_PROFILE_KEY, JSON.stringify(profile));
}

/** Returns the stored user profile, or null if not yet set. */
export function getUserProfile(): UserProfile | null {
  const raw = safeGetItem(USER_PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export function clearUserProfile(): void {
  safeRemoveItem(USER_PROFILE_KEY);
}

const NETWORTH_HISTORY_KEY = "networth_history_v1";

/**
 * Wipes every piece of user-scoped local state — auth, subscription, onboarding flag,
 * cached profile, persisted Zustand stores, snapshots, etc.
 *
 * Use this whenever a new auth session is being established on a browser that may
 * still hold another user's data (signup/login on a shared PC, after a sign-out
 * that didn't clear everything, etc.) to prevent cross-account leakage.
 */
export function clearAllUserData(): void {
  if (typeof window === "undefined") return;

  // Auth + subscription + onboarding + profile
  clearAuth();
  clearSubscription();
  clearUserType();
  clearOnboarded();
  clearUserProfile();

  // Per-feature caches keyed by string
  safeRemoveItem(NETWORTH_HISTORY_KEY);

  // Persisted Zustand stores (financial dashboard + onboarding wizard)
  safeRemoveItem("financial-store-v1");
  safeRemoveItem("celerey-onboarding-v1");

  // Notify subscription listeners that state was cleared
  try {
    window.dispatchEvent(new CustomEvent("celerey:sub-updated"));
  } catch {
    /* noop */
  }
}

export type NetWorthHistoryItem = {
  ts: string;
  netWorth: number;
  breakdown?: unknown;
  percentChange?: number | null;
  trend?: "up" | "down" | "flat";
  previousNetWorth?: number | null;
};

export function getNetWorthHistory(): NetWorthHistoryItem[] {
  const raw = safeGetItem(NETWORTH_HISTORY_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as NetWorthHistoryItem[]) : [];
  } catch {
    return [];
  }
}

export function pushNetWorthSnapshot(
  item: NetWorthHistoryItem,
  maxEntries = 500,
) {
  const list = getNetWorthHistory();
  list.push(item);
  const trimmed = list.slice(Math.max(0, list.length - maxEntries));
  try {
    safeSetItem(NETWORTH_HISTORY_KEY, JSON.stringify(trimmed));
  } catch {
    /* noop */
  }
}

// ============================================================================
// ENTITLEMENTS
// ============================================================================

export type FeatureKey = "proInsights" | "exportData" | "advisorChat";

export function canAccessFeature(sub: SubState, feature: FeatureKey): boolean {
  if (typeof window !== "undefined" && isDemoDashboardPath()) return true;
  if (sub.isEnterprise) return true;
  // Full paid plan — all features unlocked
  if (sub.status === "active") return true;
  // Trial — check server-authoritative entitlements
  if (sub.status === "trialing") {
    switch (feature) {
      case "proInsights":
        return sub.entitlements.insights_full;
      case "exportData":
        return sub.entitlements.export_data;
      case "advisorChat":
        return sub.entitlements.advisor_chat;
    }
  }
  return false;
}

// ============================================================================
// USER PROFILE
// ============================================================================

export type User = {
  user_id: string;
  /** Nullable — only set for solo accounts */
  first_name?: string;
  /** Nullable — only set for solo accounts */
  last_name?: string;
  /**
   * Single display name used throughout the UI.
   * For solo accounts: derived as first_name + last_name.
   * For partner/family accounts: the household name entered directly.
   */
  display_name?: string;
  email: string;
  phone_number?: string;
  resident_country: string;
  resident_state?: string;
  city?: string;
  citizenships?: string[];
  /** Nullable — only collected for solo accounts */
  date_of_birth?: string;
  user_type: "regular" | "enterprise";
  currency: string;
  /** Investments and property values when stored in a different currency from day-to-day base. */
  investment_currency?: string;
  preferred_contact?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  occupation?: string;
  marital_status?: "single" | "married" | "divorced" | "widowed";
  /** e.g. "Mr", "Mrs", "Dr" */
  prefix?: string;
  /** "M", "F", "O", "X" */
  gender?: string;
  account_mode?: "solo" | "partner" | "family";
  risk_profile?: "conservative" | "moderate" | "aggressive";
  dependents?: number;
  bio?: string;
  /** Present only for enterprise users — populated by the backend on seat provisioning. */
  enterprise_info?: {
    company_name: string;
    company_id: string;
    /** ISO datetime when the company granted this seat. */
    seat_granted_at: string;
    /** Admin or system that provisioned the seat. */
    seat_granted_by?: string;
  };
};

export const mockUser: User = {
  user_id: "u-1",
  first_name: "John",
  last_name: "Doe",
  display_name: "John Doe",
  email: "john@celerey.co",
  phone_number: "+1 (555) 012-9090",
  resident_country: "United States",
  city: "New York",
  citizenships: ["United States"],
  date_of_birth: "1982-06-14",
  user_type: "regular",
  currency: "USD",
  preferred_contact: "Email",
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  occupation: "Software Engineer",
  marital_status: "married",
  account_mode: "solo",
  risk_profile: "moderate",
  dependents: 2,
  bio: "A tech enthusiast and family man focused on building wealth for the future.",
};

export function calculateAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate()))
    age--;
  return age;
}

/**
 * Returns the user's display name.
 * Prefers display_name (works for all account modes);
 * falls back to first_name + last_name for legacy solo records.
 */
export function getUserFullName(user: User = mockUser): string {
  if (user.display_name) return user.display_name;
  return [user.first_name, user.last_name].filter(Boolean).join(" ") || "User";
}

export function getUserAge(user: User = mockUser): number {
  if (!user.date_of_birth) return 0;
  return calculateAge(user.date_of_birth);
}

// ============================================================================
// ASSET HOLDINGS & VALUATIONS
// ============================================================================

export type ValuationMethod = "manual" | "market" | "auto_calculated";

export type AssetType =
  | "stock"
  | "bond"
  | "etf"
  | "mutual_fund"
  | "crypto"
  | "commodity"
  | "equity_compensation"
  | "cash"
  | "alternative"
  | "other";

export const ASSET_TYPE_OPTIONS: { value: AssetType; label: string }[] = [
  { value: "stock", label: "Stock" },
  { value: "bond", label: "Bond" },
  { value: "etf", label: "ETF" },
  { value: "mutual_fund", label: "Mutual Fund" },
  { value: "crypto", label: "Crypto" },
  { value: "commodity", label: "Commodity" },
  { value: "equity_compensation", label: "Equity & Options" },
  { value: "cash", label: "Cash & Equivalents" },
  { value: "alternative", label: "Alternative" },
  { value: "other", label: "Other" },
];

/** Employer equity comp variants (form UX; stored via name + standard holding fields). */
export type EquityCompKind = "rsu" | "iso" | "nso" | "espp" | "other";

export const EQUITY_COMP_KIND_OPTIONS: {
  value: EquityCompKind;
  label: string;
  description: string;
}[] = [
  {
    value: "rsu",
    label: "RSU",
    description: "Restricted stock units that vest into company shares",
  },
  {
    value: "iso",
    label: "ISO",
    description: "Incentive stock options (often from US employers)",
  },
  {
    value: "nso",
    label: "NSO / NQSO",
    description: "Non-qualified stock options",
  },
  {
    value: "espp",
    label: "ESPP",
    description: "Employee stock purchase plan shares",
  },
  {
    value: "other",
    label: "Other",
    description: "Restricted stock, SARs, or other employer equity",
  },
];

export type AssetHolding = {
  holding_id: string;
  user_id: string;
  asset_type: AssetType;
  /** Derived server-side — never set by the client. */
  valuation_method: ValuationMethod;
  /**
   * Unified cost basis:
   * - stocks / etf / crypto / mutual_fund: total amount paid
   * - bonds: face (par) value
   * - cash: opening principal balance
   * - alternative / other: total amount invested
   */
  cost_basis: number;
  /** Legacy alias for cost_basis kept for client-side compatibility. */
  initial_value?: number;
  /** Total amount the user paid / invested (used for non-market holdings). */
  amount_invested?: number;
  initial_value_date: string;
  symbol?: string;
  name: string;
  quantity?: number;
  /**
   * Current market / account value.
   * - "market": computed from live price × quantity
   * - "auto_calculated": computed server-side (bond accrual / cash APY)
   * - "manual": user-supplied; stale when last_updated is > 30 days ago
   */
  current_value?: number;
  /** Annual interest rate % — bonds and interest-bearing cash. */
  coupon_rate?: number;
  /** ISO date string — bonds. */
  maturity_date?: string;
  /** ISO timestamp — present for manual holdings; used for stale-data nudge. */
  last_updated?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AssetValuation = {
  valuation_id: string;
  holding_id: string;
  value: number;
  as_of: string;
  source: "manual" | "market";
  created_at: string;
};

export function latestValuation(
  holdingId: string,
  valuations: AssetValuation[],
): AssetValuation | undefined {
  return valuations
    .filter((v) => v.holding_id === holdingId)
    .sort(
      (a, b) => new Date(b.as_of).getTime() - new Date(a.as_of).getTime(),
    )[0];
}

export function currentValue(
  holding: AssetHolding,
  valuations: AssetValuation[],
): number {
  // Prefer explicitly entered current value
  if (holding.current_value != null && Number.isFinite(holding.current_value))
    return holding.current_value;
  const latest = latestValuation(holding.holding_id, valuations);
  if (latest && Number.isFinite(latest.value)) return latest.value;
  const basis = holding.cost_basis;
  return Number.isFinite(basis) ? basis : 0;
}

export function gainLoss(
  holding: AssetHolding,
  valuations: AssetValuation[],
): { amount: number; pct: number } {
  const cv = currentValue(holding, valuations);
  const cost = holding.cost_basis;
  const amount = cv - cost;
  const pct = cost > 0 ? (amount / cost) * 100 : 0;
  return { amount, pct };
}

export function assetTypeLabel(type: AssetType): string {
  return ASSET_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

export function supportsMarket(type: AssetType, symbol?: string): boolean {
  if (["stock", "etf", "crypto", "commodity"].includes(type)) return true;
  if (type === "mutual_fund") return !!symbol;
  return false;
}

export type SymbolInfo = { symbol: string; name: string; assetType: AssetType };

export const POPULAR_SYMBOLS: SymbolInfo[] = [
  { symbol: "AAPL", name: "Apple Inc.", assetType: "stock" },
  { symbol: "MSFT", name: "Microsoft Corp.", assetType: "stock" },
  { symbol: "GOOGL", name: "Alphabet Inc.", assetType: "stock" },
  { symbol: "AMZN", name: "Amazon.com Inc.", assetType: "stock" },
  { symbol: "NVDA", name: "NVIDIA Corp.", assetType: "stock" },
  { symbol: "META", name: "Meta Platforms Inc.", assetType: "stock" },
  { symbol: "TSLA", name: "Tesla Inc.", assetType: "stock" },
  { symbol: "JPM", name: "JPMorgan Chase & Co.", assetType: "stock" },
  { symbol: "V", name: "Visa Inc.", assetType: "stock" },
  { symbol: "JNJ", name: "Johnson & Johnson", assetType: "stock" },
  { symbol: "WMT", name: "Walmart Inc.", assetType: "stock" },
  { symbol: "PG", name: "Procter & Gamble", assetType: "stock" },
  { symbol: "MA", name: "Mastercard Inc.", assetType: "stock" },
  { symbol: "UNH", name: "UnitedHealth Group", assetType: "stock" },
  { symbol: "KO", name: "Coca-Cola Co.", assetType: "stock" },
  { symbol: "DIS", name: "Walt Disney Co.", assetType: "stock" },
  { symbol: "NFLX", name: "Netflix Inc.", assetType: "stock" },
  { symbol: "AMD", name: "Advanced Micro Devices", assetType: "stock" },
  { symbol: "PYPL", name: "PayPal Holdings", assetType: "stock" },
  { symbol: "INTC", name: "Intel Corp.", assetType: "stock" },
  { symbol: "VOO", name: "Vanguard S&P 500 ETF", assetType: "etf" },
  { symbol: "VTI", name: "Vanguard Total Stock Market ETF", assetType: "etf" },
  { symbol: "QQQ", name: "Invesco QQQ Trust", assetType: "etf" },
  { symbol: "SPY", name: "SPDR S&P 500 ETF Trust", assetType: "etf" },
  { symbol: "IWM", name: "iShares Russell 2000 ETF", assetType: "etf" },
  {
    symbol: "VEA",
    name: "Vanguard FTSE Developed Markets ETF",
    assetType: "etf",
  },
  {
    symbol: "VWO",
    name: "Vanguard FTSE Emerging Markets ETF",
    assetType: "etf",
  },
  { symbol: "BND", name: "Vanguard Total Bond Market ETF", assetType: "etf" },
  { symbol: "ARKK", name: "ARK Innovation ETF", assetType: "etf" },
  { symbol: "GLD", name: "SPDR Gold Shares", assetType: "etf" },
  { symbol: "VNQ", name: "Vanguard Real Estate ETF", assetType: "etf" },
  { symbol: "SCHD", name: "Schwab U.S. Dividend Equity ETF", assetType: "etf" },
  {
    symbol: "VFIAX",
    name: "Vanguard 500 Index Fund",
    assetType: "mutual_fund",
  },
  {
    symbol: "FXAIX",
    name: "Fidelity 500 Index Fund",
    assetType: "mutual_fund",
  },
  {
    symbol: "VTSAX",
    name: "Vanguard Total Stock Market Index",
    assetType: "mutual_fund",
  },
  {
    symbol: "VBTLX",
    name: "Vanguard Total Bond Market Index",
    assetType: "mutual_fund",
  },
  {
    symbol: "VWELX",
    name: "Vanguard Wellington Fund",
    assetType: "mutual_fund",
  },
  {
    symbol: "SWPPX",
    name: "Schwab S&P 500 Index Fund",
    assetType: "mutual_fund",
  },
  { symbol: "BTC", name: "Bitcoin", assetType: "crypto" },
  { symbol: "ETH", name: "Ethereum", assetType: "crypto" },
  { symbol: "SOL", name: "Solana", assetType: "crypto" },
  { symbol: "BNB", name: "BNB", assetType: "crypto" },
  { symbol: "XRP", name: "XRP", assetType: "crypto" },
  { symbol: "ADA", name: "Cardano", assetType: "crypto" },
  { symbol: "DOGE", name: "Dogecoin", assetType: "crypto" },
  { symbol: "AVAX", name: "Avalanche", assetType: "crypto" },
  { symbol: "DOT", name: "Polkadot", assetType: "crypto" },
  { symbol: "MATIC", name: "Polygon", assetType: "crypto" },
  { symbol: "GLD", name: "SPDR Gold Shares", assetType: "commodity" },
  { symbol: "IAU", name: "iShares Gold Trust", assetType: "commodity" },
  { symbol: "SLV", name: "iShares Silver Trust", assetType: "commodity" },
  { symbol: "PPLT", name: "abrdn Physical Platinum", assetType: "commodity" },
  { symbol: "USO", name: "United States Oil Fund", assetType: "commodity" },
  { symbol: "BNO", name: "United States Brent Oil Fund", assetType: "commodity" },
  { symbol: "UNG", name: "United States Natural Gas Fund", assetType: "commodity" },
  { symbol: "DBC", name: "Invesco DB Commodity Index", assetType: "commodity" },
  { symbol: "CPER", name: "United States Copper Index Fund", assetType: "commodity" },
  { symbol: "PDBC", name: "Invesco Optimum Yield Diversified Commodity", assetType: "commodity" },
];

export function symbolsForType(type: AssetType): SymbolInfo[] {
  return POPULAR_SYMBOLS.filter((s) => s.assetType === type);
}

export function isSymbolHeld(
  symbol: string,
  holdings: AssetHolding[],
  excludeHoldingId?: string,
): boolean {
  return holdings.some(
    (h) =>
      h.is_active &&
      h.symbol?.toUpperCase() === symbol.toUpperCase() &&
      h.holding_id !== excludeHoldingId,
  );
}

export function findHolding(
  id: string,
  holdings: AssetHolding[],
): AssetHolding | undefined {
  return holdings.find((h) => h.holding_id === id);
}

const _assetNow = new Date().toISOString();

export const mockHoldings: AssetHolding[] = [
  {
    holding_id: "h-1",
    user_id: "u-1",
    asset_type: "stock",
    valuation_method: "market",
    cost_basis: 30000,
    initial_value_date: "2024-01-15",
    symbol: "AAPL",
    name: "Apple Inc.",
    quantity: 200,
    is_active: true,
    created_at: _assetNow,
    updated_at: _assetNow,
  },
  {
    holding_id: "h-2",
    user_id: "u-1",
    asset_type: "etf",
    valuation_method: "market",
    cost_basis: 200000,
    initial_value_date: "2023-06-01",
    symbol: "VOO",
    name: "Vanguard S&P 500 ETF",
    quantity: 500,
    is_active: true,
    created_at: _assetNow,
    updated_at: _assetNow,
  },
  {
    // Bond: cost_basis = face value; current_value computed server-side via accrual
    holding_id: "h-3",
    user_id: "u-1",
    asset_type: "bond",
    valuation_method: "auto_calculated",
    cost_basis: 312500,
    initial_value_date: "2022-11-01",
    name: "Government Bond Portfolio",
    coupon_rate: 4.5,
    maturity_date: "2030-11-01",
    is_active: true,
    created_at: _assetNow,
    updated_at: _assetNow,
  },
  {
    // Cash with APY: cost_basis = principal; current_value auto-accrued server-side
    holding_id: "h-4",
    user_id: "u-1",
    asset_type: "cash",
    valuation_method: "auto_calculated",
    cost_basis: 125000,
    initial_value_date: "2025-01-01",
    name: "High-Yield Savings",
    coupon_rate: 4.2,
    is_active: true,
    created_at: _assetNow,
    updated_at: _assetNow,
  },
  {
    // Alternative: manual — last_updated set >30 days ago to trigger stale badge
    holding_id: "h-5",
    user_id: "u-1",
    asset_type: "alternative",
    valuation_method: "manual",
    cost_basis: 50000,
    initial_value_date: "2024-03-10",
    name: "Private Equity Fund",
    current_value: 62500,
    last_updated: "2025-12-01T00:00:00Z",
    is_active: true,
    created_at: _assetNow,
    updated_at: _assetNow,
  },
  {
    holding_id: "h-6",
    user_id: "u-1",
    asset_type: "crypto",
    valuation_method: "market",
    cost_basis: 30000,
    initial_value_date: "2024-08-01",
    symbol: "BTC",
    name: "Bitcoin",
    quantity: 0.45,
    is_active: true,
    created_at: _assetNow,
    updated_at: _assetNow,
  },
];

export const mockValuations: AssetValuation[] = [
  {
    valuation_id: "v-1",
    holding_id: "h-1",
    value: 180000,
    as_of: "2026-02-01",
    source: "market",
    created_at: _assetNow,
  },
  {
    valuation_id: "v-2",
    holding_id: "h-2",
    value: 310000,
    as_of: "2026-02-01",
    source: "market",
    created_at: _assetNow,
  },
  {
    valuation_id: "v-3",
    holding_id: "h-3",
    value: 320000,
    as_of: "2026-01-15",
    source: "manual",
    created_at: _assetNow,
  },
  {
    valuation_id: "v-4",
    holding_id: "h-4",
    value: 128000,
    as_of: "2026-02-01",
    source: "manual",
    created_at: _assetNow,
  },
  {
    valuation_id: "v-5",
    holding_id: "h-5",
    value: 62500,
    as_of: "2026-01-01",
    source: "manual",
    created_at: _assetNow,
  },
  {
    valuation_id: "v-6",
    holding_id: "h-6",
    value: 45000,
    as_of: "2026-02-01",
    source: "market",
    created_at: _assetNow,
  },
];

// ============================================================================
// PROPERTY DATA
// ============================================================================

export type Lien = { id: string; name: string; balance: number };

export type PropertyType =
  | "house"
  | "apartment"
  | "condo"
  | "townhouse"
  | "land"
  | "commercial"
  | "other";

export const PROPERTY_TYPE_OPTIONS: { value: PropertyType; label: string }[] = [
  { value: "house", label: "House" },
  { value: "apartment", label: "Apartment" },
  { value: "condo", label: "Condo" },
  { value: "townhouse", label: "Townhouse" },
  { value: "land", label: "Land" },
  { value: "commercial", label: "Commercial" },
  { value: "other", label: "Other" },
];

export type PropertyInsuranceType =
  | "homeowners"
  | "landlord"
  | "flood"
  | "earthquake"
  | "umbrella"
  | "other";

export const PROPERTY_INSURANCE_TYPE_OPTIONS: {
  value: PropertyInsuranceType;
  label: string;
}[] = [
  { value: "homeowners", label: "Homeowners" },
  { value: "landlord", label: "Landlord" },
  { value: "flood", label: "Flood" },
  { value: "earthquake", label: "Earthquake" },
  { value: "umbrella", label: "Umbrella" },
  { value: "other", label: "Other" },
];

export type PropertyInsurance = {
  insurance_type: PropertyInsuranceType;
  provider: string;
  policy_number: string;
  coverage_amount: number;
  annual_premium: number;
  deductible: number;
  expiry_date: string;
};

/** Full mortgage details stored on a property (source of truth for property mortgages). */
export type PropertyMortgage = {
  lender: string;
  balance: number;
  interest_rate_pct: number;
  min_payment_monthly: number;
  due_day?: number;
  original_loan_amount?: number;
  expected_payoff_date?: string;
  term_years?: number;
  start_date?: string;
  /** Property mortgages are repayment loans. */
  type?: "repayment";
};

/** Coerce unknown numeric input to a finite number. Never returns NaN. */
export function finiteNumber(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? v : 0;
}

/**
 * Map API/demo mortgage aliases (`monthly_payment`, `original_amount`,
 * `end_date`) onto the PropertyMortgage fields the UI reads.
 */
export function normalizePropertyMortgage(
  raw: unknown,
): PropertyMortgage | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const original =
    r.original_loan_amount ?? r.original_amount ?? undefined;
  const payoff = r.expected_payoff_date ?? r.end_date;
  return {
    lender: typeof r.lender === "string" ? r.lender : "",
    balance: finiteNumber(r.balance),
    interest_rate_pct: finiteNumber(r.interest_rate_pct),
    min_payment_monthly: finiteNumber(
      r.min_payment_monthly ?? r.monthly_payment,
    ),
    due_day: r.due_day != null ? finiteNumber(r.due_day) : undefined,
    original_loan_amount:
      original != null && original !== ""
        ? finiteNumber(original)
        : undefined,
    expected_payoff_date:
      typeof payoff === "string" && payoff ? payoff : undefined,
    term_years:
      r.term_years != null && r.term_years !== ""
        ? finiteNumber(r.term_years) || undefined
        : undefined,
    start_date:
      typeof r.start_date === "string" && r.start_date
        ? r.start_date
        : undefined,
    type: "repayment",
  };
}

/** Write body for properties.create and properties.update. Update replaces the row, so omitted fields are cleared. Server-owned fields stay off the body. */
export function toPropertyWriteBody(
  property: Property,
  options?: { includeId?: boolean },
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: property.name,
    property_type: property.property_type,
    country: property.country,
    city: property.city,
    purchase_date: property.purchase_date,
    value_uncertain: property.value_uncertain === true,
    is_primary: property.is_primary,
  };

  if (options?.includeId) body.property_id = property.property_id;
  if (property.locality) body.locality = property.locality;
  if (property.address) body.address = property.address;
  if (property.land_area_m2 != null) body.land_area_m2 = property.land_area_m2;
  if (property.building_area_m2 != null) {
    body.building_area_m2 = property.building_area_m2;
  }
  if (property.bedrooms != null) body.bedrooms = property.bedrooms;
  if (property.bathrooms != null) body.bathrooms = property.bathrooms;
  if (property.floors != null) body.floors = property.floors;
  if (property.year_built != null) body.year_built = property.year_built;
  if (property.condition) body.condition = property.condition;
  if (property.occupancy) body.occupancy = property.occupancy;
  if (property.purchase_price != null && property.purchase_price > 0) {
    body.purchase_price = property.purchase_price;
  }
  if (!property.value_uncertain && property.market_value > 0) {
    body.market_value = property.market_value;
  }
  if (property.mortgage) {
    const mortgage = property.mortgage;
    body.mortgage = {
      lender: mortgage.lender,
      balance: mortgage.balance,
      interest_rate_pct: mortgage.interest_rate_pct,
      min_payment_monthly: mortgage.min_payment_monthly,
      ...(mortgage.due_day != null ? { due_day: mortgage.due_day } : {}),
      ...(mortgage.original_loan_amount != null
        ? { original_loan_amount: mortgage.original_loan_amount }
        : {}),
      ...(mortgage.expected_payoff_date
        ? { expected_payoff_date: mortgage.expected_payoff_date }
        : {}),
      ...(mortgage.term_years != null
        ? { term_years: mortgage.term_years }
        : {}),
      ...(mortgage.start_date ? { start_date: mortgage.start_date } : {}),
      type: "repayment",
    };
  }
  if (property.insurance.length > 0) {
    body.insurance = property.insurance.map((policy) => ({
      insurance_type: policy.insurance_type,
      provider: policy.provider,
      policy_number: policy.policy_number,
      coverage_amount: policy.coverage_amount,
      annual_premium: policy.annual_premium,
      deductible: policy.deductible,
      expiry_date: policy.expiry_date,
    }));
  }

  return body;
}

export const COUNTRY_OPTIONS = [
  "USA",
  "UK",
  "Canada",
  "Australia",
  "Ghana",
  "Nigeria",
  "South Africa",
  "UAE",
  "Singapore",
  "Germany",
  "France",
  "Netherlands",
  "Switzerland",
  "Japan",
  "Other",
] as const;

export type PropertyCondition = "excellent" | "good" | "fair" | "poor";

export const PROPERTY_CONDITION_OPTIONS: {
  value: PropertyCondition;
  label: string;
}[] = [
  { value: "excellent", label: "Excellent" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
];

export type PropertyOccupancy = "owner_occupied" | "rented" | "vacant";

export const PROPERTY_OCCUPANCY_OPTIONS: {
  value: PropertyOccupancy;
  label: string;
}[] = [
  { value: "owner_occupied", label: "Owner occupied" },
  { value: "rented", label: "Rented" },
  { value: "vacant", label: "Vacant" },
];

/** Detail fields the client or the advisor can supply. */
export const PROPERTY_DETAIL_SOURCE_FIELDS = [
  "locality",
  "address",
  "land_area_m2",
  "building_area_m2",
  "bedrooms",
  "bathrooms",
  "floors",
  "year_built",
  "condition",
  "occupancy",
] as const;

export type PropertyDetailField = (typeof PROPERTY_DETAIL_SOURCE_FIELDS)[number];

export type PropertyFieldSource = "client" | "rm";

export type PropertyFieldSources = Partial<
  Record<PropertyDetailField, PropertyFieldSource>
>;

export type Property = {
  property_id: string;
  user_id: string;
  name: string;
  property_type: PropertyType;
  country: string;
  city: string;
  /** Area name only, e.g. Chelsea. Not "Chelsea, London". */
  locality?: string;
  /** Street address. A UK postcode in this string is what UK valuation uses. */
  address?: string;
  land_area_m2?: number;
  building_area_m2?: number;
  bedrooms?: number;
  bathrooms?: number;
  floors?: number;
  year_built?: number;
  condition?: PropertyCondition;
  occupancy?: PropertyOccupancy;
  purchase_date: string;
  /** What the user originally paid for the property. */
  purchase_price?: number | null;
  /** Client stated value. Same amount as current_value. Not an advisor valuation. */
  market_value: number;
  /** Kept equal to market_value. Omitted when the client did not state a value. */
  current_value?: number;
  /** When true the user has indicated they are unsure of the current market value. */
  value_uncertain?: boolean;
  mortgage_balance: number;
  /** Full mortgage details. When set, mortgage_balance matches mortgage.balance. */
  mortgage?: PropertyMortgage;
  additional_liens?: Lien[];
  is_primary: boolean;
  is_active: boolean;
  /** Who supplied each detail field. Client entries are "client". */
  field_sources?: PropertyFieldSources;
  insurance: PropertyInsurance[];
  /** Advisor valuations. The client does not invent these. */
  valuations?: unknown[];
  /** Set by the advisor when a valuation is published. */
  published_valuation_id?: string;
  created_at: string;
  updated_at: string;
};

export function totalPropertyLienBalance(p: Property): number {
  return (
    p.mortgage_balance +
    (p.additional_liens?.reduce((s, l) => s + l.balance, 0) ?? 0)
  );
}

export function propertyEquity(p: Property): number {
  return p.market_value - totalPropertyLienBalance(p);
}

export function propertyLvr(p: Property): number {
  return p.market_value > 0
    ? Math.round((totalPropertyLienBalance(p) / p.market_value) * 100)
    : 0;
}

/** Active primary property, or first active property as fallback. */
export function getPrimaryProperty(
  properties: Property[],
): Property | undefined {
  return (
    properties.find((p) => p.is_primary && p.is_active) ??
    properties.find((p) => p.is_active)
  );
}

/** Properties with an on-record mortgage (demo and API store these on the property). */
export function getPropertiesWithMortgages(properties: Property[]): Property[] {
  return properties.filter(
    (p) => p.is_active && totalPropertyLienBalance(p) > 0,
  );
}

/**
 * Mortgage details for analysis UI. Prefers the nested mortgage record from the
 * API; falls back to mortgage_balance when only the balance is present.
 */
export function getEffectivePropertyMortgage(
  property: Property,
): PropertyMortgage | null {
  if (property.mortgage && finiteNumber(property.mortgage.balance) > 0) {
    return property.mortgage;
  }
  const balance = finiteNumber(property.mortgage_balance);
  if (balance <= 0) return null;
  // Rough monthly P&I estimate (~30yr at ~5%) when payment is not on file
  return {
    lender: "",
    balance,
    interest_rate_pct: 5,
    min_payment_monthly: Math.max(1, Math.round(balance * 0.0055)),
  };
}

export function resolvePropertyGeoName(country: string): string {
  return COUNTRY_GEO_NAME_MAP[country] ?? countryDisplayName(country);
}

export type PropertyCountryConcentration = {
  topCountry: string;
  topCountryLabel: string;
  topValue: number;
  topPct: number;
  topCount: number;
  totalValue: number;
  countryCount: number;
};

/** Largest country share from country + market value pairs. */
export function getPropertyCountryConcentrationFromEntries(
  entries: { country: string; marketValue: number }[],
): PropertyCountryConcentration | null {
  const active = entries.filter((e) => e.country !== "" && e.marketValue > 0);
  if (active.length === 0) return null;

  const byCountry = new Map<string, { value: number; count: number }>();
  for (const e of active) {
    const existing = byCountry.get(e.country) ?? { value: 0, count: 0 };
    byCountry.set(e.country, {
      value: existing.value + e.marketValue,
      count: existing.count + 1,
    });
  }

  let topCountry = "";
  let topValue = 0;
  let topCount = 0;
  for (const [country, stats] of byCountry) {
    if (stats.value > topValue) {
      topCountry = country;
      topValue = stats.value;
      topCount = stats.count;
    }
  }

  const totalValue = active.reduce((s, e) => s + e.marketValue, 0);
  if (totalValue <= 0 || !topCountry) return null;

  return {
    topCountry,
    topCountryLabel: resolvePropertyGeoName(topCountry),
    topValue,
    topPct: (topValue / totalValue) * 100,
    topCount,
    totalValue,
    countryCount: byCountry.size,
  };
}

/** Largest country share of active property market value. */
export function getPropertyCountryConcentration(
  properties: Property[],
): PropertyCountryConcentration | null {
  return getPropertyCountryConcentrationFromEntries(
    properties
      .filter((p) => p.is_active && p.market_value > 0)
      .map((p) => ({ country: p.country, marketValue: p.market_value })),
  );
}

export function propertyTypeLabel(type: string): string {
  if (type === "residential") return "House";
  if (type === "investment") return "Investment";
  return PROPERTY_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

export function propertyConditionLabel(condition: string): string {
  return (
    PROPERTY_CONDITION_OPTIONS.find((o) => o.value === condition)?.label ??
    condition
  );
}

export function propertyOccupancyLabel(occupancy: string): string {
  return (
    PROPERTY_OCCUPANCY_OPTIONS.find((o) => o.value === occupancy)?.label ??
    occupancy
  );
}

function cleanOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

/** Blank and non-positive numbers are empty. Zero is not a real size or count. */
export function optionalPositiveNumber(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n;
}

function optionalWholeNumber(value: unknown): number | undefined {
  const n = optionalPositiveNumber(value);
  if (n == null || !Number.isInteger(n)) return undefined;
  return n;
}

function optionalYear(value: unknown): number | undefined {
  const n = optionalWholeNumber(value);
  if (n == null || n < 1000 || n > 9999) return undefined;
  return n;
}

function isPropertyCondition(value: unknown): value is PropertyCondition {
  return PROPERTY_CONDITION_OPTIONS.some((o) => o.value === value);
}

function isPropertyOccupancy(value: unknown): value is PropertyOccupancy {
  return PROPERTY_OCCUPANCY_OPTIONS.some((o) => o.value === value);
}

export function readPropertyFieldSources(
  raw: unknown,
): PropertyFieldSources | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const record = raw as Record<string, unknown>;
  const sources: PropertyFieldSources = {};
  for (const key of PROPERTY_DETAIL_SOURCE_FIELDS) {
    const value = record[key];
    if (value === "client" || value === "rm") sources[key] = value;
  }
  return Object.keys(sources).length > 0 ? sources : undefined;
}

/** Detail fields from an API or demo record. Omits blanks and non-positive numbers. */
export function readOptionalPropertyFields(
  raw: Record<string, unknown>,
): Partial<Property> {
  const market = finiteNumber(raw.market_value);
  const current = optionalPositiveNumber(raw.current_value);
  const uncertain = raw.value_uncertain === true;
  return {
    locality: cleanOptionalString(raw.locality),
    address: cleanOptionalString(raw.address),
    land_area_m2: optionalPositiveNumber(raw.land_area_m2),
    building_area_m2: optionalPositiveNumber(raw.building_area_m2),
    bedrooms: optionalWholeNumber(raw.bedrooms),
    bathrooms: optionalWholeNumber(raw.bathrooms),
    floors: optionalWholeNumber(raw.floors),
    year_built: optionalYear(raw.year_built),
    condition: isPropertyCondition(raw.condition) ? raw.condition : undefined,
    occupancy: isPropertyOccupancy(raw.occupancy) ? raw.occupancy : undefined,
    field_sources: readPropertyFieldSources(raw.field_sources),
    current_value: uncertain
      ? undefined
      : (current ?? (market > 0 ? market : undefined)),
    valuations: Array.isArray(raw.valuations) ? raw.valuations : undefined,
    published_valuation_id: cleanOptionalString(raw.published_valuation_id),
  };
}

export function buildPropertyFieldSources(
  values: Partial<Record<PropertyDetailField, string | number>>,
  previous?: Pick<Property, PropertyDetailField | "field_sources"> | null,
): PropertyFieldSources | undefined {
  const sources: PropertyFieldSources = {};
  for (const key of PROPERTY_DETAIL_SOURCE_FIELDS) {
    const value = values[key];
    if (value == null || value === "") continue;
    const prevSource = previous?.field_sources?.[key];
    const prevValue = previous?.[key];
    const unchanged =
      prevSource === "rm" &&
      (typeof value === "number"
        ? Number(prevValue) === value
        : String(prevValue ?? "") === value);
    sources[key] = unchanged ? "rm" : "client";
  }
  return Object.keys(sources).length > 0 ? sources : undefined;
}

export function formatPropertySpecs(input: {
  bedrooms?: number | null;
  bathrooms?: number | null;
  floors?: number | null;
  building_area_m2?: number | null;
  land_area_m2?: number | null;
  year_built?: number | null;
  condition?: string | null;
  occupancy?: string | null;
}): string {
  const parts: string[] = [];
  if (input.bedrooms != null && input.bedrooms > 0) {
    parts.push(`${input.bedrooms} bed`);
  }
  if (input.bathrooms != null && input.bathrooms > 0) {
    parts.push(`${input.bathrooms} bath`);
  }
  if (input.floors != null && input.floors > 0) {
    parts.push(input.floors === 1 ? "1 floor" : `${input.floors} floors`);
  }
  if (input.building_area_m2 != null && input.building_area_m2 > 0) {
    parts.push(`${formatArea(input.building_area_m2)} m² building`);
  }
  if (input.land_area_m2 != null && input.land_area_m2 > 0) {
    parts.push(`${formatArea(input.land_area_m2)} m² land`);
  }
  if (input.year_built != null && input.year_built > 0) {
    parts.push(`Built ${input.year_built}`);
  }
  if (input.condition) parts.push(propertyConditionLabel(input.condition));
  if (input.occupancy) parts.push(propertyOccupancyLabel(input.occupancy));
  return parts.join(" · ");
}

function formatArea(n: number): string {
  return Number.isInteger(n)
    ? n.toLocaleString("en-US")
    : n.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

export function findProperty(
  id: string,
  properties: Property[],
): Property | undefined {
  return properties.find((p) => p.property_id === id);
}

export function totalInsurancePremium(p: Property): number {
  return p.insurance.reduce((sum, i) => sum + i.annual_premium, 0);
}

export function totalInsuranceCoverage(p: Property): number {
  return p.insurance.reduce((sum, i) => sum + i.coverage_amount, 0);
}

export function propertyInsuranceTypeLabel(
  type: PropertyInsuranceType,
): string {
  return (
    PROPERTY_INSURANCE_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type
  );
}

export function isInsuranceExpiringSoon(policy: PropertyInsurance): boolean {
  const days = Math.ceil(
    (new Date(policy.expiry_date).getTime() - Date.now()) /
      (1000 * 60 * 60 * 24),
  );
  return days <= 60 && days > 0;
}

export function isInsuranceExpired(policy: PropertyInsurance): boolean {
  return new Date(policy.expiry_date) < new Date();
}

const _propNow = new Date().toISOString();

export const mockProperties: Property[] = [
  {
    property_id: "p-223",
    user_id: "u-1",
    name: "Hudson River Townhouse",
    property_type: "house",
    country: "USA",
    city: "New York",
    locality: "Upper East Side",
    address: "18 East 72nd Street, New York, NY 10021",
    land_area_m2: 186,
    building_area_m2: 420,
    bedrooms: 5,
    bathrooms: 3,
    floors: 4,
    year_built: 1924,
    condition: "good",
    occupancy: "owner_occupied",
    field_sources: {
      locality: "client",
      address: "client",
      land_area_m2: "client",
      building_area_m2: "client",
      bedrooms: "client",
      bathrooms: "client",
      floors: "client",
      year_built: "client",
      condition: "client",
      occupancy: "client",
    },
    purchase_date: "2017-06-18",
    market_value: 920000,
    current_value: 920000,
    mortgage_balance: 410000,
    is_primary: true,
    is_active: true,
    insurance: [
      {
        insurance_type: "homeowners",
        provider: "State Farm",
        policy_number: "HO-2025-47291",
        coverage_amount: 950000,
        annual_premium: 2650,
        deductible: 2500,
        expiry_date: "2026-11-20",
      },
      {
        insurance_type: "flood",
        provider: "NFIP",
        policy_number: "FL-2025-19433",
        coverage_amount: 300000,
        annual_premium: 820,
        deductible: 1500,
        expiry_date: "2026-08-12",
      },
    ],
    created_at: _propNow,
    updated_at: _propNow,
  },
  {
    property_id: "p-1",
    user_id: "u-1",
    name: "Manhattan Condo",
    property_type: "condo",
    country: "USA",
    city: "New York",
    locality: "Tribeca",
    address: "90 Hudson Street, New York, NY 10013",
    building_area_m2: 140,
    bedrooms: 2,
    bathrooms: 2,
    floors: 1,
    year_built: 2006,
    condition: "excellent",
    occupancy: "owner_occupied",
    field_sources: {
      locality: "client",
      address: "client",
      building_area_m2: "client",
      bedrooms: "client",
      bathrooms: "client",
      floors: "client",
      year_built: "client",
      condition: "client",
      occupancy: "client",
    },
    purchase_date: "2019-04-03",
    market_value: 680000,
    current_value: 680000,
    mortgage_balance: 390000,
    is_primary: true,
    is_active: true,
    insurance: [
      {
        insurance_type: "homeowners",
        provider: "State Farm",
        policy_number: "HO-2025-88912",
        coverage_amount: 700000,
        annual_premium: 2100,
        deductible: 2000,
        expiry_date: "2026-10-01",
      },
      {
        insurance_type: "flood",
        provider: "NFIP",
        policy_number: "FL-2025-33144",
        coverage_amount: 200000,
        annual_premium: 640,
        deductible: 1500,
        expiry_date: "2026-05-17",
      },
    ],
    created_at: _propNow,
    updated_at: _propNow,
  },
  {
    property_id: "p-132",
    user_id: "u-1",
    name: "Phuket Hillside Plot",
    property_type: "land",
    country: "Thailand",
    city: "Phuket",
    locality: "Kamala",
    address: "88 Kamala Beach Road, Phuket",
    land_area_m2: 2400,
    condition: "fair",
    occupancy: "vacant",
    field_sources: {
      locality: "client",
      address: "client",
      land_area_m2: "client",
      condition: "client",
      occupancy: "client",
    },
    purchase_date: "2021-02-11",
    market_value: 310000,
    current_value: 310000,
    mortgage_balance: 120000,
    is_primary: false,
    is_active: true,
    insurance: [
      {
        insurance_type: "homeowners",
        provider: "Bangkok Insurance",
        policy_number: "TH-2025-66421",
        coverage_amount: 350000,
        annual_premium: 980,
        deductible: 1800,
        expiry_date: "2026-09-09",
      },
      {
        insurance_type: "flood",
        provider: "Thai Flood Protection",
        policy_number: "TF-2025-22119",
        coverage_amount: 150000,
        annual_premium: 450,
        deductible: 1200,
        expiry_date: "2026-06-28",
      },
    ],
    created_at: _propNow,
    updated_at: _propNow,
  },
  {
    property_id: "p-1342",
    user_id: "u-1",
    name: "Cape Town Development Land",
    property_type: "land",
    country: "South Africa",
    city: "Cape Town",
    locality: "Constantia",
    address: "12 Spaanschemat River Road, Constantia, Cape Town",
    land_area_m2: 1800,
    condition: "good",
    occupancy: "vacant",
    field_sources: {
      locality: "client",
      address: "client",
      land_area_m2: "client",
      condition: "client",
      occupancy: "client",
    },
    purchase_date: "2020-10-05",
    market_value: 270000,
    current_value: 270000,
    mortgage_balance: 160000,
    is_primary: false,
    is_active: true,
    insurance: [
      {
        insurance_type: "homeowners",
        provider: "Santam",
        policy_number: "SA-2025-11378",
        coverage_amount: 300000,
        annual_premium: 1400,
        deductible: 2200,
        expiry_date: "2026-07-14",
      },
      {
        insurance_type: "flood",
        provider: "Santam",
        policy_number: "SA-FL-2025-77841",
        coverage_amount: 120000,
        annual_premium: 520,
        deductible: 1500,
        expiry_date: "2026-07-14",
      },
    ],
    created_at: _propNow,
    updated_at: _propNow,
  },
  {
    property_id: "p-2",
    user_id: "u-1",
    name: "Sydney Harbour Apartment",
    property_type: "apartment",
    country: "Australia",
    city: "Sydney",
    locality: "Paddington",
    address: "44 Oxford Street, Paddington NSW 2021",
    building_area_m2: 86,
    bedrooms: 2,
    bathrooms: 1,
    floors: 1,
    year_built: 2004,
    condition: "good",
    occupancy: "rented",
    field_sources: {
      locality: "client",
      address: "client",
      building_area_m2: "client",
      bedrooms: "client",
      bathrooms: "client",
      floors: "client",
      year_built: "client",
      condition: "client",
      occupancy: "client",
    },
    purchase_date: "2018-11-23",
    market_value: 740000,
    current_value: 740000,
    mortgage_balance: 330000,
    is_primary: false,
    is_active: true,
    insurance: [
      {
        insurance_type: "landlord",
        provider: "Allianz",
        policy_number: "AU-LL-2025-99034",
        coverage_amount: 750000,
        annual_premium: 1950,
        deductible: 2000,
        expiry_date: "2026-03-30",
      },
    ],
    created_at: _propNow,
    updated_at: _propNow,
  },
  {
    property_id: "p-3",
    user_id: "u-1",
    name: "Labadi Beach House",
    property_type: "house",
    country: "Ghana",
    city: "Accra",
    locality: "Labadi",
    address: "7 Labadi Beach Road, Accra",
    land_area_m2: 650,
    building_area_m2: 280,
    bedrooms: 4,
    bathrooms: 3,
    floors: 2,
    year_built: 2015,
    condition: "excellent",
    occupancy: "vacant",
    field_sources: {
      locality: "client",
      address: "client",
      land_area_m2: "client",
      building_area_m2: "client",
      bedrooms: "client",
      bathrooms: "client",
      floors: "client",
      year_built: "client",
      condition: "client",
      occupancy: "client",
    },
    purchase_date: "2022-05-10",
    market_value: 420000,
    current_value: 420000,
    mortgage_balance: 0,
    is_primary: false,
    is_active: true,
    insurance: [],
    created_at: _propNow,
    updated_at: _propNow,
  },
];

export const COUNTRY_GEO_NAME_MAP: Record<string, string> = {
  USA: "United States of America",
  US: "United States of America",
  UK: "United Kingdom",
  GB: "United Kingdom",
  AU: "Australia",
  Australia: "Australia",
  CA: "Canada",
  Canada: "Canada",
  GH: "Ghana",
  Ghana: "Ghana",
  NG: "Nigeria",
  Nigeria: "Nigeria",
  "South Africa": "South Africa",
  UAE: "United Arab Emirates",
  Singapore: "Singapore",
  Germany: "Germany",
  France: "France",
  Netherlands: "Netherlands",
  Switzerland: "Switzerland",
  Japan: "Japan",
};

export function getPropertyGeoCountries(
  properties: Property[] = mockProperties,
): string[] {
  return [
    ...new Set(
      properties
        .filter((p) => p.is_active)
        .map((p) => COUNTRY_GEO_NAME_MAP[p.country] ?? p.country),
    ),
  ];
}

// ============================================================================
// MOCK INSURANCE POLICIES — single unified list, all user-managed
// ============================================================================

const _insNow = new Date().toISOString();

export const mockInsurancePolicies: InsurancePolicy[] = [
  {
    policy_id: "ins-1",
    user_id: "u-1",
    category: "life",
    provider: "MetLife",
    name: "Term Life Insurance",
    policy_number: "ML-2022-44190",
    coverage_amount: 2000000,
    premium_monthly: 250,
    deductible: 0,
    start_date: "2022-01-15",
    renewal_date: "2030-06-01",
    auto_renew: false,
    beneficiary: "Spouse",
    notes: "20-year term policy. Beneficiary: spouse.",
    is_active: true,
    created_at: _insNow,
    updated_at: _insNow,
  },
  {
    policy_id: "ins-2",
    user_id: "u-1",
    category: "health",
    provider: "Blue Cross Blue Shield",
    name: "Family Health Plan",
    policy_number: "BC-2025-88320",
    coverage_amount: 500000,
    premium_monthly: 450,
    deductible: 3000,
    start_date: "2025-01-01",
    renewal_date: "2026-12-31",
    auto_renew: true,
    notes: "PPO plan. Covers all 4 family members.",
    is_active: true,
    created_at: _insNow,
    updated_at: _insNow,
  },
  {
    policy_id: "ins-3",
    user_id: "u-1",
    category: "home",
    provider: "State Farm",
    name: "Primary Residence Insurance",
    policy_number: "SF-2024-11209",
    coverage_amount: 850000,
    premium_monthly: 180,
    deductible: 2500,
    start_date: "2024-04-01",
    renewal_date: "2026-04-01",
    auto_renew: true,
    notes: "Property values have risen. Review coverage limit.",
    is_active: true,
    created_at: _insNow,
    updated_at: _insNow,
  },
  {
    policy_id: "ins-4",
    user_id: "u-1",
    category: "home",
    provider: "Allianz",
    name: "Rental Property Insurance",
    policy_number: "AL-2024-55709",
    coverage_amount: 525000,
    premium_monthly: 120,
    deductible: 2000,
    start_date: "2024-05-01",
    renewal_date: "2026-05-01",
    auto_renew: true,
    notes: "Landlord policy. Includes liability coverage.",
    is_active: true,
    created_at: _insNow,
    updated_at: _insNow,
  },
  {
    policy_id: "ins-5",
    user_id: "u-1",
    category: "auto",
    provider: "GEICO",
    name: "Auto Insurance - BMW",
    policy_number: "GK-2025-55412",
    coverage_amount: 50000,
    premium_monthly: 85,
    deductible: 1000,
    start_date: "2025-03-01",
    renewal_date: "2026-09-15",
    auto_renew: true,
    is_active: true,
    created_at: _insNow,
    updated_at: _insNow,
  },
  {
    policy_id: "ins-6",
    user_id: "u-1",
    category: "disability",
    provider: "Guardian",
    name: "Long-Term Disability",
    policy_number: "GD-2023-00812",
    coverage_amount: 120000,
    premium_monthly: 150,
    deductible: 0,
    start_date: "2023-01-01",
    renewal_date: "2027-01-01",
    auto_renew: true,
    notes: "Covers 60% of income. Review benefit amount after pay raise.",
    is_active: true,
    created_at: _insNow,
    updated_at: _insNow,
  },
  {
    policy_id: "ins-7",
    user_id: "u-1",
    category: "umbrella",
    provider: "Chubb",
    name: "Personal Umbrella Policy",
    policy_number: "CH-2025-99001",
    coverage_amount: 2000000,
    premium_monthly: 45,
    deductible: 0,
    start_date: "2025-11-01",
    renewal_date: "2026-11-01",
    auto_renew: true,
    is_active: true,
    created_at: _insNow,
    updated_at: _insNow,
  },
  {
    policy_id: "ins-8",
    user_id: "u-1",
    category: "travel",
    provider: "Allianz Travel",
    name: "Annual Travel Insurance",
    policy_number: "AT-2025-00192",
    coverage_amount: 100000,
    premium_monthly: 40,
    deductible: 250,
    start_date: "2025-01-01",
    renewal_date: "2026-01-01",
    auto_renew: true,
    notes: "Covers all international trips under 90 days.",
    is_active: true,
    created_at: _insNow,
    updated_at: _insNow,
  },
  {
    policy_id: "ins-9",
    user_id: "u-1",
    category: "pet",
    provider: "Healthy Paws",
    name: "Pet Insurance - Max",
    policy_number: "HP-2025-88201",
    coverage_amount: 20000,
    premium_monthly: 40,
    deductible: 500,
    start_date: "2025-03-01",
    renewal_date: "2026-03-01",
    auto_renew: true,
    is_active: true,
    created_at: _insNow,
    updated_at: _insNow,
  },
];

// ============================================================================
// MOCK FINANCIAL DOMAIN DATA
// ============================================================================

export const mockAccounts: Account[] = [
  {
    id: "acc-brokerage",
    name: "Brokerage Account",
    institution: "Fidelity",
    type: "taxable",
    balance: 440000,
    currency: "USD",
    updatedAt: "2026-03-01T08:00:00Z",
  },
  {
    id: "acc-401k",
    name: "401(k)",
    institution: "Vanguard",
    type: "retirement",
    balance: 380000,
    currency: "USD",
    updatedAt: "2026-03-01T08:00:00Z",
  },
  {
    id: "acc-roth",
    name: "Roth IRA",
    institution: "Vanguard",
    type: "retirement",
    balance: 180000,
    currency: "USD",
    updatedAt: "2026-03-01T08:00:00Z",
  },
  {
    id: "acc-checking",
    name: "Checking Account",
    institution: "Chase",
    type: "cash",
    balance: 55000,
    currency: "USD",
    updatedAt: "2026-03-03T10:00:00Z",
  },
  {
    id: "acc-savings",
    name: "High-Yield Savings",
    institution: "Marcus",
    type: "cash",
    balance: 70000,
    currency: "USD",
    updatedAt: "2026-03-03T10:00:00Z",
  },
  {
    id: "acc-hysa2",
    name: "Emergency Reserve",
    institution: "Ally",
    type: "cash",
    balance: 62500,
    currency: "USD",
    updatedAt: "2026-03-03T10:00:00Z",
  },
  {
    id: "acc-crypto",
    name: "Crypto Portfolio",
    institution: "Coinbase",
    type: "crypto",
    balance: 62500,
    currency: "USD",
    updatedAt: "2026-03-02T06:30:00Z",
  },
];

export const mockLiabilities: Liability[] = [
  {
    id: "liab-mort-1",
    name: "Primary Residence Mortgage",
    type: "mortgage",
    balance: 450000,
    interestRatePct: 3.25,
    minPaymentMonthly: 2100,
    dueDay: 1,
    updatedAt: "2026-03-01T08:00:00Z",
  },
  {
    id: "liab-mort-2",
    name: "Rental Property Mortgage",
    type: "mortgage",
    balance: 325000,
    interestRatePct: 3.75,
    minPaymentMonthly: 1650,
    dueDay: 1,
    updatedAt: "2026-03-01T08:00:00Z",
  },
  {
    id: "liab-cc-1",
    name: "Chase Sapphire Card",
    type: "credit_card",
    balance: 8500,
    interestRatePct: 19.99,
    minPaymentMonthly: 250,
    dueDay: 15,
    updatedAt: "2026-03-03T10:00:00Z",
  },
  {
    id: "liab-auto-1",
    name: "Auto Loan - BMW",
    type: "auto_loan",
    balance: 22000,
    interestRatePct: 4.9,
    minPaymentMonthly: 520,
    dueDay: 10,
    updatedAt: "2026-03-01T08:00:00Z",
  },
  {
    id: "liab-personal-1",
    name: "Personal Loan",
    type: "personal_loan",
    balance: 15000,
    interestRatePct: 8.5,
    minPaymentMonthly: 350,
    dueDay: 20,
    updatedAt: "2026-03-01T08:00:00Z",
  },
];

export const mockPropertyAssets: PropertyAsset[] = [
  {
    id: "prop-1",
    name: "Primary Residence",
    value: 850000,
    mortgageLiabilityId: "liab-mort-1",
    updatedAt: "2026-02-28T08:00:00Z",
  },
  {
    id: "prop-2",
    name: "Rental Property",
    value: 525000,
    mortgageLiabilityId: "liab-mort-2",
    updatedAt: "2026-02-28T08:00:00Z",
  },
];

export const mockPortfolioPerformance: PerformancePoint[] = [
  { month: "2025-01", value: 1000000, contributions: 14300 },
  { month: "2025-02", value: 1024000, contributions: 14300 },
  { month: "2025-03", value: 1011000, contributions: 14300 },
  { month: "2025-04", value: 1038000, contributions: 14300 },
  { month: "2025-05", value: 1065000, contributions: 14300 },
  { month: "2025-06", value: 1052000, contributions: 14300 },
  { month: "2025-07", value: 1088000, contributions: 14300 },
  { month: "2025-08", value: 1115000, contributions: 14300 },
  { month: "2025-09", value: 1103000, contributions: 14300 },
  { month: "2025-10", value: 1140000, contributions: 14300 },
  { month: "2025-11", value: 1178000, contributions: 14300 },
  { month: "2025-12", value: 1210000, contributions: 14300 },
  { month: "2026-01", value: 1228000, contributions: 14300 },
  { month: "2026-02", value: 1241000, contributions: 14300 },
  { month: "2026-03", value: 1250000, contributions: 14300 },
];

export const mockAllocation: AllocationSlice[] = [
  { label: "Stocks", percentage: 60, value: 750000 },
  { label: "Bonds", percentage: 25, value: 312500 },
  { label: "Cash", percentage: 10, value: 125000 },
  { label: "Alternatives", percentage: 5, value: 62500 },
];

export const mockTaxProfile: TaxProfile = {
  effectiveTaxRatePct: 22,
  marginalTaxRatePct: 35,
  filingStatus: "married",
  stateOrRegion: "New York",
  updatedAt: "2026-01-15T00:00:00Z",
};

export const mockEmergencyFund: EmergencyFundConfig = {
  targetMonths: 6,
  currentCashBalance: 85000,
  includeAccountIds: ["acc-checking", "acc-hysa2"],
  updatedAt: "2026-03-03T10:00:00Z",
};

// ============================================================================
// CASH FLOW DATA
// ============================================================================

export const cashFlowData: {
  income: CashFlowRow[];
  expenses: ExpenseCategory[];
  settings: CashFlowSettings;
} = {
  income: [
    { id: "i_salary", name: "Salary", amount: 22000 },
    { id: "i_rent", name: "Rental Income", amount: 2800 },
    { id: "i_div", name: "Dividends", amount: 2500 },
    { id: "i_side", name: "Passive Income", amount: 1200 },
  ],
  expenses: [
    { id: "e_housing", name: "Housing", amount: 4200, essential: true },
    { id: "e_living", name: "Living", amount: 3500, essential: true },
    { id: "e_ins", name: "Insurance", amount: 1230, essential: true },
    { id: "e_child", name: "Children", amount: 2100, essential: true },
    { id: "e_disc", name: "Discretionary", amount: 1800, essential: false },
    { id: "e_other", name: "Other", amount: 1370, essential: false },
  ],
  settings: { emergencyFundMonths: 6, currentCashBalance: 0 },
};

export const mockIncomeRows = cashFlowData.income;
export const mockExpenseCategories = cashFlowData.expenses;

// ============================================================================
// CASH FLOW HISTORY
// ============================================================================

export const mockCashFlowHistory: CashFlowPoint[] = [
  { month: "2024-07", income: 34200, expenses: 28900 },
  { month: "2024-08", income: 29800, expenses: 31400 }, // deficit
  { month: "2024-09", income: 41500, expenses: 22300 },
  { month: "2024-10", income: 26700, expenses: 29100 }, // deficit
  { month: "2024-11", income: 38900, expenses: 24600 },
  { month: "2024-12", income: 52000, expenses: 48300 }, // bonus + holiday spend

  { month: "2025-01", income: 31200, expenses: 18700 },
  { month: "2025-02", income: 27400, expenses: 33800 }, // deficit
  { month: "2025-03", income: 44600, expenses: 21500 },
  { month: "2025-04", income: 33100, expenses: 34200 }, // nearly break-even / slight deficit
  { month: "2025-05", income: 49800, expenses: 19600 }, // strong month
  { month: "2025-06", income: 28300, expenses: 31700 }, // deficit
  { month: "2025-07", income: 36500, expenses: 27800 },
  { month: "2025-08", income: 23900, expenses: 29400 }, // deficit
  { month: "2025-09", income: 42100, expenses: 18200 },
  { month: "2025-10", income: 31800, expenses: 36500 }, // deficit
  { month: "2025-11", income: 38400, expenses: 22100 },
  { month: "2025-12", income: 55000, expenses: 49700 }, // year-end bonus + spend

  { month: "2026-01", income: 29600, expenses: 35100 }, // new year deficit
  { month: "2026-02", income: 43200, expenses: 26800 },
  { month: "2026-03", income: 31500, expenses: 19400 },
];
// ============================================================================
// FRESHNESS & RETIREMENT CONFIG
// ============================================================================

export const mockFreshness: SectionFreshness[] = [
  { section: "overview", updatedAt: "2026-03-04T06:00:00Z" },
  { section: "portfolio", updatedAt: "2026-03-01T08:00:00Z" },
  { section: "cash-flow", updatedAt: "2026-03-03T10:00:00Z" },
  { section: "goals", updatedAt: "2026-03-01T08:00:00Z" },
  { section: "retirement", updatedAt: "2026-02-28T08:00:00Z" },
  { section: "insurance", updatedAt: "2026-03-01T08:00:00Z" },
  { section: "advisor", updatedAt: "2026-03-01T08:00:00Z" },
  { section: "tax", updatedAt: "2026-01-15T00:00:00Z" },
];

export const mockRetirementConfig: RetirementConfig = {
  currentAge: 43,
  retirementAge: 60,
  lifeExpectancy: 75,
  currentInvested: 1250000,
  monthlySavings: 14300,
  existingPensionBalance: 185000,
  monthlyPensionContribution: 3200,
  expectedReturnPct: 7,
  inflationPct: 3,
  safeWithdrawalRatePct: 4,
  desiredMonthlyIncome: 18500,
};

// ============================================================================
// FINANCIAL DOMAIN DATA
// ============================================================================

export const financialDomainData: FinancialDomainData = {
  accounts: mockAccounts,
  liabilities: mockLiabilities,
  propertyAssets: mockPropertyAssets,
  portfolioPerformance: mockPortfolioPerformance,
  allocation: mockAllocation,
  taxProfile: mockTaxProfile,
  emergencyFund: mockEmergencyFund,
  insurancePolicies: mockInsurancePolicies,
  incomeRows: cashFlowData.income,
  expenseCategories: cashFlowData.expenses,
  freshness: mockFreshness,
  retirement: mockRetirementConfig,
  cashFlowHistory: mockCashFlowHistory,
};

export function getFinancialDomainData(): FinancialDomainData {
  return financialDomainData;
}

// ============================================================================
// PORTFOLIO DATA
// ============================================================================

export const portfolioData = {
  totalValue: mockRetirementConfig.currentInvested,
  allocation: {
    stocks: { percentage: 60, value: 750000 },
    bonds: { percentage: 25, value: 312500 },
    cash: { percentage: 10, value: 125000 },
    alternatives: { percentage: 5, value: 62500 },
  },
  properties: mockPropertyAssets.map((prop) => {
    const mortgage =
      mockLiabilities.find((l) => l.id === prop.mortgageLiabilityId)?.balance ??
      0;
    return {
      id: prop.id,
      name: prop.name,
      value: prop.value,
      mortgage,
      equity: prop.value - mortgage,
    };
  }),
  totalRealEstate: mockPropertyAssets.reduce((s, p) => s + p.value, 0),
  totalRealEstateEquity: mockPropertyAssets.reduce((s, p) => {
    const mortgage =
      mockLiabilities.find((l) => l.id === p.mortgageLiabilityId)?.balance ?? 0;
    return s + (p.value - mortgage);
  }, 0),
};

// ============================================================================
// PERSONAL / SAVINGS / ASSUMPTIONS / LIFESTYLE
// ============================================================================

export const personalData = {
  name: getUserFullName(mockUser),
  get currentAge() {
    return getUserAge(mockUser);
  },
  retirementAge: mockRetirementConfig.retirementAge,
  lifeExpectancy: mockRetirementConfig.lifeExpectancy,
};

export const savingsData = {
  monthlySavings: mockRetirementConfig.monthlySavings,
  annualBonus: 50000,
  expectedAnnualRaise: 0.03,
};

export const investmentAssumptions = {
  expectedReturnPct: mockRetirementConfig.expectedReturnPct,
  inflationPct: mockRetirementConfig.inflationPct,
  safeWithdrawalRatePct: mockRetirementConfig.safeWithdrawalRatePct,
};

export const retirementLifestyle = {
  desiredMonthlyIncome: mockRetirementConfig.desiredMonthlyIncome,
  expectedExpenses: {
    housing: 4000,
    healthcare: 2500,
    food: 2000,
    utilities: 800,
    insurance: 1200,
    entertainment: 3000,
    travel: 3000,
    other: 2000,
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getClientData() {
  return {
    portfolio: portfolioData,
    personal: personalData,
    savings: savingsData,
    assumptions: investmentAssumptions,
    lifestyle: retirementLifestyle,
    computed: {
      yearsToRetirement: personalData.retirementAge - personalData.currentAge,
      monthlyExpenses: Object.values(
        retirementLifestyle.expectedExpenses,
      ).reduce((a, b) => a + b, 0),
      currentInvested: portfolioData.totalValue,
      totalNetWorth:
        portfolioData.totalValue + portfolioData.totalRealEstateEquity,
    },
  };
}

export function updatePortfolioValue(newValue: number) {
  portfolioData.totalValue = newValue;
}
export function updateMonthlySavings(amount: number) {
  savingsData.monthlySavings = amount;
}
export function updateRetirementAge(age: number) {
  personalData.retirementAge = age;
}
export function updateDesiredMonthlyIncome(amount: number) {
  retirementLifestyle.desiredMonthlyIncome = amount;
}
export function updateInvestmentAssumptions(
  assumptions: Partial<typeof investmentAssumptions>,
) {
  Object.assign(investmentAssumptions, assumptions);
}
export function getRetirementProjectionInputs() {
  return { ...mockRetirementConfig };
}

// ============================================================================
// GOALS DATA
// ============================================================================

export type GoalCategory =
  | "emergency"
  | "retirement"
  | "housing"
  | "education"
  | "travel"
  | "vehicle"
  | "business"
  | "other";

export const GOAL_CATEGORY_OPTIONS: { value: GoalCategory; label: string }[] = [
  { value: "emergency", label: "Emergency Fund" },
  { value: "retirement", label: "Retirement" },
  { value: "housing", label: "Housing" },
  { value: "education", label: "Education" },
  { value: "travel", label: "Travel" },
  { value: "vehicle", label: "Vehicle" },
  { value: "business", label: "Business" },
  { value: "other", label: "Other" },
];

/** API icon slug + brand color for each goal category. */
export const GOAL_CATEGORY_META: Record<
  GoalCategory,
  { icon: string; color: string }
> = {
  emergency: { icon: "shield", color: "#EF4444" },
  retirement: { icon: "umbrella-beach", color: "#8B5CF6" },
  housing: { icon: "house", color: "#3B82F6" },
  education: { icon: "graduation-cap", color: "#10B981" },
  travel: { icon: "plane", color: "#F59E0B" },
  vehicle: { icon: "car", color: "#7C3AED" },
  business: { icon: "briefcase", color: "#6366F1" },
  other: { icon: "star", color: "#6B7280" },
};

export type Goal = {
  id: string;
  userId?: string;
  title: string;
  category: GoalCategory;
  priority: number;
  description?: string;
  yearsRemaining: number;
  current: number;
  target: number;
  completed: boolean;
  completedDate?: string;
  targetDate?: string;
  /** Backend-computed: monthly contribution needed to reach the goal */
  monthlyContributionNeeded: number;
  /** Backend-computed: probability of achieving the goal (0-100) */
  probability: number;
  createdAt?: string;
  updatedAt?: string;
};

export type GoalsMeta = {
  total: number;
  totalMonthlyNeeded: number;
  totalCurrentSaved: number;
};

export type Scenario = {
  id: string;
  label: string;
  monthlyReturnRate: number;
  inflationRate: number;
  description: string;
  /** Multiplier applied to monthly surplus/contributions for scenario modelling. */
  monthlyMultiplier?: number;
};

export type ApiError = {
  code: string;
  message: string;
  details?: { field: string; message: string }[];
};

export const goalsData = {
  goals: [
    {
      id: "vac",
      title: "Vacation Home",
      category: "housing" as GoalCategory,
      priority: 1,
      description: "Purchase a vacation property for family retreats.",
      yearsRemaining: 4,
      current: 340000,
      target: 850000,
      completed: false,
      targetDate: "2030-03-31",
      monthlyContributionNeeded: 10417,
      probability: 82,
    },
    {
      id: "edu",
      title: "Children Education",
      category: "education" as GoalCategory,
      priority: 2,
      description: "College and university fund for the children.",
      yearsRemaining: 12,
      current: 180000,
      target: 400000,
      completed: false,
      targetDate: "2038-03-31",
      monthlyContributionNeeded: 1528,
      probability: 91,
    },
    {
      id: "biz",
      title: "Business Venture",
      category: "business" as GoalCategory,
      priority: 3,
      description: "Seed capital for launching a new business.",
      yearsRemaining: 2,
      current: 175000,
      target: 250000,
      completed: false,
      targetDate: "2028-03-31",
      monthlyContributionNeeded: 3125,
      probability: 76,
    },
    {
      id: "car",
      title: "Dream Car Purchase",
      category: "vehicle" as GoalCategory,
      priority: 4,
      description: "Fund for purchasing a dream car outright.",
      yearsRemaining: 1,
      current: 85000,
      target: 120000,
      completed: false,
      targetDate: "2027-03-31",
      monthlyContributionNeeded: 2917,
      probability: 68,
    },
    {
      id: "wedding",
      title: "Daughter's Wedding Fund",
      category: "other" as GoalCategory,
      priority: 5,
      description: "Special fund for daughter's future wedding.",
      yearsRemaining: 5,
      current: 65000,
      target: 100000,
      completed: false,
      targetDate: "2031-03-31",
      monthlyContributionNeeded: 583,
      probability: 88,
    },
    {
      id: "emergency",
      title: "Emergency Fund",
      category: "emergency" as GoalCategory,
      priority: 6,
      yearsRemaining: 0,
      current: 85000,
      target: 85000,
      completed: true,
      completedDate: "December 2025",
      monthlyContributionNeeded: 0,
      probability: 100,
    },
    {
      id: "debt",
      title: "Credit Card Debt Elimination",
      category: "other" as GoalCategory,
      priority: 7,
      yearsRemaining: 0,
      current: 35000,
      target: 35000,
      completed: true,
      completedDate: "August 2024",
      monthlyContributionNeeded: 0,
      probability: 100,
    },
    {
      id: "renovation",
      title: "Home Renovation",
      category: "housing" as GoalCategory,
      priority: 8,
      yearsRemaining: 0,
      current: 120000,
      target: 120000,
      completed: true,
      completedDate: "March 2025",
      monthlyContributionNeeded: 0,
      probability: 100,
    },
  ] as Goal[],
  scenarios: [
    {
      id: "scenario-1",
      label: "Salary Increase",
      description:
        "Monthly contribution pressure reduces; probability improves slightly.",
      monthlyReturnRate: 0.006,
      inflationRate: 0.025,
    },
    {
      id: "scenario-2",
      label: "Market Downturn",
      description:
        "More contribution required to stay on track; probability drops.",
      monthlyReturnRate: 0.002,
      inflationRate: 0.04,
    },
    {
      id: "scenario-3",
      label: "Early Retirement",
      description:
        "Shorter runway; contribution required increases; probability reduces.",
      monthlyReturnRate: 0.005,
      inflationRate: 0.03,
    },
    {
      id: "scenario-4",
      label: "Property Purchase",
      description:
        "Liquidity impact; contribution requirement increases slightly.",
      monthlyReturnRate: 0.0055,
      inflationRate: 0.03,
    },
  ] as Scenario[],
  meta: {
    total: 8,
    totalMonthlyNeeded: 18570,
    totalCurrentSaved: 1085000,
  } as GoalsMeta,
};

// ============================================================================
// ADVISOR DATA
// ============================================================================

export type Advisor = {
  initials: string;
  name: string;
  title: string;
  credentials: string[];
  location: string;
  email: string;
  phone: string;
  availability: "available" | "limited" | "away";
  bio: string;
  specialties: string[];
  philosophy: string;
};

export type ActionItem = {
  id: string;
  label: string;
  dueLabel: string;
  done: boolean;
};
export type Note = { id: string; dateLabel: string; text: string };
export type Meeting = {
  title: string;
  dateLabel: string;
  type: "review" | "checkin";
  status: "scheduled" | "requested";
};

export const advisorData = {
  advisor: {
    initials: "JA",
    name: "Jude Addo",
    title: "Senior Wealth Advisor",
    credentials: ["CFP®", "CFA"],
    location: "New York, USA",
    email: "j.addo@celerey.co",
    phone: "+1 (555) 012-9090",
    availability: "limited" as const,
    bio: "James supports high-net-worth families with long-term portfolio strategy, tax-aware planning, and risk management.",
    specialties: [
      "Tax-aware investing",
      "Retirement & longevity planning",
      "Trust & estate coordination",
      "Concentrated equity mitigation",
    ],
    philosophy:
      "Build a portfolio you can stick with. We aim for durable plans: resilient in drawdowns, sensible in good years, and aligned with the life you want.",
  } as Advisor,
  upcomingMeeting: {
    title: "Quarterly Review",
    dateLabel: "Jan 18, 2024 at 10:00 AM",
    type: "review" as const,
    status: "scheduled" as const,
  } as Meeting,
  actionItems: [
    {
      id: "a1",
      label: "Review trust structure proposal",
      dueLabel: "Due Jan 20, 2026",
      done: false,
    },
    {
      id: "a2",
      label: "Update risk profile questionnaire",
      dueLabel: "Due Jan 25, 2026",
      done: false,
    },
    {
      id: "a3",
      label: "Confirm updated IPS",
      dueLabel: "Due Jan 10, 2026",
      done: true,
    },
  ] as ActionItem[],
  notes: [
    {
      id: "n1",
      dateLabel: "Jan 5, 2024",
      text: "Discussed tax optimization strategies. Alexandra to review trust structure documentation.",
    },
    {
      id: "n2",
      dateLabel: "Dec 15, 2023",
      text: "Annual review completed. All goals on track. Adjusted retirement projections based on salary increase.",
    },
  ] as Note[],
};

// ============================================================================
// AI INSIGHTS
// ============================================================================

export type AIInsight = {
  id: string;
  kind: "opportunity" | "risk" | "milestone" | "action";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  cta?: { label: string };
};

export const aiInsights: AIInsight[] = [
  {
    id: "optimize-tax",
    kind: "opportunity",
    title: "Optimize Tax Position",
    description:
      "You could save approximately $12,400 annually by restructuring your investment income through a family trust.",
    priority: "high",
    cta: { label: "Discuss with Advisor" },
  },
  {
    id: "concentration",
    kind: "risk",
    title: "Portfolio Concentration",
    description:
      "Technology stocks represent 35% of your equity allocation. Consider diversifying to reduce sector risk.",
    priority: "medium",
    cta: { label: "Review Portfolio" },
  },
  {
    id: "milestone",
    kind: "milestone",
    title: "Goal Milestone Reached",
    description:
      "Your vacation home fund has crossed the 40% threshold. You're 6 months ahead of schedule.",
    priority: "low",
    cta: { label: "View Details" },
  },
  {
    id: "insurance",
    kind: "action",
    title: "Insurance Renewal Due",
    description:
      "Primary Residence Insurance renews in 17 days. Review coverage before auto-renewing.",
    priority: "medium",
    cta: { label: "Review Now" },
  },
];

// ============================================================================
// LOCATION DISTRIBUTION DATA
// ============================================================================

export type LocationEntry = {
  country: string;
  city: string;
  value: number;
  propertyType: string;
  propertyName: string;
};

export const locationDistributionData: LocationEntry[] = [
  {
    country: "USA",
    city: "New York",
    value: 850000,
    propertyType: "house",
    propertyName: "Primary Residence",
  },
  {
    country: "Australia",
    city: "Sydney",
    value: 620000,
    propertyType: "apartment",
    propertyName: "Rental Unit",
  },
  {
    country: "Ghana",
    city: "Accra",
    value: 320000,
    propertyType: "house",
    propertyName: "Beach House",
  },
  {
    country: "Nigeria",
    city: "Lagos",
    value: 40000,
    propertyType: "house",
    propertyName: "Beach House",
  },
];

// ============================================================================
// UTILS
// ============================================================================

export const GHS_PER_USD = 12.5;

export type NetWorthFx = {
  investmentCurrency: string;
  baseCurrency: string;
  basePerInvestment: number;
};

export function getInvestmentCurrency(
  user?: Pick<User, "currency" | "investment_currency"> | null,
): string {
  return user?.investment_currency ?? user?.currency ?? "USD";
}

export function getNetWorthFx(
  user?: Pick<User, "currency" | "investment_currency"> | null,
): NetWorthFx | undefined {
  const baseCurrency = user?.currency ?? "USD";
  const investmentCurrency = getInvestmentCurrency(user);
  if (investmentCurrency === baseCurrency) return undefined;
  return {
    investmentCurrency,
    baseCurrency,
    basePerInvestment: GHS_PER_USD,
  };
}

function toBaseCurrency(amount: number, fx?: NetWorthFx): number {
  if (!fx) return amount;
  return amount * fx.basePerInvestment;
}

export const userCurrency: string = mockUser.currency;

/** Runtime default used by formatCurrency when no currency arg is passed.
 *  Call setDefaultCurrency() from the dashboard layout after store hydration
 *  so every formatCurrency() call across the app honours the user's currency. */
let _defaultCurrency = "USD";

export function setDefaultCurrency(c: string): void {
  if (c && c.length >= 3) _defaultCurrency = c.toUpperCase();
}

export function formatCurrency(n: number, currency?: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency ?? _defaultCurrency,
    maximumFractionDigits: 0,
  }).format(finiteNumber(n));
}

// ============================================================================
// NET WORTH CALCULATION
// ============================================================================

export type OtherAsset = { id: string; name: string; value: number };
export const mockOtherAssets: OtherAsset[] = [];

export type NetWorthBreakdown = {
  investmentAssets: number;
  cashAssets: number;
  propertyValues: number;
  otherAssets: OtherAsset[];
  totalOtherAssets: number;
  totalAssets: number;
  mortgageBalances: number;
  totalLiabilities: number;
  netWorth: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlySavings: number;
  savingsRate: number;
  annualPropertyInsurance: number;
  annualGeneralInsurance: number;
  totalAnnualInsurance: number;
  monthlyInsuranceCost: number;
  debtToAssetRatio: number;
  liquidityRatio: number;
  insuranceToIncomeRatio: number;
  investmentByType: { type: string; value: number }[];
  propertyBreakdown: {
    name: string;
    marketValue: number;
    mortgage: number;
    equity: number;
    insuranceCost: number;
  }[];
};

export function calculateNetWorth(
  holdings: AssetHolding[] = mockHoldings,
  valuations: AssetValuation[] = mockValuations,
  properties: Property[] = mockProperties.filter((p) => p.is_active),
  income: { amount: number }[] = cashFlowData.income,
  expenses: { amount: number }[] = cashFlowData.expenses,
  otherAssets: OtherAsset[] = mockOtherAssets,
  fx?: NetWorthFx,
): NetWorthBreakdown {
  const activeHoldings = holdings.filter((h) => h.is_active);
  const typeMap = new Map<string, number>();
  let investmentAssets = 0;
  let cashAssets = 0;

  for (const h of activeHoldings) {
    const val = toBaseCurrency(currentValue(h, valuations), fx);
    if (h.asset_type === "cash") cashAssets += val;
    else investmentAssets += val;
    typeMap.set(h.asset_type, (typeMap.get(h.asset_type) ?? 0) + val);
  }

  const investmentByType = [...typeMap.entries()]
    .map(([type, value]) => ({ type, value }))
    .sort((a, b) => b.value - a.value);

  const propertyValues = properties.reduce(
    (s, p) => s + toBaseCurrency(p.market_value, fx),
    0,
  );
  const mortgageBalances = properties.reduce(
    (s, p) => s + toBaseCurrency(totalPropertyLienBalance(p), fx),
    0,
  );
  const propertyBreakdown = properties.map((p) => ({
    name: p.name,
    marketValue: toBaseCurrency(p.market_value, fx),
    mortgage: toBaseCurrency(totalPropertyLienBalance(p), fx),
    equity: toBaseCurrency(propertyEquity(p), fx),
    insuranceCost: totalInsurancePremium(p),
  }));

  const totalOtherAssets = otherAssets.reduce((s, a) => s + a.value, 0);
  const totalAssets =
    investmentAssets + cashAssets + propertyValues + totalOtherAssets;
  const totalLiabilities = mortgageBalances;
  const netWorth = totalAssets - totalLiabilities;

  const monthlyIncome = income.reduce((s, i) => s + i.amount, 0);
  const monthlyExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const monthlySavings = monthlyIncome - monthlyExpenses;
  const savingsRate =
    monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;

  const annualPropertyInsurance = properties.reduce(
    (s, p) => s + totalInsurancePremium(p),
    0,
  );
  const annualGeneralInsurance = mockInsurancePolicies
    .filter((p) => p.is_active)
    .reduce((s, p) => s + p.premium_monthly * 12, 0);
  const totalAnnualInsurance = annualPropertyInsurance + annualGeneralInsurance;
  const monthlyInsuranceCost = Math.round(totalAnnualInsurance / 12);
  const debtToAssetRatio =
    totalAssets > 0 ? Math.round((totalLiabilities / totalAssets) * 100) : 0;
  const liquidityRatio =
    monthlyExpenses > 0
      ? Math.round((cashAssets / monthlyExpenses) * 10) / 10
      : 0;
  const annualIncome = monthlyIncome * 12;
  const insuranceToIncomeRatio =
    annualIncome > 0
      ? Math.round((totalAnnualInsurance / annualIncome) * 1000) / 10
      : 0;

  return {
    investmentAssets,
    cashAssets,
    propertyValues,
    otherAssets,
    totalOtherAssets,
    totalAssets,
    mortgageBalances,
    totalLiabilities,
    netWorth,
    monthlyIncome,
    monthlyExpenses,
    monthlySavings,
    savingsRate,
    annualPropertyInsurance,
    annualGeneralInsurance,
    totalAnnualInsurance,
    monthlyInsuranceCost,
    debtToAssetRatio,
    liquidityRatio,
    insuranceToIncomeRatio,
    investmentByType,
    propertyBreakdown,
  };
}

export type NetWorthSnapshot = {
  ts: string;
  netWorth: number;
  breakdown: NetWorthBreakdown;
};

export function createNetWorthSnapshot(
  holdings: AssetHolding[] = mockHoldings,
  valuations: AssetValuation[] = mockValuations,
  properties: Property[] = mockProperties.filter((p) => p.is_active),
  income: { amount: number }[] = cashFlowData.income,
  expenses: { amount: number }[] = cashFlowData.expenses,
): NetWorthSnapshot {
  const breakdown = calculateNetWorth(
    holdings,
    valuations,
    properties,
    income,
    expenses,
  );
  return {
    ts: new Date().toISOString(),
    netWorth: breakdown.netWorth,
    breakdown,
  };
}

export function computePercentChange(
  previous: number,
  current: number,
): number | null {
  if (!isFinite(previous) || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function recordNetWorthSnapshot(opts?: {
  dedupeDays?: number;
  maxEntries?: number;
  /** Provide the real net worth computed from store data; avoids using mock defaults. */
  netWorth?: number;
}): void {
  const ts = new Date().toISOString();
  const recordedNetWorth = opts?.netWorth ?? createNetWorthSnapshot().netWorth;
  try {
    const history = getNetWorthHistory();
    if (opts?.dedupeDays && history.length > 0) {
      const last = history[history.length - 1];
      const days =
        (new Date(ts).getTime() - new Date(last.ts).getTime()) /
        (1000 * 60 * 60 * 24);
      if (days < opts.dedupeDays) return;
    }
    const prev = history.length > 0 ? history[history.length - 1] : null;
    const rawPct = prev
      ? computePercentChange(prev.netWorth, recordedNetWorth)
      : null;
    const pct = rawPct === null ? null : Math.round(rawPct * 10) / 10;
    const trend: "up" | "down" | "flat" | undefined =
      pct === null ? undefined : pct > 0 ? "up" : pct < 0 ? "down" : "flat";
    pushNetWorthSnapshot(
      {
        ts,
        netWorth: recordedNetWorth,
        percentChange: pct,
        trend,
        previousNetWorth: prev?.netWorth ?? null,
      },
      opts?.maxEntries ?? 500,
    );
  } catch {
    /* noop */
  }
}

export function getLatestNetWorthChange(): {
  percent: number | null;
  since: string | null;
  previous?: number;
  current?: number;
} {
  const history = getNetWorthHistory();
  if (history.length === 0) return { percent: null, since: null };
  const latest = history[history.length - 1];
  const prev = history.length > 1 ? history[history.length - 2] : null;
  if (!prev) return { percent: null, since: null, current: latest.netWorth };
  const pct = computePercentChange(prev.netWorth, latest.netWorth);
  return {
    percent: pct === null ? null : Math.round(pct * 10) / 10,
    since: prev.ts,
    previous: prev.netWorth,
    current: latest.netWorth,
  };
}

// ============================================================================
// FINANCIAL SELECTORS
// ============================================================================

function _sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

function _futureValue(
  presentValue: number,
  monthlyContribution: number,
  annualReturnPct: number,
  years: number,
): number {
  const r = annualReturnPct / 100 / 12;
  const n = years * 12;
  if (r === 0) return presentValue + monthlyContribution * n;
  const growth = Math.pow(1 + r, n);
  return presentValue * growth + monthlyContribution * ((growth - 1) / r);
}

function _requiredMonthlyContribution(
  currentBalance: number,
  targetBalance: number,
  annualReturnPct: number,
  years: number,
): number {
  if (years <= 0) return 0;
  const r = annualReturnPct / 100 / 12;
  const n = years * 12;
  if (r === 0) {
    const gap = targetBalance - currentBalance;
    return gap > 0 ? gap / n : 0;
  }
  const growth = Math.pow(1 + r, n);
  const gap = targetBalance - currentBalance * growth;
  if (gap <= 0) return 0;
  return gap / ((growth - 1) / r);
}

function _computeLiquidComponents(data: FinancialDomainData): {
  liquidAssets: number;
  shortTermDebt: number;
  liquidNetWorth: number;
} {
  const liquidAssets = _sum(
    data.accounts
      .filter((a) => a.type === "cash" || a.type === "taxable")
      .map((a) => a.balance),
  );
  const shortTermTypes: Liability["type"][] = [
    "credit_card",
    "personal_loan",
    "auto_loan",
    "student_loan",
    "other",
  ];
  const shortTermDebt = _sum(
    data.liabilities
      .filter((l) => shortTermTypes.includes(l.type))
      .map((l) => l.balance),
  );
  return {
    liquidAssets,
    shortTermDebt,
    liquidNetWorth: liquidAssets - shortTermDebt,
  };
}

export function selectNetWorthBreakdown(
  data: FinancialDomainData,
): NetWorthBreakdownMetrics {
  const totalInvestments = _sum(
    data.accounts
      .filter((a) => ["taxable", "retirement", "crypto"].includes(a.type))
      .map((a) => a.balance),
  );
  const totalCash = _sum(
    data.accounts.filter((a) => a.type === "cash").map((a) => a.balance),
  );
  const totalOtherAssets = _sum(
    data.accounts.filter((a) => a.type === "other").map((a) => a.balance),
  );
  const totalPropertyValue = _sum(data.propertyAssets.map((p) => p.value));
  const totalAssets =
    totalInvestments + totalCash + totalOtherAssets + totalPropertyValue;
  const totalMortgages = _sum(
    data.liabilities.filter((l) => l.type === "mortgage").map((l) => l.balance),
  );
  const { shortTermDebt: totalShortTermDebt, liquidNetWorth } =
    _computeLiquidComponents(data);
  const totalLiabilities = totalMortgages + totalShortTermDebt;
  return {
    totalInvestments,
    totalCash,
    totalPropertyValue,
    totalOtherAssets,
    totalAssets,
    totalMortgages,
    totalShortTermDebt,
    totalLiabilities,
    totalNetWorth: totalAssets - totalLiabilities,
    liquidNetWorth,
  };
}

export function selectMonthlyIncome(data: FinancialDomainData): number {
  return _sum(data.incomeRows.map((r) => r.amount));
}

export function selectMonthlyExpenses(data: FinancialDomainData): number {
  return _sum(data.expenseCategories.map((e) => e.amount));
}

export function selectEssentialExpenses(categories: ExpenseCategory[]): number {
  return _sum(categories.filter((c) => c.essential).map((c) => c.amount));
}

export function selectCashFlowMetrics(
  data: FinancialDomainData,
): CashFlowMetrics {
  const monthlyIncome = selectMonthlyIncome(data);
  const monthlyExpenses = selectMonthlyExpenses(data);
  const monthlySurplus = monthlyIncome - monthlyExpenses;
  const savingsRate =
    monthlyIncome > 0 ? (monthlySurplus / monthlyIncome) * 100 : 0;
  const essentialExpenses = selectEssentialExpenses(data.expenseCategories);
  const discretionaryExpenses = _sum(
    data.expenseCategories.filter((c) => !c.essential).map((c) => c.amount),
  );
  const annualIncome = monthlyIncome * 12;
  const estimatedAnnualTaxes =
    (data.taxProfile.effectiveTaxRatePct / 100) * annualIncome;
  return {
    monthlyIncome,
    monthlyExpenses,
    monthlySurplus,
    savingsRate,
    essentialExpenses,
    discretionaryExpenses,
    afterTaxMonthlyIncome: (annualIncome - estimatedAnnualTaxes) / 12,
    estimatedAnnualTaxes,
  };
}

export function selectSavingsRate(data: FinancialDomainData): number {
  return selectCashFlowMetrics(data).savingsRate;
}

export function selectEmergencyFundMetrics(
  data: FinancialDomainData,
): EmergencyFundMetrics {
  const essentialExpenses = selectEssentialExpenses(data.expenseCategories);
  const totalExpenses = selectMonthlyExpenses(data);
  // Use essential expenses first; fall back to total expenses if none are marked essential
  const monthlyExpenses =
    essentialExpenses > 0 ? essentialExpenses : totalExpenses;
  const currentBalance = data.emergencyFund.currentCashBalance;
  const targetMonths = data.emergencyFund.targetMonths;
  const targetBalance = monthlyExpenses * targetMonths;
  // When expenses are 0 but balance exists, treat as well-covered (capped at 9+ in display)
  const runwayMonths =
    monthlyExpenses > 0
      ? currentBalance / monthlyExpenses
      : currentBalance > 0
        ? 10
        : 0;
  return {
    currentBalance,
    targetBalance,
    runwayMonths,
    targetMonths,
    funded: runwayMonths >= targetMonths,
    shortfallOrSurplus: currentBalance - targetBalance,
  };
}

export function selectGoalMetrics(
  goals: Goal[],
  data: FinancialDomainData,
  assumedAnnualReturnPct: number,
): GoalMetrics[] {
  const availableSurplus = selectCashFlowMetrics(data).monthlySurplus;
  return goals.map((goal) => {
    const progressPct =
      goal.target > 0 ? (goal.current / goal.target) * 100 : 100;
    const required = goal.completed
      ? 0
      : _requiredMonthlyContribution(
          goal.current,
          goal.target,
          assumedAnnualReturnPct,
          goal.yearsRemaining,
        );
    return {
      id: goal.id,
      title: goal.title,
      progressPct: Math.min(progressPct, 100),
      requiredMonthly: required,
      onTrack: goal.completed ? true : required <= availableSurplus,
      yearsRemaining: goal.yearsRemaining,
      current: goal.current,
      target: goal.target,
      completed: goal.completed,
      completedDate: goal.completedDate,
    };
  });
}

export function selectGoalMetricsForScenario(
  goals: Goal[],
  data: FinancialDomainData,
  assumedAnnualReturnPct: number,
  scenario: Scenario,
): GoalMetrics[] {
  const adjustedSurplus =
    selectCashFlowMetrics(data).monthlySurplus *
    (scenario.monthlyMultiplier ?? 1);
  return goals.map((goal) => {
    const progressPct =
      goal.target > 0 ? (goal.current / goal.target) * 100 : 100;
    const required = goal.completed
      ? 0
      : _requiredMonthlyContribution(
          goal.current,
          goal.target,
          assumedAnnualReturnPct,
          goal.yearsRemaining,
        );
    const adjustedRequired = required * (scenario.monthlyMultiplier ?? 1);
    return {
      id: goal.id,
      title: goal.title,
      progressPct: Math.min(progressPct, 100),
      requiredMonthly: adjustedRequired,
      onTrack: goal.completed ? true : adjustedRequired <= adjustedSurplus,
      yearsRemaining: goal.yearsRemaining,
      current: goal.current,
      target: goal.target,
      completed: goal.completed,
      completedDate: goal.completedDate,
    };
  });
}

export function selectRetirementOutputs(
  config: RetirementConfig,
): RetirementOutputs {
  const yearsToRetirement = config.retirementAge - config.currentAge;
  const retirementYears = Math.max(
    1,
    config.lifeExpectancy - config.retirementAge,
  );
  const realRate =
    (1 + config.expectedReturnPct / 100) / (1 + config.inflationPct / 100) - 1;
  const pvFactor =
    Math.abs(realRate) < 1e-9
      ? retirementYears
      : (1 - Math.pow(1 + realRate, -retirementYears)) / realRate;
  const effectiveSWR =
    pvFactor > 0 ? 1 / pvFactor : config.safeWithdrawalRatePct / 100;

  if (yearsToRetirement <= 0) {
    const sustainableAnnualIncome = config.currentInvested * effectiveSWR;
    return {
      yearsToRetirement: 0,
      projectedBalanceAtRetirement: config.currentInvested,
      sustainableAnnualIncome,
      sustainableMonthlyIncome: sustainableAnnualIncome / 12,
      inflationAdjustedSustainableMonthlyIncome: sustainableAnnualIncome / 12,
      incomeGap: 0,
      onTrack: true,
    };
  }

  const projectedBalanceAtRetirement =
    _futureValue(
      config.currentInvested,
      config.monthlySavings,
      config.expectedReturnPct,
      yearsToRetirement,
    ) +
    _futureValue(
      config.existingPensionBalance,
      config.monthlyPensionContribution,
      config.expectedReturnPct,
      yearsToRetirement,
    );

  const sustainableAnnualIncome = projectedBalanceAtRetirement * effectiveSWR;
  const sustainableMonthlyIncome = sustainableAnnualIncome / 12;
  const inflationFactor = Math.pow(
    1 + config.inflationPct / 100,
    yearsToRetirement,
  );
  const inflationAdjustedSustainableMonthlyIncome =
    sustainableMonthlyIncome / inflationFactor;
  const incomeGap =
    config.desiredMonthlyIncome - inflationAdjustedSustainableMonthlyIncome;

  return {
    yearsToRetirement,
    projectedBalanceAtRetirement,
    sustainableAnnualIncome,
    sustainableMonthlyIncome,
    inflationAdjustedSustainableMonthlyIncome,
    incomeGap,
    onTrack: incomeGap <= 0,
  };
}

export function selectPerformanceMetrics(
  points: PerformancePoint[],
): PerformanceMetrics {
  if (points.length === 0)
    return {
      ytdReturnPct: null,
      oneYearReturnPct: null,
      totalContributions: 0,
      totalGrowth: 0,
    };
  const sorted = [...points].sort((a, b) => a.month.localeCompare(b.month));
  const latest = sorted[sorted.length - 1]!;
  const currentYear = latest.month.slice(0, 4);
  const prevYearEnd = sorted
    .filter((p) => p.month.startsWith(`${+currentYear - 1}`))
    .pop();
  const ytdReturnPct =
    prevYearEnd && prevYearEnd.value > 0
      ? ((latest.value - prevYearEnd.value) / prevYearEnd.value) * 100
      : null;
  const oneYearAgoDate = new Date(latest.month + "-01");
  oneYearAgoDate.setFullYear(oneYearAgoDate.getFullYear() - 1);
  const oneYearAgoKey = oneYearAgoDate.toISOString().slice(0, 7);
  const oneYearAgoPoint = sorted.find((p) => p.month === oneYearAgoKey);
  const oneYearReturnPct =
    oneYearAgoPoint && oneYearAgoPoint.value > 0
      ? ((latest.value - oneYearAgoPoint.value) / oneYearAgoPoint.value) * 100
      : null;
  const totalContributions = _sum(sorted.map((p) => p.contributions));
  const totalGrowth =
    sorted.length >= 2
      ? latest.value -
        sorted[0]!.value -
        (totalContributions - sorted[0]!.contributions)
      : 0;
  return { ytdReturnPct, oneYearReturnPct, totalContributions, totalGrowth };
}

export function selectLiquidityMetrics(
  data: FinancialDomainData,
): LiquidityMetrics {
  const {
    liquidAssets,
    shortTermDebt: shortTermLiabilities,
    liquidNetWorth,
  } = _computeLiquidComponents(data);
  const essentialExpenses = selectEssentialExpenses(data.expenseCategories);
  return {
    liquidAssets,
    shortTermLiabilities,
    liquidNetWorth,
    liquidityRatio:
      essentialExpenses > 0 ? liquidAssets / essentialExpenses : 0,
  };
}

export function selectInsuranceSummary(
  policies: InsurancePolicy[],
  monthlyIncome: number,
  asOf: Date = new Date(),
): InsuranceSummaryMetrics {
  const activePolicies = policies.filter((p) => p.is_active);

  const renewals: InsuranceRenewalInfo[] = activePolicies.map((p) => {
    const daysUntilRenewal = Math.ceil(
      (new Date(p.renewal_date).getTime() - asOf.getTime()) /
        (1000 * 60 * 60 * 24),
    );
    const renewalStatus: InsuranceRenewalStatus =
      daysUntilRenewal < 0
        ? "expired"
        : daysUntilRenewal <= 60
          ? "expiring_soon"
          : "ok";
    return {
      policy_id: p.policy_id,
      name: p.name,
      category: p.category,
      renewalDate: p.renewal_date,
      daysUntilRenewal,
      renewalStatus,
      premiumMonthly: p.premium_monthly,
      coverageAmount: p.coverage_amount,
    };
  });

  const totalMonthlyPremium = activePolicies.reduce(
    (s, p) => s + p.premium_monthly,
    0,
  );
  const totalAnnualPremium = totalMonthlyPremium * 12;
  const totalCoverage = activePolicies.reduce(
    (s, p) => s + p.coverage_amount,
    0,
  );
  const annualIncome = monthlyIncome * 12;
  const premiumToIncomeRatioPct =
    annualIncome > 0
      ? Math.round((totalAnnualPremium / annualIncome) * 1000) / 10
      : 0;

  return {
    totalPolicies: activePolicies.length,
    totalMonthlyPremium,
    totalAnnualPremium,
    totalCoverage,
    expiredCount: renewals.filter((r) => r.renewalStatus === "expired").length,
    expiringSoonCount: renewals.filter(
      (r) => r.renewalStatus === "expiring_soon",
    ).length,
    premiumToIncomeRatioPct,
    renewals: renewals.sort((a, b) => a.daysUntilRenewal - b.daysUntilRenewal),
  };
}

export function selectTotalNetWorth(data: FinancialDomainData): number {
  return selectNetWorthBreakdown(data).totalNetWorth;
}

export function selectDashboardMetrics(
  data: FinancialDomainData,
  goals: Goal[],
): DashboardMetrics {
  const cashFlow = selectCashFlowMetrics(data);
  return {
    netWorth: selectNetWorthBreakdown(data),
    cashFlow,
    emergencyFund: selectEmergencyFundMetrics(data),
    goals: selectGoalMetrics(goals, data, data.retirement.expectedReturnPct),
    retirement: selectRetirementOutputs(data.retirement),
    performance: selectPerformanceMetrics(data.portfolioPerformance),
    liquidity: selectLiquidityMetrics(data),
    insurance: selectInsuranceSummary(
      data.insurancePolicies,
      cashFlow.monthlyIncome,
    ),
  };
}

export function getDashboardData() {
  const data = getFinancialDomainData();
  return { data, metrics: selectDashboardMetrics(data, goalsData.goals) };
}
