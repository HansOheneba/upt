import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function secretMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Finnhub posts events here and disables the webhook if this does not
 * return 2xx quickly. Check the secret, then acknowledge before any other work.
 */
export async function POST(req: NextRequest) {
  const expected = process.env.FINNHUB_WEBHOOK_SECRET?.trim();
  if (
    !expected ||
    !secretMatches(req.headers.get("x-finnhub-secret"), expected)
  ) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
