"use client";

import React, { useState, useEffect, useLayoutEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import AdminSidebar from "@/components/dashboard/sidebar";
import DashboardTopbar from "@/components/dashboard/topbar";
import { DashboardGuard } from "@/components/dashboard/dashboard-guard";
import { CelereyLoader } from "@/components/login/celerey-loader";
import { useFinancialStore } from "@/store/financialStore";
import { setDefaultCurrency } from "@/lib/client-data";
import { SessionExpiredError } from "@/lib/dashboard-api";
import { SESSION_EXPIRED_EVENT } from "@/lib/session-expired";
import { resetSession } from "@/lib/session-reset";
import { ProfilePanelProvider } from "@/components/dashboard/profile-panel-context";
import { CurrencyDisplayProvider } from "@/components/dashboard/currency-display-context";
import { ProfileSetupPanel } from "@/components/dashboard/profile-setup-panel";
import { ProfileWelcomeDialog } from "@/components/dashboard/profile-welcome-dialog";
import { DashboardTour } from "@/components/dashboard/dashboard-tour";
import { DashboardReadyContext } from "@/components/dashboard/dashboard-ready-context";
import { RiskQuizDialog } from "@/components/dashboard/risk/quizCard";
import { useProfilePanel } from "@/components/dashboard/profile-panel-context";
import { dashboardTheme } from "@/lib/dashboard-theme";
import { useDashboardData } from "@/hooks/useDashboardData";
import { AskCelereyAIButton } from "@/components/dashboard/ask-celerey-ai-button";
import { fromDemoPath, isDemoMode, isPopulatedDashboardPath } from "@/lib/demo-mode";
import { startPopulatedDemo } from "@/lib/pension/enter";
import { financialStorageKey } from "@/lib/local-view";
import { syncPensionGoalIntoFinancialStore } from "@/lib/pension/as-goal";
import { isUptPensionDemoActive } from "@/lib/pension/session";
import { usePensionStore } from "@/store/pensionStore";
import { cn } from "@/lib/utils";

/** Triggers zustand-persist rehydration from localStorage after mount. */
function StoreHydrator() {
  useEffect(() => {
    if (isDemoMode()) return;
    useFinancialStore.persist.rehydrate();
  }, []);
  return null;
}

/** Keeps the formatCurrency default in sync with the user's chosen currency. */
function CurrencySync() {
  const currency = useFinancialStore((s) => s.user?.currency);
  useEffect(() => {
    setDefaultCurrency(currency ?? "USD");
  }, [currency]);
  return null;
}

/**
 * Shows a modal when the session expires (401 after refresh fails) and
 * redirects the user to sign in again.
 */
function SessionExpiredBanner() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [countdown, setCountdown] = useState(8);

  const goToSignIn = React.useCallback(async () => {
    try {
      await fetch("/api/auth/sign-out", { method: "POST" });
    } catch {
      /* noop */
    }
    resetSession();
    router.replace("/");
  }, [router]);

  useEffect(() => {
    function show() {
      if (isDemoMode() || isUptPensionDemoActive()) return;
      setVisible(true);
    }
    function handleRejection(event: PromiseRejectionEvent) {
      if (event.reason instanceof SessionExpiredError) {
        event.preventDefault();
        show();
      }
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, show);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, show);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    if (countdown <= 0) {
      void goToSignIn();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [visible, countdown, goToSignIn]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center space-y-4">
        <div className="text-4xl">🔒</div>
        <h2 className="text-lg font-semibold text-gray-900">Session expired</h2>
        <p className="text-sm text-gray-500">
          For your security, you have been signed out. Please sign in again to
          continue. Redirecting in{" "}
          <span className="font-semibold text-gray-800">{countdown}</span>{" "}
          second{countdown !== 1 ? "s" : ""}.
        </p>
        <button
          type="button"
          onClick={() => void goToSignIn()}
          className="w-full rounded-lg bg-[var(--brand-primary)] py-2.5 text-sm font-medium text-white hover:bg-[color-mix(in_srgb,var(--brand-primary)_85%,black)] transition-colors"
        >
          Sign in again
        </button>
      </div>
    </div>
  );
}

/** Loads dashboard.summary once so user + data are ready for the tour and shell. */
function DashboardBootstrap() {
  useDashboardData();
  return null;
}

/** Renders the global risk quiz dialog, available on every dashboard page. */
function GlobalRiskQuizDialog() {
  const { riskQuizOpen, closeRiskQuiz } = useProfilePanel();
  return <RiskQuizDialog open={riskQuizOpen} onClose={closeRiskQuiz} />;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loadingDone, setLoadingDone] = useState(false);
  const [pensionDemo, setPensionDemo] = useState(false);
  const pathname = usePathname();
  const onCopilot = fromDemoPath(pathname) === "/dashboard/ai";

  useLayoutEffect(() => {
    if (isPopulatedDashboardPath(window.location.pathname)) {
      startPopulatedDemo();
      return;
    }
    if (!isUptPensionDemoActive()) return;
    usePensionStore.getState().hydrate();
    // Restore this view before the pension goal is written. Otherwise the
    // first paint is empty and that empty list replaces the saved goals.
    try {
      const raw = window.localStorage.getItem(financialStorageKey());
      if (raw) {
        const parsed = JSON.parse(raw) as { state?: Record<string, unknown> };
        if (parsed?.state) useFinancialStore.setState(parsed.state as never);
      }
    } catch {
      /* keep the current store */
    }
    syncPensionGoalIntoFinancialStore();
  }, []);

  useEffect(() => {
    const active = isUptPensionDemoActive();
    setPensionDemo(active);
    if (!active) return;
    usePensionStore.getState().hydrate();
    syncPensionGoalIntoFinancialStore();
    return usePensionStore.subscribe(syncPensionGoalIntoFinancialStore);
  }, []);

  return (
    <DashboardReadyContext.Provider value={loadingDone}>
      {/* Global dashboard loader */}
      {!loadingDone && (
        <CelereyLoader onDone={() => setLoadingDone(true)} duration={1600} />
      )}

      <SessionExpiredBanner />

      {/* Main layout */}
      <div
        style={{
          visibility: loadingDone ? "visible" : "hidden",
        }}
      >
        <StoreHydrator />
        <CurrencySync />
        <DashboardGuard>
            <ProfilePanelProvider>
            <CurrencyDisplayProvider>
            {pensionDemo ? null : <DashboardBootstrap />}
            {pensionDemo ? null : <GlobalRiskQuizDialog />}
            {pensionDemo ? null : <ProfileWelcomeDialog />}
            <SidebarProvider defaultOpen>
              <div className="flex min-h-svh w-full overflow-x-hidden">
                <AdminSidebar />
                {pensionDemo ? null : <DashboardTour layoutReady={loadingDone} />}

                <SidebarInset className="min-w-0 flex flex-col h-svh overflow-hidden">
                  <DashboardTopbar />

                  <main
                    className={cn(
                      "min-h-0 flex-1 overflow-x-clip",
                      onCopilot
                        ? "flex flex-col overflow-hidden bg-background p-0"
                        : `overflow-y-auto px-3 py-3 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] scroll-pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] sm:p-6 sm:pb-6 ${dashboardTheme.surface}`,
                    )}
                  >
                    {children}
                  </main>
                </SidebarInset>

                {pensionDemo ? null : <ProfileSetupPanel />}
              </div>
              {pensionDemo ? null : <AskCelereyAIButton />}
            </SidebarProvider>
            </CurrencyDisplayProvider>
          </ProfilePanelProvider>
        </DashboardGuard>
      </div>
    </DashboardReadyContext.Provider>
  );
}
