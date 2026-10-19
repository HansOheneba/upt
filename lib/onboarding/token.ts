/**
 * Server-side helper for reading the onboarding token cookie.
 *
 * Usage inside any Next.js Route Handler or Server Action:
 *
 *   import { getOnboardingToken } from "@/lib/onboarding/token";
 *
 *   export async function POST(req: NextRequest) {
 *     const token = getOnboardingToken(req);
 *     if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 *     // forward token to backend...
 *   }
 *
 * The cookie is HttpOnly — it cannot be read from client-side JS.
 * It is automatically included by the browser on every same-origin request.
 */

import type { NextRequest } from "next/server";

// __Host- prefix enforces Secure + path=/ in production (HTTPS).
// Browsers reject it on plain HTTP (localhost), so we use a simple name in dev.
const isProd = process.env.NODE_ENV === "production";
export const ONBOARDING_TOKEN_COOKIE = isProd
  ? "__Host-cel_ob_token"
  : "cel_ob_token";
export const SESSION_TOKEN_COOKIE = isProd
  ? "__Host-cel_session"
  : "cel_session";

/**
 * Returns the onboarding token from the request's cookies,
 * or `null` if it isn't present.
 */
export function getOnboardingToken(req: NextRequest): string | null {
  return req.cookies.get(ONBOARDING_TOKEN_COOKIE)?.value ?? null;
}

/**
 * Returns the session token from the request's cookies,
 * or `null` if it isn't present.
 */
export function getSessionToken(req: NextRequest): string | null {
  return req.cookies.get(SESSION_TOKEN_COOKIE)?.value ?? null;
}
