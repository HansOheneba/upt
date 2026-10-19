// app/onboarding/page.tsx
"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

import { brand } from "@/lib/tenant";
import { PensionOnboarding } from "@/components/onboarding/pension-onboarding";
import { useClientGate } from "../../hooks/useClientGate";
import { setOnboarded, isOnboarded, setAuth, getAuth } from "../../lib/client-data";
import { resetSession } from "../../lib/session-reset";
import { scheduleTourForNewUser } from "@/lib/dashboard-tour";
import { CelereyLoader } from "@/components/login/celerey-loader";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { Step0AccountMode } from "@/components/onboarding/steps/Step0AccountMode";
import { Step1Identity } from "@/components/onboarding/steps/Step1Identity";
import { Step2Goals } from "@/components/onboarding/steps/Step2Goals";
import { Step3Income } from "@/components/onboarding/steps/Step3Income";
import { Step4Expenses } from "@/components/onboarding/steps/Step4Expenses";
import { Step5EmergencyFund } from "@/components/onboarding/steps/Step5EmergencyFund";
import { Step6Retirement } from "@/components/onboarding/steps/Step6Retirement";
import { Step7Review } from "@/components/onboarding/steps/Step7Review";
import { Step8Complete } from "@/components/onboarding/steps/Step8Complete";
import { useOnboardingStore } from "@/store/onboardingStore";
import { useFinancialStore } from "@/store/financialStore";
import type {
  IdentityData,
  GoalData,
  IncomeData,
  ExpenseData,
  EmergencyFundData,
  RetirementData,
} from "@/lib/onboarding/types";
import type { AccountMode } from "@/lib/onboarding/copy";

// Step layout (1-indexed):
//   1  -> Account Mode selection  (Step0AccountMode)
//   2  -> Identity                (Step1Identity)
//   3  -> Goals                   (Step2Goals)
//   4  -> Income                  (Step3Income)
//   5  -> Expenses                (Step4Expenses)
//   6  -> Emergency Fund          (Step5EmergencyFund)
//   7  -> Retirement              (Step6Retirement)
//   8  -> Review                  (Step7Review)
//   9  -> Complete                (Step8Complete - bypasses shell)
const TOTAL_STEPS = 9;

// Admin-invited clients (/onboarding?invite=<token>&email=<email>) complete
// onboarding via onboarding.create-user-via-invite, which needs no
// OTP-verified onboarding token - the invite_token itself is the proof of
// identity. Persisted (not just React state) so the token survives a
// refresh mid-onboarding, after it's been stripped from the URL.
const INVITE_TOKEN_KEY = "onboarding_invite_token";

export default function OnboardingPage() {
  if (brand.id === "upt") return <PensionOnboarding />;
  return <WealthOnboardingPage />;
}

