import { toast } from "sonner";
import { getSubscription, type SubscriptionRecordLimits } from "@/lib/client-data";
import { isDemoMode } from "@/lib/demo-mode";
import { useFinancialStore } from "@/store/financialStore";

export type RecordLimitKey = keyof SubscriptionRecordLimits;

const SINGULAR: Record<RecordLimitKey, string> = {
  goals: "goal",
  assets: "holding",
  properties: "property",
  liabilities: "liability",
  insurance_policies: "insurance policy",
};

const PLURAL: Record<RecordLimitKey, string> = {
  goals: "goals",
  assets: "holdings",
  properties: "properties",
  liabilities: "liabilities",
  insurance_policies: "insurance policies",
};

export function limitedRecordCount(key: RecordLimitKey): number {
  const state = useFinancialStore.getState();
  switch (key) {
    case "goals":
      return state.goals.length;
    case "assets":
      return state.holdings.filter((holding) => holding.is_active).length;
    case "properties":
      return state.propertyAssets.filter((property) => property.is_active).length;
    case "liabilities":
      return state.liabilities.length;
    case "insurance_policies":
      return state.insurancePolicies.filter((policy) => policy.is_active).length;
  }
}

export function recordLimitMessage(
  key: RecordLimitKey,
  count: number,
  limit: number | null,
): string | null {
  if (limit == null || count < limit) return null;
  if (limit <= 0) {
    return `Your plan does not include ${PLURAL[key]}. Upgrade to add one.`;
  }
  const noun = limit === 1 ? SINGULAR[key] : PLURAL[key];
  return `Your plan includes ${limit} ${noun}. Remove one, or upgrade, to add another.`;
}

/** True when the create should stop. Demo mode is not capped. */
export function blockRecordCreate(key: RecordLimitKey): boolean {
  if (isDemoMode()) return false;
  const message = recordLimitMessage(
    key,
    limitedRecordCount(key),
    getSubscription().recordLimits[key],
  );
  if (!message) return false;
  toast.error(message);
  return true;
}
