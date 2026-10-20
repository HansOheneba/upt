/**
 * Two local sessions for the UPT frontend.
 * "demo" is the populated member opened from /demo.
 * "customer" is a new account: empty until they add something.
 * Each view has its own localStorage keys. Neither reads the old API cache.
 */

export type LocalView = "demo" | "customer";

const VIEW_KEY = "upt_local_view";

export function getLocalView(): LocalView {
  if (typeof window === "undefined") return "customer";
  try {
    return window.localStorage.getItem(VIEW_KEY) === "demo" ? "demo" : "customer";
  } catch {
    return "customer";
  }
}

export function setLocalView(view: LocalView): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(VIEW_KEY, view);
  } catch {
    /* noop */
  }
}

export function pensionStorageKey(view: LocalView = getLocalView()): string {
  return view === "demo" ? "upt_pension_demo_v2" : "upt_pension_customer_v2";
}

export function financialStorageKey(view: LocalView = getLocalView()): string {
  return `financial-store-v2:${view}`;
}
