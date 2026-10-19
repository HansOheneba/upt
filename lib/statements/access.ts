import "server-only";

import { cookies } from "next/headers";

import { SESSION_TOKEN_COOKIE } from "@/lib/onboarding/token";

export const DEMO_CLIENT_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

export type StatementActor = {
  userId: string;
  currency: string;
  name: string;
  token: string | null;
};

type UserPayload = {
  userId: string;
  currency: string;
  name: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function readUser(payload: unknown): UserPayload | null {
  const root = asRecord(payload);
  const data = asRecord(root?.data) ?? root;
  if (!data) {
    return null;
  }

  const userId = data.user_id;
  if (typeof userId !== "string" || userId.length === 0) {
    return null;
  }

  const first = typeof data.first_name === "string" ? data.first_name : "";
  const last = typeof data.last_name === "string" ? data.last_name : "";
  const display =
    typeof data.display_name === "string" ? data.display_name.trim() : "";
  const name = display || `${first} ${last}`.trim() || "You";
  const currency =
    typeof data.currency === "string" && data.currency.trim()
      ? data.currency.trim().toUpperCase()
      : "USD";

  return { userId, currency, name };
}

async function fetchSignedInUser(token: string): Promise<UserPayload | null> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_API_URL?.replace(/\/$/, "");
  if (!baseUrl) {
    return null;
  }

  const response = await fetch(`${baseUrl}/user.get`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return readUser(await response.json().catch(() => null));
}

export async function authorizeStatementClient(
  clientId: string,
): Promise<
  { ok: true; actor: StatementActor } | { ok: false; message: string }
> {
  const requested = clientId.trim();
  const jar = await cookies();
  const token = jar.get(SESSION_TOKEN_COOKIE)?.value;

  if (requested === DEMO_CLIENT_ID) {
    return {
      ok: true,
      actor: {
        userId: DEMO_CLIENT_ID,
        currency: "GHS",
        name: "Bill Richardson",
        token: null,
      },
    };
  }

  if (token) {
    const user = await fetchSignedInUser(token);
    if (!user) {
      return { ok: false, message: "Sign in to import a statement." };
    }

    if (requested && requested !== user.userId) {
      return {
        ok: false,
        message: "You can only import statements for your own cash flow.",
      };
    }

    return {
      ok: true,
      actor: { ...user, token },
    };
  }

  return { ok: false, message: "Sign in to import a statement." };
}
