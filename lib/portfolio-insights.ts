import type { AssetHolding, AssetType, Property } from "@/lib/client-data";
import {
  currentValue,
  formatCurrency,
  getPropertyCountryConcentrationFromEntries,
  propertyEquity,
} from "@/lib/client-data";
import type {
  Insight,
  InsightTone,
} from "@/components/dashboard/assets/celerey-insights";

/** Minimal holding shape used by the analyzer (UI + AI). */
export type InsightHolding = {
  id: string;
  name: string;
  symbol?: string | null;
  assetType: AssetType | string;
  value: number;
  costBasis: number;
};

/** Minimal property shape used by the analyzer. */
export type InsightProperty = {
  name: string;
  marketValue: number;
  mortgageBalance: number;
  country: string;
  city: string;
};

export type PortfolioInsightInput = {
  holdings: InsightHolding[];
  properties: InsightProperty[];
  riskProfile?: string | null;
  currency?: string;
};

type ClassKey =
  | "equities"
  | "fixed_income"
  | "cash"
  | "crypto"
  | "alternatives";

const CLASS_LABEL: Record<ClassKey, string> = {
  equities: "equities",
  fixed_income: "bonds",
  cash: "cash",
  crypto: "crypto",
  alternatives: "other",
};

function toClass(assetType: string): ClassKey {
  switch (assetType) {
    case "stock":
    case "etf":
    case "mutual_fund":
    case "equity_compensation":
      return "equities";
    case "commodity":
      return "alternatives";
    case "bond":
      return "fixed_income";
    case "cash":
      return "cash";
    case "crypto":
      return "crypto";
    default:
      return "alternatives";
  }
}

/** Typical equity band for liquid portfolio by risk profile. */
const EQUITY_TARGET: Record<
  string,
  { min: number; max: number; label: string }
> = {
  conservative: { min: 20, max: 40, label: "20-40%" },
  balanced: { min: 40, max: 60, label: "40-60%" },
  growth: { min: 65, max: 75, label: "65-75%" },
  aggressive: { min: 80, max: 95, label: "80-95%" },
};

const TECH_SYMBOLS = new Set([
  "AAPL",
  "MSFT",
  "GOOGL",
  "GOOG",
  "AMZN",
  "META",
  "NVDA",
  "TSLA",
  "NFLX",
  "AMD",
  "AVGO",
  "ORCL",
  "CRM",
  "ADBE",
]);

function roundPct(n: number): number {
  return Math.round(n);
}

function riskKey(profile?: string | null): string | null {
  if (!profile) return null;
  const k = profile.trim().toLowerCase();
  return EQUITY_TARGET[k] ? k : null;
}

export function holdingsToInsightHoldings(
  holdings: AssetHolding[],
  holdingValues?: Record<string, number>,
): InsightHolding[] {
  return holdings
    .filter((h) => h.is_active)
    .map((h) => ({
      id: h.holding_id,
      name: h.name,
      symbol: h.symbol,
      assetType: h.asset_type,
      value:
        holdingValues && Number.isFinite(holdingValues[h.holding_id])
          ? holdingValues[h.holding_id]!
          : currentValue(h, []),
      costBasis: Number.isFinite(h.cost_basis) ? h.cost_basis : 0,
    }));
}

export function propertiesToInsightProperties(
  properties: Property[],
): InsightProperty[] {
  return properties
    .filter((p) => p.is_active && p.country !== "")
    .map((p) => ({
      name: p.name,
      marketValue: p.market_value,
      mortgageBalance: p.market_value - propertyEquity(p),
      country: p.country,
      city: p.city,
    }));
}

/**
 * Derive actionable portfolio insights from holdings + property.
 * Returns warn-first then good/info, capped for the dashboard.
 */
