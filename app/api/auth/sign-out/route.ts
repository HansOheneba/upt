// app/api/auth/sign-out/route.ts
//
// Clears the HttpOnly session cookie and optionally revokes the token on the
// backend. Returns { ok: true } so the client can redirect to the login page.

import { NextRequest, NextResponse } from "next/server";
import { SESSION_TOKEN_COOKIE } from "@/lib/onboarding/token";

const isProd = process.env.NODE_ENV === "production";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_TOKEN_COOKIE)?.value;

  // Best-effort: revoke the session on the backend.
  if (token) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_API_URL?.replace(/\/$/, "");
    if (baseUrl) {
      try {
        await fetch(`${baseUrl}/auth.revoke-session`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
      } catch {
        // Ignore — we still clear the cookie locally.
      }
    }
  }

  const res = NextResponse.json({ ok: true });

  // Delete the session cookie by setting it with maxAge 0.
  res.cookies.set(SESSION_TOKEN_COOKIE, "", {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });

  return res;
}
