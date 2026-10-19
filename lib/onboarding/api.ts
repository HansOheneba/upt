// lib/onboarding/api.ts
import type { OnboardingPayload } from "./types";
import type { UserProfile } from "@/lib/client-data";
import csc from "countries-states-cities";

/**
 * Thrown when the onboarding session token cookie is missing or expired
 * (server responds 401). Callers can catch this to trigger a re-verify flow.
 */
export class TokenExpiredError extends Error {
  constructor(message = "Onboarding session expired. Please log in again.") {
    super(message);
    this.name = "TokenExpiredError";
  }
}

export interface SubmitOnboardingResult {
  success: boolean;
  data: {
    user: UserProfile;
    session_token?: string;
    [key: string]: unknown;
  };
}

type UpstreamBody = {
  success?: boolean;
  status?: number;
  message?: string;
  error?: string;
  data?: Record<string, unknown> | null;
  user?: Record<string, unknown> | null;
  [key: string]: unknown;
};

type CscCountry = {
  id: number;
  name: string;
  iso2: string;
};

type CscState = {
  id: number;
  name: string;
  country_id: number;
  state_code: string;
};

const CSC_COUNTRIES = csc.getAllCountries() as CscCountry[];

/** Map a country display name (e.g. "United States") to ISO-2 (e.g. "US"). */
function toCountryCode(value: string | undefined): string {
  if (!value?.trim()) return value ?? "";
  const trimmed = value.trim();
  if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase();
  const match = CSC_COUNTRIES.find(
    (c) => c.name.toLowerCase() === trimmed.toLowerCase(),
  );
  return match?.iso2 ?? trimmed;
}

/** Map a state display name (e.g. "California") to its code (e.g. "CA"). */
function toStateCode(
  countryValue: string | undefined,
  stateValue: string | undefined,
): string | undefined {
  if (!stateValue?.trim()) return undefined;
  const trimmedState = stateValue.trim();
  if (/^[A-Za-z]{2}$/.test(trimmedState)) return trimmedState.toUpperCase();

  const countryCode = toCountryCode(countryValue);
  const country =
    CSC_COUNTRIES.find((c) => c.iso2 === countryCode) ??
    CSC_COUNTRIES.find(
      (c) => c.name.toLowerCase() === (countryValue ?? "").trim().toLowerCase(),
    );
  if (!country) return trimmedState;

  const states = csc.getStatesOfCountry(country.id) as CscState[];
  const match = states.find(
    (s) => s.name.toLowerCase() === trimmedState.toLowerCase(),
  );
  return match?.state_code ?? trimmedState;
}

/**
 * Normalize the UI onboarding store into the shape Postman / API accepts:
 * ISO country + state codes, camelCase emergencyFund key.
 */
function buildApiPayload(payload: OnboardingPayload): Record<string, unknown> {
  const { identity, emergencyFund, expenses, incomes, goals, retirement } =
    payload;

  return {
    identity: {
      ...identity,
      resident_country: toCountryCode(identity.resident_country),
      resident_state: toStateCode(
        identity.resident_country,
        identity.resident_state,
      ),
    },
    goals,
    incomes: incomes.map(
      ({ name, amount_monthly, category, is_recurring }) => ({
        name,
        amount_monthly,
        category,
        is_recurring,
      }),
    ),
    expenses: (expenses ?? []).map(({ name, amount_monthly, category }) => ({
      name,
      amount_monthly,
      category,
    })),
    emergencyFund,
    retirement,
  };
}

function extractUser(
  data: UpstreamBody | null,
): Record<string, unknown> | null {
  if (!data) return null;

  const nested = data.data;
  if (nested && typeof nested === "object") {
    const fromData = nested.user;
    if (fromData && typeof fromData === "object") {
      return fromData as Record<string, unknown>;
    }
    // Some responses put the user fields directly under data.
    if (typeof nested.user_id === "string") {
      return nested;
    }
  }

  if (data.user && typeof data.user === "object") {
    return data.user as Record<string, unknown>;
  }

  if (typeof data.user_id === "string") {
    return data as Record<string, unknown>;
  }

  return null;
}

function extractSessionToken(data: UpstreamBody | null): string | undefined {
  if (!data) return undefined;
  const nested = data.data;
  if (nested && typeof nested === "object") {
    const token = nested.session_token;
    if (typeof token === "string" && token.length > 0) return token;
  }
  if (typeof data.session_token === "string" && data.session_token.length > 0) {
    return data.session_token;
  }
  return undefined;
}

function toUserProfile(raw: Record<string, unknown>): UserProfile {
  return {
    user_id: String(raw.user_id ?? ""),
    account_mode: String(raw.account_mode ?? "solo"),
    display_name: String(raw.display_name ?? ""),
    first_name: (raw.first_name as string | null) ?? null,
    last_name: (raw.last_name as string | null) ?? null,
    email: String(raw.email ?? ""),
    phone_number: String(raw.phone_number ?? ""),
    resident_country: String(raw.resident_country ?? ""),
    resident_state: (raw.resident_state as string | undefined) ?? undefined,
    resident_city: String(raw.resident_city ?? raw.city ?? ""),
    date_of_birth: (raw.date_of_birth as string | null) ?? null,
    gender: (raw.gender as string | null) ?? null,
    currency: String(raw.currency ?? "USD"),
    prefix: (raw.prefix as string | null) ?? null,
    occupation: (raw.occupation as string | null) ?? null,
    marital_status: (raw.marital_status as string | null) ?? null,
    user_type: String(raw.user_type ?? "regular"),
    is_active: Boolean(raw.is_active ?? true),
  };
}

/**
 * Submits the full onboarding payload to the backend via the secure
 * server-side route, which attaches the HttpOnly onboarding_token cookie
 * as a Bearer token header so JS never has to read it.
 *
 * If `inviteToken` is provided (admin-invited client completing onboarding
 * from an invite link), the server route instead calls
 * onboarding.create-user-via-invite, which needs no onboarding-token cookie -
 * the invite_token itself is the proof of identity.
 */
export async function submitOnboarding(
  payload: OnboardingPayload,
  inviteToken?: string,
): Promise<SubmitOnboardingResult> {
  const body = {
    ...buildApiPayload(payload),
    ...(inviteToken ? { invite_token: inviteToken } : {}),
  };

  const response = await fetch("/api/onboarding/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await response.json().catch(() => null)) as UpstreamBody | null;

  if (response.status === 401 || data?.status === 401) {
    throw new TokenExpiredError(
      (typeof data?.message === "string" && data.message) ||
        (typeof data?.error === "string" && data.error) ||
        undefined,
    );
  }

  if (!response.ok || data?.success === false) {
    throw new Error(
      (typeof data?.message === "string" && data.message) ||
        (typeof data?.error === "string" && data.error) ||
        "Failed to submit onboarding data. Please try again.",
    );
  }

  const rawUser = extractUser(data);
  if (!rawUser?.user_id) {
    throw new Error(
      "Onboarding succeeded but the server response was malformed. Please refresh and try again.",
    );
  }

  const user = toUserProfile(rawUser);
  const sessionToken = extractSessionToken(data);

  return {
    success: true,
    data: {
      ...(data?.data && typeof data.data === "object" ? data.data : {}),
      user,
      session_token: sessionToken,
    },
  };
}
