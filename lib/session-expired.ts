/** Fired when the API returns 401 after a failed token refresh. */
export const SESSION_EXPIRED_EVENT = "celerey:session-expired";

let notified = false;

/**
 * Pathname-only demo check. Kept here so session-expiry code does not import
 * `demo-mode` (that module pulls in the store and would cycle with dashboard-api).
 */
export function isDemoDashboardPath(): boolean {
  if (typeof window === "undefined") return false;
  const p = window.location.pathname;
  return p === "/dashboard/demo" || p.startsWith("/dashboard/demo/");
}

/** Show the session-expired modal once per page load. */
export function notifySessionExpired(): void {
  if (typeof window === "undefined" || notified) return;
  // Demo has no real session. A leftover or missing cookie must not bounce
  // visitors to sign-in.
  if (isDemoDashboardPath()) return;
  notified = true;
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
}
