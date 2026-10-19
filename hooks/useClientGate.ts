"use client";

import { useEffect, useState } from "react";
import {
  getAuth,
  getSubscription,
  getUserType,
  AuthState,
  SubState,
  DEFAULT_ENTITLEMENTS,
  DEFAULT_RECORD_LIMITS,
} from "@/lib/client-data";

export function useClientGate(): {
  ready: boolean;
  auth: AuthState;
  sub: SubState;
  userType: "regular" | "enterprise";
} {
  const [ready, setReady] = useState(false);
  const [auth, setAuthState] = useState<AuthState>({
    loggedIn: false,
    email: null,
  });
  const [sub, setSubState] = useState<SubState>({
    status: "none",
    plan: null,
    trialStartedAt: null,
    trialEndsAt: null,
    isEnterprise: false,
    entitlements: DEFAULT_ENTITLEMENTS,
    recordLimits: DEFAULT_RECORD_LIMITS,
    cancelAtPeriodEnd: false,
    currentPeriodEnd: null,
  });
  const [userType, setUserType] = useState<"regular" | "enterprise">("regular");

  useEffect(() => {
    const read = () => {
      const a = getAuth();
      const s = getSubscription();
      const t = getUserType();
      setAuthState(a);
      setSubState(s);
      setUserType(t);
      setReady(true);
    };

    read();
    // Re-read whenever subscription data is written (e.g. after API fetch)
    // or auth state changes (e.g. invite-link onboarding sets it directly).
    window.addEventListener("celerey:sub-updated", read);
    window.addEventListener("celerey:auth-updated", read);
    return () => {
      window.removeEventListener("celerey:sub-updated", read);
      window.removeEventListener("celerey:auth-updated", read);
    };
  }, []);

  return { ready, auth, sub, userType };
}
