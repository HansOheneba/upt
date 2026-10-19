import { NextRequest, NextResponse } from "next/server";
import {
  ONBOARDING_TOKEN_COOKIE,
  SESSION_TOKEN_COOKIE,
} from "@/lib/onboarding/token";

const isProd = process.env.NODE_ENV === "production";

export async function POST(req: NextRequest) {
  let token: unknown;
  let type: unknown;

  try {
    const body = (await req.json()) as { token?: unknown; type?: unknown };
    token = body?.token;
    type = body?.type;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  if (typeof token !== "string" || token.trim().length === 0) {
    return NextResponse.json({ error: "Invalid token." }, { status: 400 });
  }

  const cookieName =
    type === "session" ? SESSION_TOKEN_COOKIE : ONBOARDING_TOKEN_COOKIE;

  const res = NextResponse.json({ ok: true });

  res.cookies.set(cookieName, token.trim(), {
    httpOnly: true, // JS cannot read this cookie
    secure: isProd, // HTTPS only in production; allows HTTP on localhost
    sameSite: "strict", // Not sent on cross-site requests
    path: "/",
  });

  return res;
}
