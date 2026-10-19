// app/api/auth/refresh/route.ts
//
// Attempts to refresh the session token by calling auth.refresh-session.
// On success, sets a fresh SESSION_TOKEN_COOKIE and returns { ok: true }.
// On failure, returns { ok: false } so the client can redirect to login.

import { NextRequest, NextResponse } from "next/server";
import { SESSION_TOKEN_COOKIE } from "@/lib/onboarding/token";
import { httpStatusFromEnvelope } from "@/lib/upstream-status";

const isProd = process.env.NODE_ENV === "production";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_TOKEN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json(
      { ok: false, reason: "no_session" },
      { status: 401 },
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_API_URL?.replace(/\/$/, "");
  if (!baseUrl) {
    return NextResponse.json(
      { ok: false, reason: "misconfiguration" },
      { status: 500 },
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${baseUrl}/auth.refresh-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, reason: "upstream_unreachable" },
      { status: 502 },
    );
  }

  const data = await upstream.json().catch(() => null);

  const upstreamStatus = httpStatusFromEnvelope(upstream.status, data);
  if (!upstream.ok || upstreamStatus >= 400 || !data || data.success === false) {
    return NextResponse.json(
      { ok: false, reason: "refresh_rejected" },
      { status: upstreamStatus >= 400 ? upstreamStatus : 401 },
    );
  }

  // The refresh endpoint should return a new session token
  const newToken: string | undefined =
    data?.data?.session_token ?? data?.session_token;

  if (!newToken) {
    // Refresh succeeded but no new token — treat existing token as still valid
    return NextResponse.json({ ok: true });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_TOKEN_COOKIE, newToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    path: "/",
  });
  return res;
}
