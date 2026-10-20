// store/financialStore.ts
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { financialStorageKey } from "@/lib/local-view";

import type {
  User,
  Account,
  Liability,
  Property,
  AssetHolding,
  PerformancePoint,
  AllocationSlice,
  TaxProfile,
  EmergencyFundConfig,
  InsurancePolicy,
  CashFlowRow,
  ExpenseCategory,
  SectionFreshness,
  RetirementConfig,
  CashFlowPoint,
  Goal,
  FinancialDomainData,
} from "@/lib/client-data";
import { calculateAge } from "@/lib/client-data";
import {
  computeProfileCompletionScore as computeChecklistCompletionScore,
  type ProfileStoreSnapshot,
} from "@/lib/profile-checklist";
import type {
  IdentityData,
  GoalData,
  IncomeData,
  RetirementData,
  EmergencyFundData,
} from "@/lib/onboarding/types";
import type {
  DashboardBootstrapData,
  ApiCashFlowSummary,
  RiskAssessmentResult,
} from "@/lib/dashboard-api";
import {
  getRiskBand,
  preferRiskAssessment,
} from "@/lib/dashboard-api";
import { type GoalsMeta, EMPTY_GOALS_META } from "@/lib/goals-meta";

// ── Legacy types ──────────────────────────────────────────────────────────────

export type WillStatus = "none" | "draft" | "signed" | "needs_update";

export interface WillInfo {
  status: WillStatus;
  lastUpdated?: string;
  executorName?: string;
  storageLocation?: string;
  notes?: string;
}

export interface Beneficiary {
  id: string;
  name: string;
  relationship: string;
  allocationPct: number;
  linkedAssets: string[];
  contactInfo?: string;
}

export interface Dependent {
  id: string;
  name: string;
  relationship: string;
  dateOfBirth?: string;
  financialReliance: "full" | "partial" | "minimal";
  notes?: string;
}

export interface DigitalAsset {
  id: string;
  name: string;
  type: "crypto" | "account" | "domain" | "business" | "other";
  value?: number;
  accessInstructions?: string;
  custodian?: string;
}

export interface LetterOfWishes {
  lastUpdated?: string;
  content?: string;
}

