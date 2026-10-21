import type { User } from "@/lib/client-data";
import {
  setAuth,
  setDefaultCurrency,
  setOnboarded,
  setSubscriptionData,
} from "@/lib/client-data";
import {
  DEMO_MEMBER,
  type JoinInput,
} from "@/lib/pension/demo-data";
import { hydrateDemoStore } from "@/lib/demo-mode";
import { financialStorageKey, getLocalView, setLocalView } from "@/lib/local-view";
import { personalMembership } from "@/lib/pension/portfolio";
import type { PensionMember } from "@/lib/pension/types";
import { syncPensionGoalIntoFinancialStore } from "@/lib/pension/as-goal";
import { setPensionDemoMode } from "@/lib/pension/session";
import { resetSession } from "@/lib/session-reset";
import {
  FINANCIAL_STORE_INITIAL_STATE,
  useFinancialStore,
} from "@/store/financialStore";
import { usePensionStore } from "@/store/pensionStore";

function markActivePensionSession(email: string): void {
  setAuth(email);
  setOnboarded();
  setSubscriptionData({
    subscription_status: "active",
    subscription_plan: "my-own-pension",
  });
  setDefaultCurrency("GHS");
  setPensionDemoMode("active");
}

function userFromMember(member: PensionMember, memberSince?: string): User {
  const name = `${member.firstName} ${member.lastName}`.trim();
  const now = new Date().toISOString();
  return {
    user_id: member.id,
    first_name: member.firstName || undefined,
    last_name: member.lastName || undefined,
    display_name: name || member.email,
    email: member.email,
    phone_number: member.mobile || undefined,
    resident_country: "Ghana",
    city: member.location || undefined,
    date_of_birth: member.dateOfBirth || undefined,
    user_type: "regular",
    currency: "GHS",
    is_active: true,
    created_at: memberSince || now,
    updated_at: now,
    occupation: member.profession || undefined,
  };
}

function resetMemory(): void {
  useFinancialStore.setState({ ...FINANCIAL_STORE_INITIAL_STATE });
  usePensionStore.getState().clear();
}

/** Reads this view's saved wealth data before any reset writes over it. */
function readSavedFinancial(): Record<string, unknown> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(financialStorageKey());
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: Record<string, unknown> };
    const state = parsed?.state;
    if (!state || typeof state !== "object") return null;
    return state;
  } catch {
    return null;
  }
}

function memberSince(): string | undefined {
  return personalMembership(usePensionStore.getState().memberships)?.memberSince;
}

function ensureProfile(member: PensionMember): void {
  if (!useFinancialStore.getState().user) {
    useFinancialStore.getState().setUser(userFromMember(member, memberSince()));
  }
  syncPensionGoalIntoFinancialStore();
}

function hasWealth(state: Record<string, unknown> | null): boolean {
  if (!state) return false;
  const holdings = state.holdings;
  const properties = state.propertyAssets;
  return (
    (Array.isArray(holdings) && holdings.length > 0) ||
    (Array.isArray(properties) && properties.length > 0)
  );
}

/**
 * Opens the populated member across the whole dashboard.
 * Later visits keep whatever was changed in that view.
 */
export function startPopulatedDemo(): void {
  const alreadyLoaded =
    getLocalView() === "demo" &&
    usePensionStore.getState().member?.id === DEMO_MEMBER.id &&
    useFinancialStore.getState().holdings.length > 0;
  setLocalView("demo");
  markActivePensionSession(DEMO_MEMBER.email);
  if (alreadyLoaded) {
    syncPensionGoalIntoFinancialStore();
    return;
  }

  const savedFinancial = readSavedFinancial();
  resetMemory();
  usePensionStore.getState().hydrate();
  if (!usePensionStore.getState().member) {
    usePensionStore.getState().loadPreview();
  }
  if (hasWealth(savedFinancial)) {
    useFinancialStore.setState(savedFinancial as never);
    syncPensionGoalIntoFinancialStore();
    return;
  }

  hydrateDemoStore();
  const member = usePensionStore.getState().member ?? DEMO_MEMBER;
  useFinancialStore.getState().setUser(userFromMember(member, memberSince()));
  syncPensionGoalIntoFinancialStore();
}

/** Opens the fictional member. No OTP and no API. */
export function startPensionPreview(): void {
  startPopulatedDemo();
}

/**
 * Signs in with the email they typed.
 * A returning email keeps its saved account. A new email starts empty.
 */
export function startPensionSignIn(email: string): void {
  const trimmed = email.trim();
  setLocalView("customer");
  const savedFinancial = readSavedFinancial();
  resetMemory();
  markActivePensionSession(trimmed);
  usePensionStore.getState().hydrate();
  const saved = usePensionStore.getState().member;
  if (!saved || saved.email.toLowerCase() !== trimmed.toLowerCase()) {
    try {
      window.localStorage.removeItem(financialStorageKey());
    } catch {
      /* noop */
    }
    useFinancialStore.setState({ ...FINANCIAL_STORE_INITIAL_STATE });
    usePensionStore.getState().loadEmpty(trimmed);
  } else if (savedFinancial) {
    useFinancialStore.setState(savedFinancial as never);
  }
  const member = usePensionStore.getState().member;
  if (member) ensureProfile(member);
}

/** Starts the four-step membership. Dashboard stays locked until it finishes. */
export function startPensionJoin(): void {
  setLocalView("customer");
  resetSession();
  setAuth("new.member@myownpension.demo");
  setDefaultCurrency("GHS");
  setPensionDemoMode("joining");
}

export function finishPensionJoin(input: JoinInput): void {
  usePensionStore.getState().loadJoined(input);
  const member = usePensionStore.getState().member;
  markActivePensionSession(member?.email ?? "member@example.com");
  if (member) {
    useFinancialStore.setState({ ...FINANCIAL_STORE_INITIAL_STATE });
    useFinancialStore.getState().setUser(userFromMember(member));
    syncPensionGoalIntoFinancialStore();
  }
}
