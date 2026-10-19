import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { SESSION_TOKEN_COOKIE } from "@/lib/onboarding/token";

const bodySchema = z.object({
  symbols: z.array(z.string().trim().min(1).max(15)).min(1).max(40),
});

const TICKER = /^[A-Z0-9][A-Z0-9.\-]{0,14}$/;

type YahooMeta = {
  regularMarketPrice?: number;
  currency?: string;
};

function isAllowed(req: NextRequest): boolean {
  if (req.cookies.get(SESSION_TOKEN_COOKIE)?.value) return true;
  return process.env.NODE_ENV !== "production";
}

async function finnhubQuote(
  symbol: string,
  token: string,
): Promise<number | null> {
  const url = new URL("https://finnhub.io/api/v1/quote");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("token", token);

  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;

  const data = (await res.json()) as { c?: unknown };
  return typeof data.c === "number" && data.c > 0 ? data.c : null;
}

async function yahooMeta(symbol: string): Promise<YahooMeta | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    chart?: { result?: { meta?: YahooMeta }[] };
  };
  const meta = data.chart?.result?.[0]?.meta;
  if (!meta || typeof meta.regularMarketPrice !== "number") return null;
  if (meta.regularMarketPrice <= 0) return null;
  return meta;
}

function yahooSymbols(symbol: string): string[] {
  if (symbol.includes(".") || symbol.includes("-")) return [symbol];
  return [symbol, `${symbol}.L`];
}

async function toUsd(
  amount: number,
  currency: string,
  fxRates: Map<string, Promise<number | null>>,
): Promise<number | null> {
  let code = currency;
  let value = amount;
  if (currency === "GBp" || currency === "GBX") {
    code = "GBP";
    value = amount / 100;
  }
  if (code === "USD") return value;
  if (!/^[A-Z]{3}$/.test(code)) return null;

  let pending = fxRates.get(code);
  if (!pending) {
    pending = yahooMeta(`${code}USD=X`).then((meta) =>
      meta?.regularMarketPrice && meta.regularMarketPrice > 0
        ? meta.regularMarketPrice
        : null,
    );
    fxRates.set(code, pending);
  }
  const rate = await pending;
  if (rate == null) return null;
  return value * rate;
}

async function yahooUsd(
  symbol: string,
  fxRates: Map<string, Promise<number | null>>,
): Promise<number | null> {
  for (const candidate of yahooSymbols(symbol)) {
    const meta = await yahooMeta(candidate);
    if (!meta?.regularMarketPrice || !meta.currency) continue;
    const usd = await toUsd(meta.regularMarketPrice, meta.currency, fxRates);
    if (usd != null && usd > 0) return usd;
  }
  return null;
}

async function coinGeckoUsd(symbol: string): Promise<number | null> {
  const searchUrl = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(symbol)}`;
  const searchRes = await fetch(searchUrl, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!searchRes.ok) return null;

  const search = (await searchRes.json()) as {
    coins?: { id?: string; symbol?: string }[];
  };
  const hit = search.coins?.find(
    (coin) => coin.symbol?.toUpperCase() === symbol && coin.id,
  );
  if (!hit?.id) return null;

  const priceUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(hit.id)}&vs_currencies=usd`;
  const priceRes = await fetch(priceUrl, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!priceRes.ok) return null;

  const prices = (await priceRes.json()) as Record<string, { usd?: number }>;
  const usd = prices[hit.id]?.usd;
  return typeof usd === "number" && usd > 0 ? usd : null;
}

async function quoteInUsd(
  symbol: string,
  token: string | undefined,
  fxRates: Map<string, Promise<number | null>>,
): Promise<number | null> {
  if (token) {
    const finnhub = await finnhubQuote(symbol, token);
    if (finnhub != null) return finnhub;
  }

  const yahoo = await yahooUsd(symbol, fxRates);
  if (yahoo != null) return yahoo;

  return coinGeckoUsd(symbol);
}

export async function POST(req: NextRequest) {
  if (!isAllowed(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let symbols: string[];
  try {
    const body = bodySchema.parse(await req.json());
    symbols = [
      ...new Set(
        body.symbols
          .map((symbol) => symbol.toUpperCase())
          .filter((symbol) => TICKER.test(symbol)),
      ),
    ];
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (symbols.length === 0) {
    return NextResponse.json({ prices: {} });
  }

  const token = process.env.FINNHUB_API_KEY?.trim() || undefined;
  const fxRates = new Map<string, Promise<number | null>>();
  const prices: Record<string, number> = {};

  await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const price = await quoteInUsd(symbol, token, fxRates);
        if (price != null) prices[symbol] = price;
      } catch {
        // Leave the symbol out so the client keeps the stored value.
      }
    }),
  );

  return NextResponse.json({ prices });
}
