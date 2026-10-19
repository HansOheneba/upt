import { brand } from "@/lib/tenant";
import { usePensionStore } from "@/store/pensionStore";

const MODE_KEY = "upt_pension_demo";

export type PensionDemoMode = "active" | "joining";

export function getPensionDemoMode(): PensionDemoMode | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(MODE_KEY);
    return value === "active" || value === "joining" ? value : null;
  } catch {
    return null;
  }
}

export function setPensionDemoMode(mode: PensionDemoMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MODE_KEY, mode);
  } catch {
    /* noop */
  }
}

/** Logged-in pension demo. Skips subscription and dashboard API calls. */
export function isUptPensionDemoActive(): boolean {
  return brand.id === "upt" && getPensionDemoMode() === "active";
}

export function clearPensionSession(): void {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(MODE_KEY);
    } catch {
      /* noop */
    }
  }
  try {
    usePensionStore.getState().clear();
  } catch {
    /* noop */
  }
}
