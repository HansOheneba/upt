"use client";

// components/dashboard/dashboard-guard.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  isOnboarded,
  getAuth,
  getSubscription,
  setSubscriptionData,
} from "@/lib/client-data";
import { fetchSubscription } from "@/lib/dashboard-api";
import { CelereyLoader } from "@/components/login/celerey-loader";
import { isDemoPath } from "@/lib/demo-mode";
import { isUptPensionDemoActive } from "@/lib/pension/session";

type GuardState = "checking" | "allowed" | "redirecting";

/** Prevents a /dashboard ↔ /choose-plan bounce if localStorage is stale. */
const PAYWALL_REDIRECT_KEY = "celerey:paywall-redirect";

export function DashboardGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<GuardState>("checking");

  useEffect(() => {
    if (typeof window !== "undefined" && isDemoPath(window.location.pathname)) {
      setState("allowed");
      return;
    }

    const auth = getAuth();
    if (!auth.loggedIn) {
      setState("redirecting");
      router.replace("/");
      return;
    }
    if (!isOnboarded()) {
      setState("redirecting");
      router.replace("/onboarding");
      return;
    }

    if (isUptPensionDemoActive()) {
      setState("allowed");
      return;
    }

    // Stripe success redirect - dashboard/page.tsx owns the polling for this case.
    // Let it through so the "Confirming your subscription..." overlay can run.
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("sub") === "success") {
        try {
          sessionStorage.removeItem(PAYWALL_REDIRECT_KEY);
        } catch {
          /* noop */
        }
        setState("allowed");
        return;
      }
    }

    // Verify subscription status with the backend.
    // Race against an 8-second timeout so a slow backend never leaves the
    // user staring at the loader indefinitely.
    let cancelled = false;
    let timeoutId = 0;
    const timeoutPromise = new Promise<null>((resolve) => {
      timeoutId = window.setTimeout(() => resolve(null), 8_000);
    });

    Promise.race([fetchSubscription(), timeoutPromise]).then((data) => {
      clearTimeout(timeoutId);
      if (cancelled) return;

      if (data === null) {
        // API error or timeout - fall back to cached subscription to avoid
        // falsely locking out users with a known valid subscription
        const local = getSubscription();
        if (local.status === "trialing" || local.status === "active") {
          setState("allowed");
        } else {
          setState("redirecting");
          router.replace("/choose-plan");
        }
        return;
      }

      // Always persist the API payload so a stale local mock trial ("trialing")
      // cannot fight the backend "none" and bounce /choose-plan → /dashboard.
      setSubscriptionData(data);

      const status = data.subscription_status;
      if (status === "trialing" || status === "active") {
        try {
          sessionStorage.removeItem(PAYWALL_REDIRECT_KEY);
        } catch {
          /* noop */
        }
        setState("allowed");
        return;
      }

      // Mark that we are intentionally sending the user to the paywall so
      // choose-plan does not immediately send them back on stale local state.
      try {
        sessionStorage.setItem(PAYWALL_REDIRECT_KEY, String(Date.now()));
      } catch {
        /* noop */
      }
      setState("redirecting");
      router.replace("/choose-plan");
    });

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [router]);

  if (state === "checking") return <CelereyLoader />;
  if (state !== "allowed") return null;
  return <>{children}</>;
}

export { PAYWALL_REDIRECT_KEY };
