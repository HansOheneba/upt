// lib/onboarding/types.ts

export interface IdentityData {
  /** Nullable — only collected for solo accounts */
  first_name?: string;
  /** Nullable — only collected for solo accounts */
  last_name?: string;
  /**
   * Single display name used everywhere in the UI.
   * For solo accounts: derived as `first_name + last_name`.
   * For partner/family accounts: entered directly as the household name.
   */
  display_name?: string;
  /** Nullable — only collected for solo accounts */
  date_of_birth?: string;
  /** Injected from auth state before API submission */
  email?: string;
  phone_number: string;
  resident_country: string;
  resident_state?: string;
  resident_city: string;
  currency: string;
  account_mode: "solo" | "partner" | "family";
  marital_status?: string;
  occupation?: string;
  /** Solo accounts only — e.g. "Mr", "Mrs", "Dr" */
  prefix?: string;
  /** Solo accounts only — "M", "F", "O", "X" */
  gender?: string;
}

export interface GoalData {
  title: string;
  target_amount: number;
  target_date: string;
  status: "active";
}

export interface IncomeData {
  name: string;
  amount_monthly: number;
  category: string;
  is_recurring: boolean;
}

export interface ExpenseData {
  name: string;
  amount_monthly: number;
  category: string;
}

export interface LiabilityData {
  name: string;
  liability_type: string;
  balance: number;
  interest_rate_pct: number;
  minimum_payment_monthly: number;
  due_date?: string;
}

export interface EmergencyFundData {
  cash_balance: number;
  target_months: number;
  storage_location?: string;
}

export interface RetirementData {
  /**
   * Sent for all account types.
   * For solo: derived as birth_year + retirement_age on submit.
   * For partner/family: entered directly.
   */
  retirement_target_year: number;
  monthly_savings: number;
  desired_monthly_income: number;
  /** Primary account type where retirement savings are held */
  storage_location?: string;
}

export interface OnboardingPayload {
  identity: IdentityData;
  goals: GoalData[];
  incomes: IncomeData[];
  expenses: ExpenseData[];
  liabilities?: LiabilityData[];
  emergencyFund: EmergencyFundData;
  retirement: RetirementData;
}

// ── API response types ──────────────────────────────────────────────────────

export interface CreatedUser {
  user_id: string;
  account_mode: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone_number: string;
  resident_country: string;
  resident_city: string;
  date_of_birth: string | null;
  user_type: string;
  company_id: string | null;
  email_verified: boolean;
  verified_at: string;
  gender: string | null;
  retirement_age: number | null;
  currency: string;
  is_active: boolean;
  prefix: string | null;
  occupation: string | null;
  marital_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface OnboardingResponseData {
  user: CreatedUser;
  goals: unknown[];
  incomes: unknown[];
  emergencyFund: unknown;
  retirement: unknown;
  session_token: string;
}

export interface OnboardingResponse {
  success: boolean;
  data: OnboardingResponseData;
  message?: string;
  error?: string;
}