export function derivePortfolioInsights(
  input: PortfolioInsightInput,
): Insight[] {
  const holdings = input.holdings.filter((h) => h.value > 0 || h.costBasis > 0);
  const properties = input.properties.filter((p) => p.marketValue > 0);
  const currency = input.currency;
  const fmt = (n: number) => formatCurrency(n, currency);

  const portfolioValue = holdings.reduce((s, h) => s + h.value, 0);
  const propertyMarketValue = properties.reduce((s, p) => s + p.marketValue, 0);
  const propertyEquityTotal = properties.reduce(
    (s, p) => s + (p.marketValue - p.mortgageBalance),
    0,
  );
  const totalGrossAssets = portfolioValue + propertyMarketValue;

  const classTotals: Record<ClassKey, number> = {
    equities: 0,
    fixed_income: 0,
    cash: 0,
    crypto: 0,
    alternatives: 0,
  };
  for (const h of holdings) {
    classTotals[toClass(h.assetType)] += h.value;
  }

  const ranked = [...holdings].sort((a, b) => b.value - a.value);
  const insights: Insight[] = [];

  // 1. Brick & mortar concentration (total wealth, not just liquid book)
  if (totalGrossAssets > 0 && propertyMarketValue > 0) {
    const brickPct = (propertyMarketValue / totalGrossAssets) * 100;
    const countries = [...new Set(properties.map((p) => p.country))];
    const countryNote =
      countries.length > 1
        ? ` across ${countries.length} countries (${countries.join(", ")})`
        : countries.length === 1
          ? ` (${countries[0]})`
          : "";

    if (brickPct >= 60) {
      insights.push({
        id: "brick-mortar",
        title: "Most of your wealth is in property",
        description: `${roundPct(brickPct)}% of total assets (${fmt(propertyMarketValue)}) is property${countryNote}. Investable holdings are ${fmt(portfolioValue)} (${roundPct((portfolioValue / totalGrossAssets) * 100)}%). Equity in the buildings is ${fmt(propertyEquityTotal)}. That is a lot tied up in illiquid assets. Put new savings into stocks and bonds before buying another place.`,
        tone: "warn",
      });
    } else if (brickPct >= 40) {
      insights.push({
        id: "brick-mortar",
        title: "Property is a big share of net worth",
        description: `Property is ${roundPct(brickPct)}% of total assets (${fmt(propertyMarketValue)})${countryNote}. Investable portfolio: ${fmt(portfolioValue)}. Watch loan-to-value and insurance. Do not let housing crowd out growth assets.`,
        tone: "info",
      });
    } else if (brickPct >= 15) {
      insights.push({
        id: "brick-mortar",
        title: "Property mix looks reasonable",
        description: `Property is ${roundPct(brickPct)}% of total assets (${fmt(propertyMarketValue)}). Investable holdings: ${fmt(portfolioValue)}. Enough room for both housing and market investments.`,
        tone: "good",
      });
    }
  }

  // 1b. Geographic concentration within the property book
  const geo = getPropertyCountryConcentrationFromEntries(
    properties.map((p) => ({ country: p.country, marketValue: p.marketValue })),
  );
  if (geo && geo.countryCount >= 2) {
    if (geo.topPct >= 65 || (geo.topPct >= 55 && geo.topCount >= 3)) {
      insights.push({
        id: "property-geo-concentration",
        title: "Property is mostly in one country",
        description: `${roundPct(geo.topPct)}% of property value (${fmt(geo.topValue)}) is in ${geo.topCountryLabel}, across ${geo.topCount} ${geo.topCount === 1 ? "property" : "properties"}. One country means one tax system, one rate cycle, one housing downturn. Buy elsewhere next time, or build investable assets outside that market.`,
        tone: "warn",
      });
    } else if (geo.topPct >= 45) {
      insights.push({
        id: "property-geo-concentration",
        title: "Property leans toward one country",
        description: `${roundPct(geo.topPct)}% of property value is in ${geo.topCountryLabel}. You hold property in ${geo.countryCount} countries, but the weight is uneven. Check FX, insurance, and estate rules before adding more in the same market.`,
        tone: "info",
      });
    }
  }

  if (portfolioValue <= 0) {
    return rankAndCap(insights);
  }

  const equityPct = (classTotals.equities / portfolioValue) * 100;
  const cashPct = (classTotals.cash / portfolioValue) * 100;
  const cryptoPct = (classTotals.crypto / portfolioValue) * 100;
  const bondPct = (classTotals.fixed_income / portfolioValue) * 100;
  const altPct = (classTotals.alternatives / portfolioValue) * 100;

  // 2. Risk-profile drift on the liquid book
  const rk = riskKey(input.riskProfile);
  if (rk) {
    const band = EQUITY_TARGET[rk]!;
    if (equityPct < band.min - 3) {
      insights.push({
        id: "risk-drift",
        title: "Not enough equities for your risk profile",
        description: `A ${rk} profile usually means ${band.label} in equities. Yours are ${roundPct(equityPct)}% of investable assets${cashPct >= 15 ? `, with ${roundPct(cashPct)}% in cash` : ""}. Move some idle cash into broad equity funds if that matches how you feel about risk.`,
        tone: "warn",
      });
    } else if (equityPct > band.max + 5) {
      insights.push({
        id: "risk-drift",
        title: "Equities above your risk band",
        description: `Equities are ${roundPct(equityPct)}% of investable assets. That is above the ${band.label} range for a ${rk} profile. Trim winners or add bonds and cash if you want the mix to match the quiz.`,
        tone: "warn",
      });
    } else {
      insights.push({
        id: "risk-drift",
        title: "Equities match your risk profile",
        description: `Equities are ${roundPct(equityPct)}% of investable assets, within the ${band.label} band for ${rk}. Bonds ${roundPct(bondPct)}%, cash ${roundPct(cashPct)}%, crypto ${roundPct(cryptoPct)}%.`,
        tone: "good",
      });
    }
  }

  // 3. Single-name concentration
  const top = ranked[0];
  if (top) {
    const topShare = (top.value / portfolioValue) * 100;
    if (topShare >= 25) {
      insights.push({
        id: "single-name",
        title: "One holding is too large",
        description: `${top.name}${top.symbol ? ` (${top.symbol})` : ""} is ${roundPct(topShare)}% of investable assets (${fmt(top.value)}). Above 25-30% in one name is a lot of eggs in one basket. Aim for 15-20% max.`,
        tone: "warn",
      });
    }
  }

  // 4. Tech / mega-cap concentration (symbol heuristic)
  let techValue = 0;
  for (const h of holdings) {
    const sym = h.symbol?.toUpperCase();
    if (sym && TECH_SYMBOLS.has(sym)) techValue += h.value;
  }
  const techPct = (techValue / portfolioValue) * 100;
  if (techPct >= 20) {
    insights.push({
      id: "tech-concentration",
      title: "A lot of direct tech stock",
      description: `Named tech stocks are about ${roundPct(techPct)}% of investable assets (${fmt(techValue)}). Your ETFs probably hold more tech underneath. Count both before adding another big tech name.`,
      tone: "warn",
    });
  } else if (techPct >= 12) {
    insights.push({
      id: "tech-concentration",
      title: "Direct tech is a noticeable slice",
      description: `Direct tech stocks are ~${roundPct(techPct)}% of investable assets (${fmt(techValue)}). Fine if you want a growth tilt. I would not add more single-name tech on top of global ETFs.`,
      tone: "info",
    });
  }

  // 5. Crypto overweight
  if (cryptoPct >= 10) {
    insights.push({
      id: "crypto",
      title: "Crypto is a big bet",
      description: `Crypto is ${roundPct(cryptoPct)}% of investable assets (${fmt(classTotals.crypto)}). Many people cap speculative crypto at 5-10%. Size it so a 50% drop would not force you to sell anything else.`,
      tone: "warn",
    });
  }

  // 6. Cash drag vs growth profile
  if (cashPct >= 15 && (!rk || rk === "growth" || rk === "aggressive")) {
    insights.push({
      id: "cash-drag",
      title: "A lot of cash in the portfolio",
      description: `Cash is ${roundPct(cashPct)}% of investable assets (${fmt(classTotals.cash)}). Keep 3-6 months of expenses on hand. If the emergency fund is already full, the rest could be working harder.`,
      tone: "info",
    });
  } else if (cashPct > 0 && cashPct < 5) {
    insights.push({
      id: "cash-thin",
      title: "Very little cash in investments",
      description: `Only ${roundPct(cashPct)}% of investable assets is cash (${fmt(classTotals.cash)}). Make sure you have 3-6 months of expenses outside the portfolio before buying more risk assets.`,
      tone: "info",
    });
  }

  // 7. Geographic / diaspora property + EM equity narrative
  if (properties.length >= 2) {
    const cities = properties.map((p) => p.city).filter(Boolean);
    const emEquity = holdings
      .filter((h) => {
        const name = h.name.toLowerCase();
        const sym = h.symbol?.toUpperCase() ?? "";
        return (
          sym === "EEM" ||
          name.includes("emerging") ||
          name.includes("nigeria") ||
          name.includes("africa") ||
          name.includes("ghana")
        );
      })
      .reduce((s, h) => s + h.value, 0);
    const emPct = (emEquity / portfolioValue) * 100;
    if (cities.length >= 2) {
      insights.push({
        id: "geo-spread",
        title: "Wealth spread across countries",
        description: `Property in ${cities.join(", ")}${emPct >= 5 ? `. About ${roundPct(emPct)}% of investable assets is in EM or Africa-linked funds` : ""}. Multiple countries help with currency and housing cycles. They also mean more tax, FX, and estate paperwork. Keep titles, insurance, and remittance plans current.`,
        tone: "info",
      });
    }
  }

  // 8. Alternatives / illiquid credit
  if (altPct >= 3) {
    insights.push({
      id: "alternatives",
      title: "Alternatives are illiquid",
      description: `Other assets are ${roundPct(altPct)}% of investable holdings (${fmt(classTotals.alternatives)}). P2P and private credit are riskier and harder to sell than listed bonds. Size them so a wave of defaults would not force a fire sale of core holdings.`,
      tone: "info",
    });
  }

  // 9. Performance narrative if enough winners
  const withGain = ranked.filter((r) => r.costBasis > 0 && r.value > r.costBasis);
  if (withGain.length >= 3 && ranked.length >= 5) {
    const best = [...withGain].sort((a, b) => {
      const ap = (a.value - a.costBasis) / a.costBasis;
      const bp = (b.value - b.costBasis) / b.costBasis;
      return bp - ap;
    })[0]!;
    const bestPct = roundPct(
      ((best.value - best.costBasis) / best.costBasis) * 100,
    );
    insights.push({
      id: "winners",
      title: "Several holdings are in profit",
      description: `${withGain.length} of ${ranked.length} holdings are above cost. Best mover: ${best.name}, up ${bestPct}% (${fmt(best.value)}). Paper gains only. Rebalance with tax and ISA/SIPP wrappers in mind, not just because the price went up.`,
      tone: "good",
    });
  }

  return rankAndCap(insights);
}

