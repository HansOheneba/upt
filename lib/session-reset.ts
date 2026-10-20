// lib/session-reset.ts
//
// Single source of truth for wiping every trace of a user session from the
// browser — both localStorage AND the in-memory Zustand stores. Always call
// `resetSession()` (not `clearAllUserData()` on its own) when establishing a
// new auth session or signing out, otherwise persisted stores keep the
// previous user's data hydrated in memory and the new user starts mid-flow.

import { clearAllUserData } from "@/lib/client-data";
import { brand } from "@/lib/tenant";
import {
  useFinancialStore,
  FINANCIAL_STORE_INITIAL_STATE,
} from "@/store/financialStore";
import { useOnboardingStore } from "@/store/onboardingStore";
import { clearPensionSession } from "@/lib/pension/session";

export function resetSession(): void {
  // 1. Wipe persisted storage for both Zustand stores (also pauses rehydration).
  try {
    useOnboardingStore.persist.clearStorage();
  } catch {
    /* noop */
  }
  // UPT keeps the demo view and the customer view in localStorage.
  // Signing out only clears the in-memory copy so the next open restores it.
  if (brand.id !== "upt") {
    try {
      useFinancialStore.persist.clearStorage();
    } catch {
      /* noop */
    }
  }

  // 2. Reset in-memory store state so currently-mounted components re-render
  //    against the default state instead of the previous user's hydrated data.
  try {
    useOnboardingStore.getState().resetOnboarding();
  } catch {
    /* noop */
  }
  try {
    // Merge (not replace) so action functions defined on the store remain intact;
    // we only want to reset the data fields back to their initial values.
    useFinancialStore.setState({ ...FINANCIAL_STORE_INITIAL_STATE });
  } catch {
    /* noop */
  }

  // 3. Clear all other localStorage keys (auth, subscription, profile, etc.)
  clearAllUserData();
  clearPensionSession();
}