export interface LegacyState {
  will: WillInfo;
  beneficiaries: Beneficiary[];
  dependents: Dependent[];
  digitalAssets: DigitalAsset[];
  letterOfWishes: LetterOfWishes;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

interface ScoreInput {
  user: User | null;
  incomeRows: CashFlowRow[];
  expenseCategories: ExpenseCategory[];
  goals: Goal[];
  retirement: RetirementConfig;
  liabilities: Liability[];
  emergencyFund: EmergencyFundConfig;
  holdings: AssetHolding[];
  accounts: Account[];
  insurancePolicies: InsurancePolicy[];
  propertyAssets: Property[];
  riskAssessment?: RiskAssessmentResult | null;
}

function toProfileStoreSnapshot(s: ScoreInput): ProfileStoreSnapshot {
  return {
    user: s.user,
    incomeRows: s.incomeRows,
    expenseCategories: s.expenseCategories,
    goals: s.goals,
    retirement: s.retirement,
    liabilities: s.liabilities,
    propertyAssets: s.propertyAssets,
    emergencyFund: s.emergencyFund,
    holdings: s.holdings,
    accounts: s.accounts,
    insurancePolicies: s.insurancePolicies,
    riskAssessment: s.riskAssessment ?? null,
  };
}

function computeProfileCompletionScore(s: ScoreInput): number {
  return computeChecklistCompletionScore(toProfileStoreSnapshot(s));
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_TAX_PROFILE: TaxProfile = {
  effectiveTaxRatePct: 0,
  marginalTaxRatePct: 0,
  filingStatus: "single",
  updatedAt: new Date().toISOString(),
};

const DEFAULT_EMERGENCY_FUND: EmergencyFundConfig = {
  targetMonths: 6,
  currentCashBalance: 0,
  includeAccountIds: [],
  updatedAt: new Date().toISOString(),
};

const DEFAULT_RETIREMENT: RetirementConfig = {
  currentAge: 0,
  retirementAge: 0,
  lifeExpectancy: 85,
  currentInvested: 0,
  monthlySavings: 0,
  existingPensionBalance: 0,
  monthlyPensionContribution: 0,
  expectedReturnPct: 7,
  inflationPct: 2,
  safeWithdrawalRatePct: 4,
  desiredMonthlyIncome: 0,
};

export const DEFAULT_LEGACY: LegacyState = {
  will: { status: "none" },
  beneficiaries: [],
  dependents: [],
  digitalAssets: [],
  letterOfWishes: {},
};

// ── Seeding helper type ───────────────────────────────────────────────────────

/** Relevant slice of OnboardingState consumed by seedFromOnboarding. */
interface OnboardingSeedData {
  identity: IdentityData | null;
  goals: GoalData[];
  incomes: IncomeData[];
  retirement: RetirementData | null;
  emergencyFund: EmergencyFundData | null;
}

// ── Store shape ───────────────────────────────────────────────────────────────

interface FinancialState extends Omit<FinancialDomainData, "propertyAssets"> {
  user: User | null;
  goals: Goal[];
  goalsMeta: GoalsMeta;
  /** Rich property objects — overrides the lightweight PropertyAsset[] in FinancialDomainData. */
  propertyAssets: Property[];
  /** Rich asset holdings — separate from the lightweight Account[] kept for selector compat. */
  holdings: AssetHolding[];
  legacy: LegacyState;
  /** Latest risk assessment from the API — source of truth for quiz completion. */
  riskAssessment: RiskAssessmentResult | null;

  setUser: (user: User | null) => void;
  setRiskAssessment: (assessment: RiskAssessmentResult | null) => void;
  setGoals: (goals: Goal[]) => void;
  setGoalsMeta: (meta: GoalsMeta) => void;
  setIncome: (rows: CashFlowRow[]) => void;
  setExpenses: (categories: ExpenseCategory[]) => void;
  setLiabilities: (liabilities: Liability[]) => void;
  addLiability: (liability: Liability) => void;
  updateLiability: (id: string, patch: Partial<Omit<Liability, "id">>) => void;
  removeLiability: (id: string) => void;
  setRetirement: (config: RetirementConfig) => void;
  setEmergencyFund: (config: EmergencyFundConfig) => void;
  setHoldings: (holdings: AssetHolding[]) => void;
  setPropertyAssets: (props: Property[]) => void;
  setCashFlowHistory: (points: CashFlowPoint[]) => void;
  cashFlowSummary: ApiCashFlowSummary | null;
  setCashFlowSummary: (summary: ApiCashFlowSummary | null) => void;
  setInsurancePolicies: (policies: InsurancePolicy[]) => void;
  addProperty: (property: Property) => void;
  updateProperty: (property: Property) => void;
  removeProperty: (id: string) => void;
  addInsurancePolicy: (policy: InsurancePolicy) => void;
  removeInsurancePolicy: (policyId: string) => void;
  addGoal: (goal: Goal) => void;
  updateGoal: (goal: Goal) => void;
  removeGoal: (id: string) => void;
  addCashFlowPoint: (point: CashFlowPoint) => void;
  setWill: (will: WillInfo) => void;
  addBeneficiary: (b: Beneficiary) => void;
  updateBeneficiary: (b: Beneficiary) => void;
  removeBeneficiary: (id: string) => void;
  addDependent: (d: Dependent) => void;
  updateDependent: (d: Dependent) => void;
  removeDependent: (id: string) => void;
  addDigitalAsset: (a: DigitalAsset) => void;
  updateDigitalAsset: (a: DigitalAsset) => void;
  removeDigitalAsset: (id: string) => void;
  setLetterOfWishes: (letter: LetterOfWishes) => void;
  seedFromOnboarding: (data: OnboardingSeedData) => void;
  /**
   * Replace live sections with fresh data fetched from the API.
   * Preserves user, retirement config (seeded at onboarding), legacy state,
   * and liabilities (not yet managed via API).
   */
  hydrateFromApi: (data: DashboardBootstrapData) => void;
  profileCompletionScore: number;
}

// ── Initial state ─────────────────────────────────────────────────────────────

type FinancialData = Omit<
  FinancialState,
  | "setUser"
  | "setRiskAssessment"
  | "setGoals"
  | "setGoalsMeta"
  | "setIncome"
  | "setExpenses"
  | "setLiabilities"
  | "addLiability"
  | "updateLiability"
  | "removeLiability"
  | "setRetirement"
  | "setEmergencyFund"
  | "setHoldings"
  | "setPropertyAssets"
  | "setCashFlowHistory"
  | "setCashFlowSummary"
  | "setInsurancePolicies"
  | "addProperty"
  | "updateProperty"
  | "removeProperty"
  | "addInsurancePolicy"
  | "removeInsurancePolicy"
  | "addGoal"
  | "updateGoal"
  | "removeGoal"
  | "addCashFlowPoint"
  | "setWill"
  | "addBeneficiary"
  | "updateBeneficiary"
  | "removeBeneficiary"
  | "addDependent"
  | "updateDependent"
  | "removeDependent"
  | "addDigitalAsset"
  | "updateDigitalAsset"
  | "removeDigitalAsset"
  | "setLetterOfWishes"
  | "seedFromOnboarding"
  | "hydrateFromApi"
>;

const INITIAL_STATE: FinancialData = {
  user: null,
  goals: [],
  goalsMeta: EMPTY_GOALS_META,
  accounts: [],
  holdings: [],
  liabilities: [],
  propertyAssets: [],
  portfolioPerformance: [],
  allocation: [],
  taxProfile: DEFAULT_TAX_PROFILE,
  emergencyFund: DEFAULT_EMERGENCY_FUND,
  insurancePolicies: [],
  incomeRows: [],
  expenseCategories: [],
  freshness: [],
  retirement: DEFAULT_RETIREMENT,
  cashFlowHistory: [],
  cashFlowSummary: null,
  riskAssessment: null,
  legacy: DEFAULT_LEGACY,
  profileCompletionScore: 0,
};

/** Exposed for session-reset utilities — use `resetSession()` rather than this directly. */
export const FINANCIAL_STORE_INITIAL_STATE = INITIAL_STATE;

// ── Store ─────────────────────────────────────────────────────────────────────

export const useFinancialStore = create<FinancialState>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,

      setUser: (user) =>
        set((s) => {
          const band = getRiskBand(s.riskAssessment);
          const mergedUser =
            user && band && !user.risk_profile
              ? { ...user, risk_profile: band as User["risk_profile"] }
              : user;
          const n = { ...s, user: mergedUser };
          return {
            user: mergedUser,
            profileCompletionScore: computeProfileCompletionScore(n),
          };
        }),

      setRiskAssessment: (riskAssessment) =>
        set((s) => {
          const resolved = preferRiskAssessment(
            riskAssessment,
            s.riskAssessment,
          );
          const band = getRiskBand(resolved);
          const user =
            s.user && band
              ? { ...s.user, risk_profile: band as User["risk_profile"] }
              : s.user;
          const n = { ...s, riskAssessment: resolved, user };
          return {
            riskAssessment: resolved,
            user,
            profileCompletionScore: computeProfileCompletionScore(n),
          };
        }),

      setGoals: (goals) =>
        set((s) => {
          const n = { ...s, goals };
          return {
            goals,
            profileCompletionScore: computeProfileCompletionScore(n),
          };
        }),

      setGoalsMeta: (goalsMeta) => set({ goalsMeta }),

      setIncome: (rows) =>
        set((s) => {
          const n = { ...s, incomeRows: rows };
          return {
            incomeRows: rows,
            profileCompletionScore: computeProfileCompletionScore(n),
          };
        }),

      setExpenses: (categories) =>
        set((s) => {
          const n = { ...s, expenseCategories: categories };
          return {
            expenseCategories: categories,
            profileCompletionScore: computeProfileCompletionScore(n),
          };
        }),

      setLiabilities: (liabilities) =>
        set((s) => ({
          liabilities,
          profileCompletionScore: computeProfileCompletionScore({
            ...s,
            liabilities,
          }),
        })),

      addLiability: (liability) =>
        set((s) => {
          const liabilities = [...s.liabilities, liability];
          return {
            liabilities,
            profileCompletionScore: computeProfileCompletionScore({
              ...s,
              liabilities,
            }),
          };
        }),

      updateLiability: (id, patch) =>
        set((s) => {
          const liabilities = s.liabilities.map((l) =>
            l.id === id
              ? { ...l, ...patch, updatedAt: new Date().toISOString() }
              : l,
          );
          return {
            liabilities,
            profileCompletionScore: computeProfileCompletionScore({
              ...s,
              liabilities,
            }),
          };
        }),

      removeLiability: (id) =>
        set((s) => {
          const liabilities = s.liabilities.filter((l) => l.id !== id);
          return {
            liabilities,
            profileCompletionScore: computeProfileCompletionScore({
              ...s,
              liabilities,
            }),
          };
        }),

      setRetirement: (config) =>
        set((s) => {
          const n = { ...s, retirement: config };
          return {
            retirement: config,
            profileCompletionScore: computeProfileCompletionScore(n),
          };
        }),

      setEmergencyFund: (config) =>
        set((s) => {
          const n = { ...s, emergencyFund: config };
          return {
            emergencyFund: config,
            profileCompletionScore: computeProfileCompletionScore(n),
          };
        }),

      setHoldings: (holdings) =>
        set((s) => {
          const n = { ...s, holdings };
          return {
            holdings,
            profileCompletionScore: computeProfileCompletionScore(n),
          };
        }),

      setPropertyAssets: (propertyAssets) =>
        set((s) => {
          const n = { ...s, propertyAssets };
          return {
            propertyAssets,
            profileCompletionScore: computeProfileCompletionScore(n),
          };
        }),

      setCashFlowHistory: (cashFlowHistory) => set(() => ({ cashFlowHistory })),
      setCashFlowSummary: (cashFlowSummary) => set(() => ({ cashFlowSummary })),

      setInsurancePolicies: (insurancePolicies) =>
        set((s) => {
          const n = { ...s, insurancePolicies };
          return {
            insurancePolicies,
            profileCompletionScore: computeProfileCompletionScore(n),
          };
        }),

      addProperty: (property) =>
        set((s) => {
          const propertyAssets = [...s.propertyAssets, property];
          return {
            propertyAssets,
            profileCompletionScore: computeProfileCompletionScore({
              ...s,
              propertyAssets,
            }),
          };
        }),

      updateProperty: (property) =>
        set((s) => {
          const propertyAssets = s.propertyAssets.map((p) =>
            p.property_id === property.property_id ? property : p,
          );
          return {
            propertyAssets,
            profileCompletionScore: computeProfileCompletionScore({
              ...s,
              propertyAssets,
            }),
          };
        }),

      removeProperty: (id) =>
        set((s) => {
          const propertyAssets = s.propertyAssets.filter(
            (p) => p.property_id !== id,
          );
          return {
            propertyAssets,
            profileCompletionScore: computeProfileCompletionScore({
              ...s,
              propertyAssets,
            }),
          };
        }),

      addInsurancePolicy: (policy) =>
        set((s) => {
          const insurancePolicies = [...s.insurancePolicies, policy];
          return {
            insurancePolicies,
            profileCompletionScore: computeProfileCompletionScore({
              ...s,
              insurancePolicies,
            }),
          };
        }),

      removeInsurancePolicy: (policyId) =>
        set((s) => {
          const insurancePolicies = s.insurancePolicies.filter(
            (p) => p.policy_id !== policyId,
          );
          return {
            insurancePolicies,
            profileCompletionScore: computeProfileCompletionScore({
              ...s,
              insurancePolicies,
            }),
          };
        }),

      addGoal: (goal) =>
        set((s) => {
          const goals = [...s.goals, goal];
          return {
            goals,
            profileCompletionScore: computeProfileCompletionScore({
              ...s,
              goals,
            }),
          };
        }),

      updateGoal: (goal) =>
        set((s) => {
          const goals = s.goals.map((g) => (g.id === goal.id ? goal : g));
          return {
            goals,
            profileCompletionScore: computeProfileCompletionScore({
              ...s,
              goals,
            }),
          };
        }),

      removeGoal: (id) =>
        set((s) => {
          const goals = s.goals.filter((g) => g.id !== id);
          return {
            goals,
            profileCompletionScore: computeProfileCompletionScore({
              ...s,
              goals,
            }),
          };
        }),

      addCashFlowPoint: (point) =>
        set((s) => {
          if (s.cashFlowHistory.some((p) => p.month === point.month)) return s;
          const cashFlowHistory = [...s.cashFlowHistory, point];
          return {
            cashFlowHistory,
            profileCompletionScore: computeProfileCompletionScore(s),
          };
        }),

      setWill: (will) =>
        set((s) => ({
          legacy: { ...s.legacy, will },
          profileCompletionScore: computeProfileCompletionScore(s),
        })),

      addBeneficiary: (b) =>
        set((s) => ({
          legacy: {
            ...s.legacy,
            beneficiaries: [...s.legacy.beneficiaries, b],
          },
          profileCompletionScore: computeProfileCompletionScore(s),
        })),

      updateBeneficiary: (b) =>
        set((s) => ({
          legacy: {
            ...s.legacy,
            beneficiaries: s.legacy.beneficiaries.map((x) =>
              x.id === b.id ? b : x,
            ),
          },
          profileCompletionScore: computeProfileCompletionScore(s),
        })),

      removeBeneficiary: (id) =>
        set((s) => ({
          legacy: {
            ...s.legacy,
            beneficiaries: s.legacy.beneficiaries.filter((x) => x.id !== id),
          },
          profileCompletionScore: computeProfileCompletionScore(s),
        })),

      addDependent: (d) =>
        set((s) => ({
          legacy: {
            ...s.legacy,
            dependents: [...s.legacy.dependents, d],
          },
          profileCompletionScore: computeProfileCompletionScore(s),
        })),

      updateDependent: (d) =>
        set((s) => ({
          legacy: {
            ...s.legacy,
            dependents: s.legacy.dependents.map((x) => (x.id === d.id ? d : x)),
          },
          profileCompletionScore: computeProfileCompletionScore(s),
        })),

      removeDependent: (id) =>
        set((s) => ({
          legacy: {
            ...s.legacy,
            dependents: s.legacy.dependents.filter((x) => x.id !== id),
          },
          profileCompletionScore: computeProfileCompletionScore(s),
        })),

      addDigitalAsset: (a) =>
        set((s) => ({
          legacy: {
            ...s.legacy,
            digitalAssets: [...s.legacy.digitalAssets, a],
          },
          profileCompletionScore: computeProfileCompletionScore(s),
        })),

      updateDigitalAsset: (a) =>
        set((s) => ({
          legacy: {
            ...s.legacy,
            digitalAssets: s.legacy.digitalAssets.map((x) =>
              x.id === a.id ? a : x,
            ),
          },
          profileCompletionScore: computeProfileCompletionScore(s),
        })),

      removeDigitalAsset: (id) =>
        set((s) => ({
          legacy: {
            ...s.legacy,
            digitalAssets: s.legacy.digitalAssets.filter((x) => x.id !== id),
          },
          profileCompletionScore: computeProfileCompletionScore(s),
        })),

      setLetterOfWishes: (letter) =>
        set((s) => ({
          legacy: { ...s.legacy, letterOfWishes: letter },
          profileCompletionScore: computeProfileCompletionScore(s),
        })),

      seedFromOnboarding: ({
        identity,
        goals,
        incomes,
        retirement,
        emergencyFund,
      }) => {
        const timestamp = new Date().toISOString();

        // --- User ---
        const user: User | null = identity
          ? {
              user_id: uid(),
              email: "",
              resident_country: identity.resident_country,
              currency: identity.currency,
              is_active: true,
              created_at: timestamp,
              updated_at: timestamp,
              user_type: "regular",
              first_name: identity.first_name,
              last_name: identity.last_name,
              display_name: identity.display_name,
              phone_number: identity.phone_number,
              city: identity.resident_city,
              resident_state: identity.resident_state,
              date_of_birth: identity.date_of_birth,
              gender: identity.gender,
              prefix: identity.prefix,
              occupation: identity.occupation,
              marital_status: identity.marital_status as User["marital_status"],
              account_mode: identity.account_mode,
            }
          : null;

        // --- Income rows ---
        const incomeRows: CashFlowRow[] = incomes.map((inc) => ({
          id: uid(),
          name: inc.name,
          amount: Number(inc.amount_monthly) || 0,
          isRecurring: inc.is_recurring,
          recurringType: inc.is_recurring
            ? ("monthly" as const)
            : ("one-time" as const),
        }));

        // --- Goals ---
        const msPerYear = 1000 * 60 * 60 * 24 * 365.25;
        const mappedGoals: Goal[] = goals.map((g, idx) => {
          const targetDate = g.target_date
            ? new Date(g.target_date).toISOString().split("T")[0]
            : undefined;
          const yearsRemaining = Math.max(
            0,
            Math.round(
              (new Date(g.target_date).getTime() - Date.now()) / msPerYear,
            ),
          );
          return {
            id: uid(),
            title: g.title,
            category: "other" as const,
            priority: idx + 1,
            target: Number(g.target_amount) || 0,
            current: 0,
            yearsRemaining,
            completed: false,
            targetDate,
            monthlyContributionNeeded: 0,
            probability: 50,
          };
        });

        // --- Retirement config ---
        let retirementConfig: RetirementConfig = { ...DEFAULT_RETIREMENT };
        if (retirement) {
          const currentAge = identity?.date_of_birth
            ? calculateAge(identity.date_of_birth)
            : 0;

          const retirementAge =
            retirement.retirement_target_year !== undefined
              ? retirement.retirement_target_year -
                new Date().getFullYear() +
                currentAge
              : 0;

          retirementConfig = {
            ...DEFAULT_RETIREMENT,
            currentAge,
            retirementAge: Math.max(0, retirementAge),
            monthlySavings: Number(retirement.monthly_savings) || 0,
            currentInvested: 0,
            existingPensionBalance: 0,
            monthlyPensionContribution: 0,
            desiredMonthlyIncome:
              Number(retirement.desired_monthly_income) || 0,
            storageLocation: retirement.storage_location,
          };
        }

        const emergencyFundConfig: EmergencyFundConfig = emergencyFund
          ? {
              currentCashBalance: Number(emergencyFund.cash_balance) || 0,
              targetMonths: emergencyFund.target_months,
              storageLocation: emergencyFund.storage_location,
              includeAccountIds: [],
              updatedAt: timestamp,
            }
          : DEFAULT_EMERGENCY_FUND;

        const seedData = {
          user,
          incomeRows,
          goals: mappedGoals,
          retirement: retirementConfig,
          liabilities: [] as Liability[],
          expenseCategories: [] as ExpenseCategory[],
          accounts: [] as Account[],
          holdings: [] as AssetHolding[],
          propertyAssets: [] as Property[],
          insurancePolicies: [] as InsurancePolicy[],
          emergencyFund: emergencyFundConfig,
        };

        set({
          ...seedData,
          legacy: DEFAULT_LEGACY,
          profileCompletionScore: computeProfileCompletionScore(seedData),
        });
      },

      hydrateFromApi: ({
        goals,
        incomeRows,
        expenseCategories,
        emergencyFund,
        cashFlowHistory,
        cashFlowSummary,
        holdings,
        insurancePolicies,
        propertyAssets,
        liabilities,
        retirement,
        riskAssessment,
      }) => {
        const timestamp = new Date().toISOString();
        set((s) => {
          const emergencyFundConfig: EmergencyFundConfig = emergencyFund
            ? {
                currentCashBalance: Number(emergencyFund.cash_balance) || 0,
                targetMonths: emergencyFund.target_months ?? 6,
                storageLocation:
                  emergencyFund.storage_location ??
                  s.emergencyFund.storageLocation,
                includeAccountIds: [],
                updatedAt: timestamp,
                computed: emergencyFund.computed
                  ? {
                      monthlyBaseline: emergencyFund.computed.monthly_baseline,
                      targetAmount: emergencyFund.computed.target_amount,
                      runwayMonths: emergencyFund.computed.runway_months,
                      fundedPct: emergencyFund.computed.funded_pct,
                      shortfall: emergencyFund.computed.shortfall,
                    }
                  : s.emergencyFund.computed,
              }
            : s.emergencyFund;

          // Only overwrite retirement from API if we got a real response.
          // Always recalculate currentAge from DOB — never trust the stored value.
          let retirementConfig: RetirementConfig = retirement ?? s.retirement;
          if (retirement) {
            const dob = s.user?.date_of_birth;
            retirementConfig = {
              ...retirementConfig,
              currentAge: dob ? calculateAge(dob) : retirementConfig.currentAge,
            };
          }

          // Derive goalsMeta from the goals returned by the API.
          const activeGoals = goals.filter((g) => !g.completed);
          const computedGoalsMeta: GoalsMeta = {
            totalMonthlyNeeded: activeGoals.reduce(
              (sum, g) => sum + (g.monthlyContributionNeeded || 0),
              0,
            ),
            totalGoals: goals.length,
            completedGoals: goals.filter((g) => g.completed).length,
            activeGoals: activeGoals.length,
          };

          const resolvedRiskAssessment = preferRiskAssessment(
            riskAssessment,
            s.riskAssessment,
          );
          const band = getRiskBand(resolvedRiskAssessment);
          const user =
            s.user && band
              ? { ...s.user, risk_profile: band as User["risk_profile"] }
              : s.user;

          const next = {
            ...s,
            user,
            goals,
            goalsMeta: computedGoalsMeta,
            incomeRows,
            expenseCategories,
            emergencyFund: emergencyFundConfig,
            cashFlowHistory,
            cashFlowSummary:
              cashFlowSummary !== undefined
                ? cashFlowSummary
                : s.cashFlowSummary,
            holdings,
            insurancePolicies,
            propertyAssets,
            liabilities,
            retirement: retirementConfig,
            riskAssessment: resolvedRiskAssessment,
          };
          return {
            ...next,
            profileCompletionScore: computeProfileCompletionScore(next),
          };
        });
      },
    }),
    {
      name: "financial-store-v2",
      storage: createJSONStorage(() => ({
        getItem: () => {
          if (typeof window === "undefined") return null;
          return window.localStorage.getItem(financialStorageKey());
        },
        setItem: (_name, value) => {
          if (typeof window === "undefined") return;
          window.localStorage.setItem(financialStorageKey(), value);
        },
        removeItem: () => {
          if (typeof window === "undefined") return;
          window.localStorage.removeItem(financialStorageKey());
        },
      })),
      /**
       * Defer localStorage hydration until after the first render so the
       * server-rendered HTML (which uses INITIAL_STATE) and the client's
       * first paint both produce the same output — eliminating the React
       * hydration mismatch.  The dashboard layout calls
       * `useFinancialStore.persist.rehydrate()` inside a `useEffect` so
       * real data loads immediately after mount.
       */
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.profileCompletionScore = computeProfileCompletionScore(state);
        }
      },
    },
  ),
);
