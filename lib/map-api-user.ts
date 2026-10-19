/** Maps dashboard API user payloads into the Zustand store shape. */

import type { User } from "@/lib/client-data";
import { setSubscriptionData } from "@/lib/client-data";
import {
  getRiskBand,
  type RiskAssessmentResult,
} from "@/lib/dashboard-api";

/** Fields shared by user.get and dashboard.summary user objects. */
export type ApiUserLike = {
  user_id: string;
  display_name?: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string;
  phone_number?: string;
  resident_country?: string;
  resident_state?: string;
  city?: string;
  date_of_birth?: string | null;
  user_type?: string;
  currency?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  occupation?: string | null;
  marital_status?: string | null;
  prefix?: string | null;
  gender?: string | null;
  account_mode?: string;
  risk_profile?: string | null;
  dependents?: number | null;
  bio?: string | null;
  citizenships?: string[] | null;
  preferred_contact?: string | null;
  subscription_status?: string | null;
  subscription_plan?: string | null;
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
  renewed_at?: string | null;
  is_enterprise?: boolean;
  entitlements?: {
    insights_full?: boolean;
    advisor_chat?: boolean;
    concierge_requests?: boolean;
    export_data?: boolean;
    retirement_scenarios?: boolean;
    live_market_data?: boolean;
    portfolio_charts?: boolean;
    cash_flow_projections?: boolean;
    goal_scenarios?: boolean;
  };
  record_limits?: {
    goals?: number | null;
    assets?: number | null;
    /** Older payloads used this name. Prefer `assets`. */
    holdings?: number | null;
    properties?: number | null;
    liabilities?: number | null;
    insurance_policies?: number | null;
  };
  cancel_at_period_end?: boolean;
  current_period_end?: string | null;
};

/** Prefer risk_band from the latest API assessment over a stale user field. */
export function mergeUserWithRiskAssessment(
  user: ApiUserLike,
  assessment: RiskAssessmentResult | null | undefined,
): User {
  const mapped = mapApiUserToStore(user);
  const band = getRiskBand(assessment);
  if (!band) return mapped;
  return { ...mapped, risk_profile: band as User["risk_profile"] };
}

export function mapApiUserToStore(user: ApiUserLike): User {
  return {
    user_id: user.user_id,
    email: user.email ?? "",
    first_name: user.first_name ?? undefined,
    last_name: user.last_name ?? undefined,
    display_name: user.display_name,
    phone_number: user.phone_number,
    resident_country: user.resident_country ?? "",
    resident_state: user.resident_state ?? undefined,
    city: user.city,
    citizenships: user.citizenships ?? [],
    date_of_birth: user.date_of_birth ?? undefined,
    currency: user.currency ?? "USD",
    preferred_contact: user.preferred_contact ?? undefined,
    occupation: user.occupation ?? undefined,
    marital_status: user.marital_status as User["marital_status"],
    account_mode: user.account_mode as User["account_mode"],
    risk_profile: user.risk_profile as User["risk_profile"],
    dependents: user.dependents ?? undefined,
    bio: user.bio ?? undefined,
    is_active: user.is_active ?? true,
    user_type: user.user_type as User["user_type"],
    created_at: user.created_at ?? "",
    updated_at: user.updated_at ?? "",
  };
}

/** Sync subscription fields from a user.get response into localStorage. */
export function applySubscriptionFromApiUser(user: ApiUserLike): void {
  if (!user.subscription_status) return;
  setSubscriptionData({
    subscription_status: user.subscription_status,
    subscription_plan: user.subscription_plan ?? null,
    trial_started_at: user.trial_started_at ?? null,
    trial_ends_at: user.trial_ends_at ?? null,
    renewed_at: user.renewed_at ?? null,
    is_enterprise: user.is_enterprise ?? false,
    entitlements: user.entitlements,
    record_limits: user.record_limits
      ? {
          goals: user.record_limits.goals,
          assets:
            user.record_limits.assets !== undefined
              ? user.record_limits.assets
              : user.record_limits.holdings,
          properties: user.record_limits.properties,
          liabilities: user.record_limits.liabilities,
          insurance_policies: user.record_limits.insurance_policies,
        }
      : undefined,
    cancel_at_period_end: user.cancel_at_period_end ?? false,
    current_period_end: user.current_period_end ?? null,
  });
}
