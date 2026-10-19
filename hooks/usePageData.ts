// hooks/usePageData.ts
//
// Lightweight hook that each dashboard page calls on mount to fetch its own
// data slice and hydrate the store. Falls back gracefully on error.
//
// Uses a module-level TTL cache so navigating quickly between pages doesn't
// spam the API — each key can only re-fetch after CACHE_TTL_MS.

"use client";

import { useEffect, useRef, useState } from "react";
import { useFinancialStore } from "@/store/financialStore";
import {
  fetchGoals,
  fetchIncome,
  fetchExpenses,
  fetchEmergencyFund,
  fetchCashFlowHistory,
  fetchCashFlowSummary,
  fetchAssets,
  fetchInsurancePolicies,
  fetchProperties,
  fetchUser,
  fetchRetirement,
  fetchDashboardSummary,
  fetchLatestRiskAssessment,
  fetchLiabilities,
  isCompleteRiskAssessment,
  SessionExpiredError,
} from "@/lib/dashboard-api";
import {
  applySubscriptionFromApiUser,
  mergeUserWithRiskAssessment,
} from "@/lib/map-api-user";
import { isDemoMode } from "@/lib/demo-mode";

export type PageDataKey =
  | "goals"
  | "cash-flow"
  | "assets"
  | "insurance"
  | "properties"
  | "liabilities"
  | "profile"
  | "retirement"
  | "overview"; // fetches goals + cashflow summary

// Module-level cache: key → timestamp of last successful fetch
// Prevents re-fetching the same data within CACHE_TTL_MS milliseconds.
const _lastFetched = new Map<PageDataKey, number>();
const CACHE_TTL_MS = 30_000;

/**
 * Called by useDashboardData after bootstrap completes so usePageData
 * doesn't double-fetch the same endpoints that bootstrap already covered.
 */
export function markPageKeysFetched(...keys: PageDataKey[]) {
  const now = Date.now();
  for (const key of keys) _lastFetched.set(key, now);
}

/**
 * Clears the TTL cache for the given keys so the next usePageData call
 * will force a fresh API fetch regardless of when the last fetch occurred.
 * Call this after any mutation that affects data from these page slices.
 */
export function clearPageCache(...keys: PageDataKey[]) {
  for (const key of keys) _lastFetched.delete(key);
}

/**
 * Call this hook at the top of each dashboard page.
 * It refetches the relevant data slice on mount, but skips the fetch if the
 * same key was already fetched within the last 30 seconds.
 *
 * Returns `{ loading }` so the page can show a skeleton while data loads.
 */