function rankAndCap(insights: Insight[]): Insight[] {
  const toneRank: Record<InsightTone, number> = { warn: 0, info: 1, good: 2 };
  return insights
    .sort((a, b) => toneRank[a.tone] - toneRank[b.tone])
    .slice(0, 6);
}

/** Short markdown summary for AI chat / prompts. */
export function formatPortfolioInsightsMarkdown(
  insights: Insight[],
  opts?: { portfolioValue?: number; propertyMarketValue?: number; currency?: string },
): string {
  if (insights.length === 0) {
    return "No strong flags yet. Add holdings and property to get concentration and allocation analysis.";
  }
  const headerParts: string[] = [];
  if (opts?.portfolioValue != null && opts.portfolioValue > 0) {
    headerParts.push(
      `Investable portfolio: **${formatCurrency(opts.portfolioValue, opts.currency)}**`,
    );
  }
  if (opts?.propertyMarketValue != null && opts.propertyMarketValue > 0) {
    headerParts.push(
      `Property: **${formatCurrency(opts.propertyMarketValue, opts.currency)}**`,
    );
  }
  const header = headerParts.length ? `${headerParts.join(" · ")}\n\n` : "";
  const body = insights
    .map((i, idx) => `${idx + 1}. **${i.title}** - ${i.description}`)
    .join("\n\n");
  return `${header}${body}`;
}

export function portfolioClassBreakdown(
  holdings: InsightHolding[],
): { key: ClassKey; label: string; value: number; percentage: number }[] {
  const totals: Record<ClassKey, number> = {
    equities: 0,
    fixed_income: 0,
    cash: 0,
    crypto: 0,
    alternatives: 0,
  };
  let sum = 0;
  for (const h of holdings) {
    totals[toClass(h.assetType)] += h.value;
    sum += h.value;
  }
  return (Object.keys(totals) as ClassKey[])
    .map((key) => ({
      key,
      label: CLASS_LABEL[key],
      value: totals[key],
      percentage: sum > 0 ? (totals[key] / sum) * 100 : 0,
    }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);
}
