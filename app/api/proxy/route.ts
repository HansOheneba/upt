// app/api/proxy/route.ts
//
// Generic backend proxy that attaches the HttpOnly session cookie as a Bearer
// token so client-side JS never has to read it.
//
// Usage (client-side):
//   POST /api/proxy  { path: "goals.find",    method: "GET" }
//   POST /api/proxy  { path: "goals.create",  method: "POST",   body: {...} }
//   POST /api/proxy  { path: "goals.update",  method: "PUT",    body: {...} }
//   POST /api/proxy  { path: "goals.delete",  method: "DELETE", body: {...} }

import { NextRequest, NextResponse } from "next/server";
import { SESSION_TOKEN_COOKIE } from "@/lib/onboarding/token";
import { httpStatusFromEnvelope } from "@/lib/upstream-status";

// ── Whitelist ──────────────────────────────────────────────────────────────
// Only these backend path prefixes are allowed to prevent SSRF.
const ALLOWED_PATH_PREFIXES = [
  "user.", // user.get, user.update
  "goals.",
  "cashflow.",
  "assets.",
  "insurance.",
  "properties.",
  "liabilities.",
  "retirement.",
  "risk.",
  "subscription.", // subscription.find, subscription.create-checkout, subscription.cancel
  "dashboard.", // dashboard.summary
  "client.", // book collaboration: messages, tasks, documents, availability, appointments, advisory
  "auth.refresh-session",
  "auth.revoke-session",
] as const;

function isAllowedPath(path: string): boolean {
  const bare = path.split("?")[0] ?? path;
  return ALLOWED_PATH_PREFIXES.some((prefix) => bare.startsWith(prefix));
}

function missingAuth(): NextResponse {
  return NextResponse.json(
    { error: "Unauthorized — session expired." },
    { status: 401 },
  );
}

function missingBaseUrl(): NextResponse {
  return NextResponse.json(
    { error: "Server misconfiguration: missing API base URL." },
    { status: 500 },
  );
}

function forbiddenPath(): NextResponse {
  return NextResponse.json(
    { error: "Forbidden — unknown API path." },
    { status: 403 },
  );
}

async function forwardJson(
  baseUrl: string,
  token: string,
  path: string,
  method: string,
  body: unknown,
): Promise<Response> {
  return fetch(`${baseUrl}/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    ...(method !== "GET" && body !== undefined
      ? { body: JSON.stringify(body) }
      : {}),
  });
}

async function forwardMultipart(
  baseUrl: string,
  token: string,
  path: string,
  form: FormData,
): Promise<Response> {
  const upstreamForm = new FormData();
  for (const [key, value] of form.entries()) {
    if (key === "path" || key === "method") continue;
    upstreamForm.append(key, value);
  }
  return fetch(`${baseUrl}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: upstreamForm,
  });
}

async function jsonFromUpstream(
  upstream: Response,
  path?: string,
): Promise<NextResponse> {
  const data = await upstream.json().catch(() => null);
  const bare = path?.split("?")[0] ?? "";
  if (bare === "client.advisory.overview" || bare === "client.appointments.request") {
    console.log(`[${bare}] status`, upstream.status);
    console.log(`[${bare}] body`, JSON.stringify(data, null, 2));
  }
  const body = data ?? {};
  return NextResponse.json(body, {
    status: httpStatusFromEnvelope(upstream.status, body),
  });
}

// ── Handler ────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_TOKEN_COOKIE)?.value;
  if (!token) return missingAuth();

  const baseUrl = process.env.NEXT_PUBLIC_BASE_API_URL?.replace(/\/$/, "");
  if (!baseUrl) return missingBaseUrl();

  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 },
      );
    }

    const path = form.get("path");
    if (typeof path !== "string" || !isAllowedPath(path)) {
      return forbiddenPath();
    }

    let upstream: Response;
    try {
      upstream = await forwardMultipart(baseUrl, token, path, form);
    } catch {
      return NextResponse.json(
        { error: "Could not reach the upstream API. Please try again." },
        { status: 502 },
      );
    }
    return jsonFromUpstream(upstream, path);
  }

  let envelope: { path: string; method?: string; body?: unknown };
  try {
    envelope = (await req.json()) as {
      path: string;
      method?: string;
      body?: unknown;
    };
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const { path, method = "GET", body } = envelope;

  if (typeof path !== "string" || !isAllowedPath(path)) {
    return forbiddenPath();
  }

  const barePath = path.split("?")[0] ?? path;
  if (barePath === "client.appointments.request") {
    console.log("[client.appointments.request] outgoing", {
      method,
      body,
    });
  }

  let upstream: Response;
  try {
    upstream = await forwardJson(baseUrl, token, path, method, body);
  } catch {
    return NextResponse.json(
      { error: "Could not reach the upstream API. Please try again." },
      { status: 502 },
    );
  }

  return jsonFromUpstream(upstream, path);
}