export function usePageData(key: PageDataKey) {
  // Initialize synchronously from the TTL cache so re-visits never flash a
  // skeleton. If the key was fetched recently, loading starts as false and
  // no skeleton renders at all. First-ever visit still starts as true.
  const [loading, setLoading] = useState(
    () => Date.now() - (_lastFetched.get(key) ?? 0) >= CACHE_TTL_MS,
  );
  const mounted = useRef(false);

  useEffect(() => {
    // Prevent double-fire in React StrictMode
    if (mounted.current) return;
    mounted.current = true;

    if (isDemoMode()) {
      setLoading(false);
      _lastFetched.set(key, Date.now());
      return;
    }

    // Skip if this key was already fetched recently
    const lastFetch = _lastFetched.get(key) ?? 0;
    if (Date.now() - lastFetch < CACHE_TTL_MS) {
      // loading is already false from the lazy init above
      return;
    }

    setLoading(true);
    const store = useFinancialStore.getState();

    const run = async () => {
      try {
        switch (key) {
          case "goals": {
            const { goals, meta } = await fetchGoals();
            store.setGoals(goals);
            store.setGoalsMeta(meta);
            break;
          }
          case "cash-flow": {
            const [income, expenses, emergencyFund, history, summary] =
              await Promise.allSettled([
                fetchIncome(),
                fetchExpenses(),
                fetchEmergencyFund(),
                fetchCashFlowHistory(),
                fetchCashFlowSummary(),
              ]);
            if (income.status === "fulfilled") store.setIncome(income.value);
            if (expenses.status === "fulfilled")
              store.setExpenses(expenses.value);
            if (emergencyFund.status === "fulfilled" && emergencyFund.value) {
              const ef = emergencyFund.value;
              const existing = store.emergencyFund;
              store.setEmergencyFund({
                currentCashBalance: Number(ef.cash_balance) || 0,
                targetMonths: ef.target_months ?? 6,
                storageLocation:
                  ef.storage_location ?? existing.storageLocation,
                includeAccountIds: [],
                updatedAt: new Date().toISOString(),
                computed: ef.computed
                  ? {
                      monthlyBaseline: ef.computed.monthly_baseline,
                      targetAmount: ef.computed.target_amount,
                      runwayMonths: ef.computed.runway_months,
                      fundedPct: ef.computed.funded_pct,
                      shortfall: ef.computed.shortfall,
                    }
                  : existing.computed,
              });
            }
            if (history.status === "fulfilled")
              store.setCashFlowHistory(history.value);
            if (summary.status === "fulfilled" && summary.value)
              store.setCashFlowSummary(summary.value);
            break;
          }
          case "assets": {
            const holdings = await fetchAssets();
            store.setHoldings(holdings);
            break;
          }
          case "insurance": {
            const [policies, props] = await Promise.allSettled([
              fetchInsurancePolicies(),
              fetchProperties(),
            ]);
            if (policies.status === "fulfilled")
              store.setInsurancePolicies(policies.value);
            if (props.status === "fulfilled")
              store.setPropertyAssets(props.value);
            break;
          }
          case "properties": {
            const props = await fetchProperties();
            store.setPropertyAssets(props);
            break;
          }
          case "liabilities": {
            const [liabilities, props] = await Promise.allSettled([
              fetchLiabilities(),
              fetchProperties(),
            ]);
            if (liabilities.status === "fulfilled") {
              store.setLiabilities(liabilities.value);
            }
            if (props.status === "fulfilled") {
              store.setPropertyAssets(props.value);
            }
            break;
          }
          case "profile": {
            const [user, riskAssessment] = await Promise.all([
              fetchUser(),
              fetchLatestRiskAssessment(),
            ]);
            if (user) {
              store.setUser(mergeUserWithRiskAssessment(user, riskAssessment));
              applySubscriptionFromApiUser(user);
            }
            if (isCompleteRiskAssessment(riskAssessment)) {
              store.setRiskAssessment(riskAssessment);
            }
            break;
          }
          case "retirement": {
            const retirement = await fetchRetirement();
            if (retirement) store.setRetirement(retirement);
            break;
          }
          case "overview": {
            const summary = await fetchDashboardSummary();
            if (!summary) break;
            let riskAssessment = summary.riskAssessment;
            if (!isCompleteRiskAssessment(riskAssessment)) {
              const latest = await fetchLatestRiskAssessment();
              if (isCompleteRiskAssessment(latest)) {
                riskAssessment = latest;
              }
            }
            if (summary.user) {
              store.setUser(
                mergeUserWithRiskAssessment(summary.user, riskAssessment),
              );
            }
            if (isCompleteRiskAssessment(riskAssessment)) {
              store.setRiskAssessment(riskAssessment);
            }
            store.hydrateFromApi({ ...summary, riskAssessment });
            // Mark every key the summary already covers as fresh so a quick
            // tab switch doesn't trigger a duplicate per-resource fetch.
            markPageKeysFetched(
              "goals",
              "cash-flow",
              "assets",
              "insurance",
              "properties",
              "liabilities",
              "retirement",
              "profile",
            );
            break;
          }
        }
      } catch (err) {
        if (err instanceof SessionExpiredError) return;
        console.warn(`[usePageData] error fetching "${key}":`, err);
      } finally {
        _lastFetched.set(key, Date.now());
        setLoading(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { loading };
}