function WealthOnboardingPage() {
  const router = useRouter();
  const { ready, auth } = useClientGate();
  const [inviteToken, setInviteTokenState] = React.useState<string | null>(
    () =>
      typeof window === "undefined"
        ? null
        : window.localStorage.getItem(INVITE_TOKEN_KEY),
  );
  // Captured before resetOnboarding() so Step8Complete still has a name
  // after the store is wiped.
  const [completedDisplayName, setCompletedDisplayName] = React.useState<
    string | null
  >(null);

  // Invite-link onboarding: skip straight into onboarding as this invited
  // user, without going through OTP verification first.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const invite = params.get("invite");
    if (!invite) return;

    const inviteEmail = params.get("email") ?? "";

    // If the browser has stale data for a different account, wipe it first -
    // same safeguard used for account switches during normal OTP login.
    const previous = getAuth();
    const accountSwitched =
      !!previous.email &&
      !!inviteEmail &&
      previous.email.toLowerCase() !== inviteEmail.toLowerCase();
    if (accountSwitched) {
      resetSession();
    }

    setAuth(inviteEmail);
    try {
      window.localStorage.setItem(INVITE_TOKEN_KEY, invite);
    } catch {
      /* noop */
    }
    setInviteTokenState(invite);

    // Strip invite/email from the URL so a refresh doesn't re-run this.
    const url = new URL(window.location.href);
    url.searchParams.delete("invite");
    url.searchParams.delete("email");
    window.history.replaceState({}, "", url.toString());
  }, []);

  const store = useOnboardingStore();
  const seedFromOnboarding = useFinancialStore((s) => s.seedFromOnboarding);
  const setUser = useFinancialStore((s) => s.setUser);
  const {
    currentStep,
    accountMode,
    identity,
    goals,
    incomes,
    expenses,
    emergencyFund,
    retirement,
    setStep,
    setAccountMode,
    setIdentity,
    setGoals,
    setIncomes,
    setExpenses,
    setEmergencyFund,
    setRetirement,
    resetOnboarding,
  } = store;

  // Sanitize any stale API-format income objects that may be persisted in
  // localStorage from a previous onboarding run (API objects carry extra
  // fields like id, user_id, recurring_type that must not be sent back).
  useEffect(() => {
    if (!incomes.length) return;
    if (!(incomes as any[]).some((i) => "id" in i || "user_id" in i)) return;
    setIncomes(
      (incomes as any[]).map((i) => ({
        name: i.name ?? "",
        amount_monthly: Number(i.amount_monthly ?? i.amount ?? 0),
        category: i.category ?? "",
        is_recurring: i.is_recurring ?? i.recurring_type !== "one-time",
      })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!ready) return;
    if (!auth.loggedIn) {
      router.replace("/");
      return;
    }
    // If already onboarded, go to choose-plan (DashboardGuard will forward
    // to /dashboard if they already have an active subscription)
    if (isOnboarded()) {
      router.replace("/choose-plan");
    }
  }, [ready, auth, router]);

  function handleBack() {
    if (currentStep > 1) setStep(currentStep - 1);
  }

  // Step handlers
  function handleStep1(mode: AccountMode) {
    setAccountMode(mode);
    setStep(2);
  }

  function handleStep2(data: IdentityData) {
    setIdentity(data);
    setStep(3);
  }

  function handleStep3(data: GoalData[]) {
    setGoals(data);
    setStep(4);
  }

  function handleStep4(data: IncomeData[]) {
    setIncomes(data);
    setStep(5);
  }

  function handleStep5(data: ExpenseData[]) {
    setExpenses(data);
    setStep(6);
  }

  function handleStep6(data: EmergencyFundData) {
    setEmergencyFund(data);
    setStep(7);
  }

  function handleStep7(data: RetirementData) {
    setRetirement(data);
    setStep(8);
  }

  function handleStep8Complete() {
    // Capture the name before wiping the store - Step8Complete still needs it.
    const nameFromIdentity =
      identity?.display_name?.trim() ||
      [identity?.first_name, identity?.last_name]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      null;
    if (nameFromIdentity) {
      setCompletedDisplayName(nameFromIdentity);
    }

    // Seed the financial store from onboarding data before marking complete
    if (identity) {
      seedFromOnboarding({
        identity,
        goals,
        incomes,
        retirement,
        emergencyFund,
      });

      // Patch the email (set at login) into the seeded user
      const email = auth.email ?? "";
      if (email) {
        const seededUser = useFinancialStore.getState().user;
        if (seededUser) {
          setUser({ ...seededUser, email });
        }
      }
    }
    setOnboarded();
    scheduleTourForNewUser();
    // Clear all persisted form data now that submission has succeeded.
    // This ensures the next onboarding run (e.g. a test reset) starts fresh.
    resetOnboarding();
    try {
      window.localStorage.removeItem(INVITE_TOKEN_KEY);
    } catch {
      /* noop */
    }
    setStep(9);
  }

  if (!ready) return <CelereyLoader />;

  const totalIncome = incomes
    .filter((i) => i.is_recurring)
    .reduce((s, i) => s + Number(i.amount_monthly), 0);

  // Prefer the name captured at submit - identity is cleared by resetOnboarding.
  const displayName =
    completedDisplayName ?? identity?.display_name ?? "there";

  return (
    <OnboardingShell currentStep={currentStep} totalSteps={TOTAL_STEPS}>
      {currentStep === 1 && (
        <Step0AccountMode defaultValue={accountMode} onComplete={handleStep1} />
      )}
      {currentStep === 2 && (
        <Step1Identity
          defaultValues={identity}
          onComplete={handleStep2}
          onBack={handleBack}
        />
      )}
      {currentStep === 3 && (
        <Step2Goals
          defaultValues={goals}
          onComplete={handleStep3}
          onBack={handleBack}
        />
      )}
      {currentStep === 4 && (
        <Step3Income
          defaultValues={incomes}
          onComplete={handleStep4}
          onBack={handleBack}
        />
      )}
      {currentStep === 5 && (
        <Step4Expenses
          defaultValues={expenses}
          onComplete={handleStep5}
          onBack={handleBack}
        />
      )}
      {currentStep === 6 && (
        <Step5EmergencyFund
          defaultValues={emergencyFund}
          totalMonthlyExpenses={expenses.reduce(
            (s, e) => s + Number(e.amount_monthly),
            0,
          )}
          onComplete={handleStep6}
          onBack={handleBack}
        />
      )}
      {currentStep === 7 && (
        <Step6Retirement
          defaultValues={retirement}
          onComplete={handleStep7}
          onBack={handleBack}
        />
      )}
      {currentStep === 8 && (
        <Step7Review
          onComplete={handleStep8Complete}
          onEditStep={(step) => setStep(step)}
          onBack={handleBack}
          email={auth.email ?? ""}
          inviteToken={inviteToken ?? undefined}
        />
      )}
      {currentStep === 9 && (
        <Step8Complete
          displayName={displayName}
          goalCount={goals.length}
          totalIncome={totalIncome}
          nextHref={inviteToken ? "/dashboard" : "/choose-plan"}
          ctaLabel={inviteToken ? "Go to dashboard" : "Choose your plan"}
        />
      )}
    </OnboardingShell>
  );
}
