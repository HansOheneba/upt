"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartPie,
  faChartLine,
  faWallet,
  faArrowTrendUp,
  faArrowTrendDown,
  faPlus,
  faPencil,
  faTrash,
  faRotate,
  faInfoCircle,
  faTriangleExclamation,
  faCoins,
  faBitcoinSign,
  faBuilding,
  faLandmark,
  faSackDollar,
  faBoxArchive,
  faLayerGroup,
  faOilCan,
  faAward,
  faChevronDown,
  faChevronUp,
  faBroadcastTower,
  faClockRotateLeft,
} from "@fortawesome/free-solid-svg-icons";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";

import { KpiStrip } from "@/components/dashboard/kpi-strip";
import { dashboardTheme } from "@/lib/dashboard-theme";
import { DashboardSectionLabelWide as SectionLabel } from "@/components/dashboard/section-label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  formatCurrency,
  currentValue,
  assetTypeLabel,
  supportsMarket,
  ASSET_TYPE_OPTIONS,
  EQUITY_COMP_KIND_OPTIONS,
  POPULAR_SYMBOLS,
  mockPortfolioPerformance,
  selectPerformanceMetrics,
  calculateNetWorth,
  getNetWorthFx,
  type AssetHolding,
  type AssetValuation,
  type AssetType,
  type NetWorthBreakdownMetrics,
  type PerformancePoint,
  type ValuationMethod,
} from "@/lib/client-data";
import { NetWorthBreakdown as NetWorthBreakdownCard } from "@/components/dashboard/financial/NetWorthBreakdown";
import { DashboardEmptyState } from "@/components/dashboard/empty-state";
import { CelereyInsights } from "@/components/dashboard/assets/celerey-insights";
import {
  derivePortfolioInsights,
  holdingsToInsightHoldings,
  propertiesToInsightProperties,
} from "@/lib/portfolio-insights";
import { useFinancialStore } from "@/store/financialStore";
import { blockRecordCreate } from "@/lib/record-limits";
import {
  deleteAsset,
  createAsset,
  updateAsset,
  createAssetValuation,
} from "@/lib/dashboard-api";
import { DateInput } from "@/components/ui/date-input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { usePageData } from "@/hooks/usePageData";
import { useInvestmentCurrency, useUserCurrency, useWealthFormatting } from "@/hooks/useUserCurrency";
import { CurrencyDisplayToggle } from "@/components/dashboard/currency-display-context";
import { useTourDemoData } from "@/hooks/useTourDemo";
import { TOUR_DEMO_ASSET_HOLDINGS } from "@/lib/tour-demo-data";
import { toast } from "sonner";

// ─── Constants ─────────────────────────────────────────────────────────────────

const NAVY = "var(--brand-primary)";
const ALLOCATION_COLORS = [
  "var(--brand-primary)",
  "#2d5282",
  "#3b6cb5",
  "#7eb8e8",
  "#a8d4f5",
  "#c3e2fa",
];

// Cache duration: 2 hours in ms
const PRICE_CACHE_TTL_MS = 2 * 60 * 60 * 1000;
const PRICE_CACHE_KEY = "asset_live_prices_v2";

const ASSET_TYPE_ICONS: Record<AssetType, any> = {
  stock: faChartLine,
  etf: faLayerGroup,
  mutual_fund: faBuilding,
  bond: faLandmark,
  crypto: faBitcoinSign,
  commodity: faOilCan,
  equity_compensation: faAward,
  cash: faWallet,
  alternative: faBoxArchive,
  other: faCoins,
};

const FINNHUB_ASSET_TYPES = new Set<AssetType>([
  "stock",
  "etf",
  "commodity",
  "mutual_fund",
  "bond",
  "equity_compensation",
]);

function isCoinGeckoHolding(holding: AssetHolding): boolean {
  return (
    holding.is_active &&
    holding.asset_type === "crypto" &&
    !!holding.symbol &&
    !!COINGECKO_ID_MAP[holding.symbol]
  );
}

function isFinnhubHolding(holding: AssetHolding): boolean {
  if (!holding.is_active || !holding.symbol) return false;
  if (FINNHUB_ASSET_TYPES.has(holding.asset_type)) return true;
  return (
    holding.asset_type === "crypto" && !COINGECKO_ID_MAP[holding.symbol]
  );
}

const COINGECKO_ID_MAP: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  BNB: "binancecoin",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  AVAX: "avalanche-2",
  DOT: "polkadot",
  MATIC: "matic-network",
};

// ─── Types ─────────────────────────────────────────────────────────────────────

type LivePrices = Record<string, number | null>;

interface PriceCacheEntry {
  prices: LivePrices;
  fetchedAt: number; // epoch ms
}

interface HoldingDraft {
  name: string;
  asset_type: AssetType;
  symbol: string;
  quantity: string;
  cost_basis: string;
  current_value: string;
  coupon_rate: string;
  maturity_date: string;
  purchase_date: string;
  note: string;
}

const defaultDraft: HoldingDraft = {
  name: "",
  asset_type: "stock",
  symbol: "",
  quantity: "",
  cost_basis: "",
  current_value: "",
  coupon_rate: "",
  maturity_date: "",
  purchase_date: "",
  note: "",
};

// ─── Cache helpers ─────────────────────────────────────────────────────────────

function readPriceCache(): PriceCacheEntry | null {
  try {
    const raw = localStorage.getItem(PRICE_CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as PriceCacheEntry;
    if (Date.now() - entry.fetchedAt > PRICE_CACHE_TTL_MS) return null;
    return entry;
  } catch {
    return null;
  }
}

function writePriceCache(prices: LivePrices) {
  try {
    const entry: PriceCacheEntry = { prices, fetchedAt: Date.now() };
    localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify(entry));
  } catch {
    /* noop */
  }
}

// ─── Live Price Hook ───────────────────────────────────────────────────────────

function useLivePrices(holdings: AssetHolding[]) {
  const [prices, setPrices] = React.useState<LivePrices>({});
  const [loading, setLoading] = React.useState(false);
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);
  const [fromCache, setFromCache] = React.useState(false);

  const fetchPrices = React.useCallback(
    async (forceRefresh = false) => {
      // Check cache first unless forcing refresh
      if (!forceRefresh) {
        const cached = readPriceCache();
        if (cached) {
          // Only use cache if every priced holding already has an entry.
          // A null entry means we tried and the feed had no price.
          const pricedIds = holdings
            .filter((h) => isCoinGeckoHolding(h) || isFinnhubHolding(h))
            .map((h) => h.holding_id);
          const allCached = pricedIds.every((id) => id in cached.prices);
          if (allCached) {
            setPrices(cached.prices);
            setLastUpdated(new Date(cached.fetchedAt));
            setFromCache(true);
            return;
          }
          // Some holdings are missing - fall through to fresh fetch
        }
      }

      setLoading(true);
      setFromCache(false);
      const newPrices: LivePrices = {};

      const cryptoHoldings = holdings.filter(isCoinGeckoHolding);
      const marketHoldings = holdings.filter(isFinnhubHolding);

      if (cryptoHoldings.length > 0) {
        const ids = [
          ...new Set(
            cryptoHoldings
              .map((h) => COINGECKO_ID_MAP[h.symbol!])
              .filter(Boolean),
          ),
        ].join(",");

        try {
          const res = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
            { signal: AbortSignal.timeout(8000) },
          );
          if (res.ok) {
            const data = await res.json();
            cryptoHoldings.forEach((h) => {
              const geckoId = COINGECKO_ID_MAP[h.symbol!];
              if (geckoId && data[geckoId]?.usd) {
                newPrices[h.holding_id] = data[geckoId].usd;
              }
            });
          }
        } catch {
          // Silently fall back to stored valuations - don't crash on API error
        }
      }

      if (marketHoldings.length > 0) {
        const symbols = [
          ...new Set(marketHoldings.map((h) => h.symbol!.toUpperCase())),
        ];
        try {
          const res = await fetch("/api/market/quotes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ symbols }),
            signal: AbortSignal.timeout(20000),
          });
          if (res.ok) {
            const data = (await res.json()) as {
              prices?: Record<string, number>;
            };
            const quotes = data.prices ?? {};
            marketHoldings.forEach((h) => {
              const price = quotes[h.symbol!.toUpperCase()];
              newPrices[h.holding_id] =
                typeof price === "number" && price > 0 ? price : null;
            });
          }
        } catch {
          // Keep the stored current value when Finnhub is unreachable.
        }
      }

      writePriceCache(newPrices);
      setPrices(newPrices);
      setLastUpdated(new Date());
      setLoading(false);
    },
    [holdings],
  );

  // On mount: load from cache or fetch once
  React.useEffect(() => {
    fetchPrices(false);
  }, [fetchPrices]);

  return {
    prices,
    loading,
    lastUpdated,
    fromCache,
    refresh: () => fetchPrices(true),
  };
}

// ─── Value helpers ─────────────────────────────────────────────────────────────

function getLiveValue(
  holding: AssetHolding,
  valuations: AssetValuation[],
  livePrices: LivePrices,
): number {
  // Live pricing for market assets (stock, ETF, crypto)
  const livePrice = livePrices[holding.holding_id];
  if (livePrice != null && Number.isFinite(livePrice) && holding.quantity) {
    const strike =
      holding.asset_type === "equity_compensation" &&
      holding.coupon_rate != null &&
      holding.coupon_rate > 0
        ? holding.coupon_rate
        : 0;
    const unit = strike > 0 ? Math.max(0, livePrice - strike) : livePrice;
    return unit * holding.quantity;
  }
  // Use manually entered current_value when present
  if (holding.current_value != null && Number.isFinite(holding.current_value))
    return holding.current_value;
  return currentValue(holding, valuations);
}

function getLiveGainLoss(
  holding: AssetHolding,
  valuations: AssetValuation[],
  livePrices: LivePrices,
): { amount: number; pct: number } {
  const cv = getLiveValue(holding, valuations, livePrices);
  const cost = Number.isFinite(holding.cost_basis) ? holding.cost_basis : 0;
  const amount = cv - cost;
  const pct = cost > 0 ? (amount / cost) * 100 : 0;
  return { amount, pct };
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function InfoTip({ content }: { content: string }) {
  return (
    <UITooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help inline-flex">
          <FontAwesomeIcon
            icon={faInfoCircle}
            className="h-3 w-3 text-muted-foreground hover:text-foreground transition-colors"
          />
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-55 text-xs">{content}</TooltipContent>
    </UITooltip>
  );
}


// ─── Input helpers ───────────────────────────────────────────────────────────────

/** Format a raw string as a number with thousand-separator commas while typing. */
function formatNumericInput(val: string): string {
  const clean = val.replace(/[^0-9.]/g, "");
  const dot = clean.indexOf(".");
  if (dot === -1) return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const integer = clean.slice(0, dot).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${integer}.${clean.slice(dot + 1)}`;
}

/** Strip commas and parse to number before saving. */
function parseNumericInput(val: string): number {
  return Number(val.replace(/,/g, "")) || 0;
}

/** Derive the currency symbol (e.g. "$", "£", "₵") from an ISO currency code. */
function getCurrencySymbol(currency: string): string {
  try {
    return (
      new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      })
        .formatToParts(0)
        .find((p) => p.type === "currency")?.value ?? currency
    );
  } catch {
    return currency;
  }
}

function formatPortfolioAxisTick(value: number, currency: string): string {
  const absValue = Math.abs(value);

  try {
    if (absValue >= 1_000_000) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(value);
    }

    if (absValue >= 1_000) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(value);
    }

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${getCurrencySymbol(currency)}${Math.round(value)}`;
  }
}

function buildPortfolioPerformanceSeries(
  points: PerformancePoint[],
  currentPortfolioValue: number,
) {
  // Never fall back to mock data - only chart real history.
  if (points.length === 0 || currentPortfolioValue <= 0) return [];

  const lastValue = points.at(-1)?.value ?? 0;
  const scale = lastValue <= 0 ? 1 : currentPortfolioValue / lastValue;

  return [...points]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((point) => ({
      label: new Date(point.month + "-01").toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      }),
      value: Math.max(0, Math.round(point.value * scale)),
      contributions: Math.max(0, Math.round(point.contributions * scale)),
    }));
}

// ─── Add / Edit Dialog ─────────────────────────────────────────────────────────

function AddHoldingDialog({
  open,
  onClose,
  onSave,
  editHolding,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (h: AssetHolding, val?: AssetValuation) => void;
  editHolding?: AssetHolding | null;
}) {
  const user = useFinancialStore((s) => s.user);
  const { investmentCurrency } = useWealthFormatting();
  const currencySymbol = getCurrencySymbol(investmentCurrency);

  const [draft, setDraft] = React.useState<HoldingDraft>(defaultDraft);
  const [equityCompKind, setEquityCompKind] = React.useState<
    (typeof EQUITY_COMP_KIND_OPTIONS)[number]["value"]
  >("rsu");

  React.useEffect(() => {
    if (!open) return;
    if (editHolding) {
      setDraft({
        name: editHolding.name,
        asset_type: editHolding.asset_type,
        symbol: editHolding.symbol ?? "",
        quantity: editHolding.quantity ? String(editHolding.quantity) : "",
        cost_basis: editHolding.cost_basis
          ? formatNumericInput(String(editHolding.cost_basis))
          : "",
        current_value: editHolding.current_value
          ? formatNumericInput(String(editHolding.current_value))
          : "",
        coupon_rate: editHolding.coupon_rate
          ? String(editHolding.coupon_rate)
          : "",
        maturity_date: editHolding.maturity_date ?? "",
        purchase_date: editHolding.initial_value_date,
        note: "",
      });
    } else {
      setDraft(defaultDraft);
    }
  }, [open, editHolding]);

  // market = stock/etf/crypto always; mutual_fund only when symbol provided
  const isMarket = supportsMarket(draft.asset_type, draft.symbol);
  // show the symbol input for market-always types AND mutual_fund (where it's optional)
  const showSymbolInput =
    ["stock", "etf", "crypto", "commodity"].includes(draft.asset_type) ||
    draft.asset_type === "mutual_fund";
  const isBond = draft.asset_type === "bond";
  const isCash = draft.asset_type === "cash";
  const isMutual = draft.asset_type === "mutual_fund";
  const isEquityComp = draft.asset_type === "equity_compensation";
  // mutual fund manual: no symbol provided
  const isMutualManual = isMutual && !draft.symbol;
  const isManual =
    draft.asset_type === "alternative" || draft.asset_type === "other";
  const showOptionFields =
    isEquityComp &&
    (equityCompKind === "iso" || equityCompKind === "nso");

  function handleSymbolChange(sym: string) {
    const upper = sym.toUpperCase();
    const known = POPULAR_SYMBOLS.find((s) => s.symbol === upper);
    setDraft((d) => ({
      ...d,
      symbol: upper,
      name: known ? known.name : d.name,
      asset_type: known ? known.assetType : d.asset_type,
    }));
  }

  function handleSave() {
    const now = new Date().toISOString();
    const id = editHolding?.holding_id ?? `h-${Date.now()}`;

    const costBasis =
      parseNumericInput(draft.cost_basis) ||
      parseNumericInput(draft.current_value) ||
      0;
    const currentVal = parseNumericInput(draft.current_value) || undefined;
    const couponRate = Number(draft.coupon_rate) || undefined;

    // Derive valuation_method server-side equivalent
    let valuationMethod: ValuationMethod;
    if (["stock", "etf", "crypto", "commodity"].includes(draft.asset_type)) {
      valuationMethod = "market";
    } else if (draft.asset_type === "mutual_fund") {
      valuationMethod = draft.symbol ? "market" : "manual";
    } else if (draft.asset_type === "bond") {
      valuationMethod = "auto_calculated";
    } else if (draft.asset_type === "cash") {
      valuationMethod = couponRate ? "auto_calculated" : "manual";
    } else {
      valuationMethod = "manual";
    }

    const holding: AssetHolding = {
      holding_id: id,
      user_id: "u-1",
      asset_type: draft.asset_type,
      valuation_method: valuationMethod,
      cost_basis: costBasis,
      initial_value_date: draft.purchase_date || now.slice(0, 10),
      symbol: draft.symbol || undefined,
      name: draft.name || draft.symbol || "Unnamed",
      quantity: draft.quantity ? Number(draft.quantity) : undefined,
      // current_value: server computes for auto_calculated; user-supplied for manual
      current_value: valuationMethod === "manual" ? currentVal : undefined,
      coupon_rate: couponRate,
      maturity_date: draft.maturity_date || undefined,
      last_updated: valuationMethod === "manual" ? now : undefined,
      is_active: true,
      created_at: editHolding?.created_at ?? now,
      updated_at: now,
    };

    let valuation: AssetValuation | undefined;
    if (valuationMethod === "manual" && draft.current_value) {
      valuation = {
        valuation_id: `val-${Date.now()}`,
        holding_id: id,
        value: Number(draft.current_value),
        as_of: draft.purchase_date || now.slice(0, 10),
        source: "manual",
        created_at: now,
      };
    }

    onSave(holding, valuation);
    onClose();
  }

  const popularForType = POPULAR_SYMBOLS.filter(
    (s) => s.assetType === draft.asset_type,
  ).slice(0, 6);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FontAwesomeIcon
              icon={faPlus}
              className="h-4 w-4"
              style={{ color: "var(--brand-primary)" }}
            />
            {editHolding ? "Edit holding" : "Add holding"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Asset type picker */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Asset type</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {ASSET_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      asset_type: opt.value,
                      symbol: "",
                    }))
                  }
                  className={`rounded-lg border px-2 py-2 text-xs font-medium transition-[color,background-color,border-color,transform] duration-160 ease-out active:scale-[0.97] flex flex-col items-center gap-1 ${
                    draft.asset_type === opt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted bg-background text-muted-foreground hover:border-foreground/30"
                  }`}
                >
                  <FontAwesomeIcon
                    icon={ASSET_TYPE_ICONS[opt.value]}
                    className="h-3.5 w-3.5"
                  />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Symbol (stock, ETF, crypto always; mutual_fund optional) */}
          {showSymbolInput && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Ticker / Symbol
                {isMutual && (
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    - optional (enables live NAV pricing)
                  </span>
                )}
              </Label>
              <Input
                placeholder={
                  isMutual
                    ? "e.g. VFIAX (leave blank for manual)"
                    : draft.asset_type === "commodity"
                      ? "e.g. GLD, USO, SLV"
                      : "e.g. AAPL, BTC, VOO"
                }
                value={draft.symbol}
                onChange={(e) => handleSymbolChange(e.target.value)}
                className="uppercase font-mono"
              />
              {popularForType.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {popularForType.map((s) => (
                    <button
                      key={s.symbol}
                      type="button"
                      onClick={() => handleSymbolChange(s.symbol)}
                      className="text-xs px-2 py-0.5 rounded-full border border-muted hover:border-primary hover:text-primary transition-colors font-mono"
                    >
                      {s.symbol}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <FontAwesomeIcon
                  icon={faBroadcastTower}
                  className="h-2.5 w-2.5"
                />
                {isMutual
                  ? "With a symbol, NAV is fetched automatically. Without one, you enter the value manually."
                  : draft.asset_type === "commodity"
                    ? "Commodity prices update from the live market, the same way stocks do."
                    : "Stocks, ETFs, commodities, and crypto update from the live market price."}
              </p>
            </div>
          )}

          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Name / Description</Label>
            <Input
              placeholder={
                draft.asset_type === "bond"
                  ? "e.g. US Treasury 10yr"
                  : draft.asset_type === "cash"
                    ? "e.g. High-Yield Savings"
                    : draft.asset_type === "alternative"
                      ? "e.g. Private Equity Fund"
                      : draft.asset_type === "equity_compensation"
                        ? "e.g. Acme Corp RSU grant 2024"
                        : "e.g. Apple Inc."
              }
              value={draft.name}
              onChange={(e) =>
                setDraft((d) => ({ ...d, name: e.target.value }))
              }
            />
          </div>

          {/* ── Stock / ETF / Crypto / Mutual Fund with symbol: quantity + cost_basis ── */}
          {isMarket && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  How many units / shares?
                </Label>
                <Input
                  type="number"
                  placeholder="e.g. 200"
                  value={draft.quantity}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, quantity: e.target.value }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  The number of shares, coins, or units.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  How much did you invest?
                </Label>
                <CurrencyInput
                  currency={investmentCurrency}
                  placeholder="0"
                  value={draft.cost_basis}
                  onChange={(v) =>
                    setDraft((d) => ({
                      ...d,
                      cost_basis: formatNumericInput(v),
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Total you paid - your cost basis.
                </p>
              </div>
            </div>
          )}

          {/* ── Mutual fund without symbol: cost_basis + current value (manual) ── */}
          {isMutualManual && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  How much did you invest?
                </Label>
                <CurrencyInput
                  currency={investmentCurrency}
                  placeholder="0"
                  value={draft.cost_basis}
                  onChange={(v) =>
                    setDraft((d) => ({
                      ...d,
                      cost_basis: formatNumericInput(v),
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  What is it worth today?
                </Label>
                <CurrencyInput
                  currency={investmentCurrency}
                  placeholder="0"
                  value={draft.current_value}
                  onChange={(v) =>
                    setDraft((d) => ({
                      ...d,
                      current_value: formatNumericInput(v),
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Current NAV from your statement.
                </p>
              </div>
            </div>
          )}

          {/* ── Bond: face value (cost_basis) + coupon + maturity ── */}
          {isBond && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Face / par value
                  </Label>
                  <CurrencyInput
                    currency={investmentCurrency}
                    placeholder="100,000"
                    value={draft.cost_basis}
                    onChange={(v) =>
                      setDraft((d) => ({
                        ...d,
                        cost_basis: formatNumericInput(v),
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Principal paid back at maturity. Used as cost basis.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Annual coupon rate (%)
                  </Label>
                  <Input
                    type="number"
                    placeholder="4.5"
                    value={draft.coupon_rate}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, coupon_rate: e.target.value }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Current value auto-calculated server-side.
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Maturity date</Label>
                <DateInput
                  value={draft.maturity_date}
                  onChange={(v) =>
                    setDraft((d) => ({
                      ...d,
                      maturity_date: v,
                    }))
                  }
                  placeholder="Pick maturity date"
                  fromDate={new Date()}
                  fromYear={new Date().getFullYear()}
                  toYear={new Date().getFullYear() + 30}
                />
              </div>
            </div>
          )}

          {/* ── Cash: principal (cost_basis) + optional APY ── */}
          {isCash && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Opening balance / principal
                </Label>
                <CurrencyInput
                  currency={investmentCurrency}
                  placeholder="25,000"
                  value={draft.cost_basis}
                  onChange={(v) =>
                    setDraft((d) => ({
                      ...d,
                      cost_basis: formatNumericInput(v),
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Your starting balance / cost basis.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  APY / interest rate (%)
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    - optional
                  </span>
                </Label>
                <Input
                  type="number"
                  placeholder="4.2"
                  value={draft.coupon_rate}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, coupon_rate: e.target.value }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  With a rate, current value is auto-calculated. Without one,
                  enter it manually below.
                </p>
              </div>
              {!draft.coupon_rate && (
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Current balance (manual)
                  </Label>
                  <CurrencyInput
                    currency={investmentCurrency}
                    placeholder="25,000"
                    value={draft.current_value}
                    onChange={(v) =>
                      setDraft((d) => ({
                        ...d,
                        current_value: formatNumericInput(v),
                      }))
                    }
                  />
                </div>
              )}
            </div>
          )}

          {/* ── Employer equity (RSU, options, ESPP) ── */}
          {isEquityComp && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Compensation type</Label>
                <Select
                  value={equityCompKind}
                  onValueChange={(v) =>
                    setEquityCompKind(
                      v as (typeof EQUITY_COMP_KIND_OPTIONS)[number]["value"],
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {EQUITY_COMP_KIND_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {
                    EQUITY_COMP_KIND_OPTIONS.find(
                      (o) => o.value === equityCompKind,
                    )?.description
                  }
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Employer ticker - optional
                  </Label>
                  <Input
                    placeholder="AAPL"
                    value={draft.symbol}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        symbol: e.target.value.toUpperCase(),
                      }))
                    }
                    className="uppercase font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Vested shares / options - optional
                  </Label>
                  <Input
                    type="number"
                    placeholder={showOptionFields ? "500" : "1200"}
                    value={draft.quantity}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, quantity: e.target.value }))
                    }
                  />
                </div>
              </div>
              {showOptionFields && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Strike price per share
                    </Label>
                    <Input
                      type="number"
                      placeholder="12.50"
                      value={draft.coupon_rate}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          coupon_rate: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Expiration date
                    </Label>
                    <DateInput
                      value={draft.maturity_date}
                      onChange={(v) =>
                        setDraft((d) => ({ ...d, maturity_date: v }))
                      }
                      placeholder="Pick expiration"
                      fromDate={new Date()}
                      fromYear={new Date().getFullYear()}
                      toYear={new Date().getFullYear() + 15}
                    />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Cost / amount paid - optional
                  </Label>
                  <CurrencyInput
                    currency={investmentCurrency}
                    placeholder="0"
                    value={draft.cost_basis}
                    onChange={(v) =>
                      setDraft((d) => ({
                        ...d,
                        cost_basis: formatNumericInput(v),
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Estimated value today
                  </Label>
                  <CurrencyInput
                    currency={investmentCurrency}
                    placeholder="0"
                    value={draft.current_value}
                    onChange={(v) =>
                      setDraft((d) => ({
                        ...d,
                        current_value: formatNumericInput(v),
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    From Carta, Schwab equity awards, E*TRADE, etc.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Alternative / Other: cost_basis + current value ── */}
          {isManual && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  How much did you invest?
                </Label>
                <CurrencyInput
                  currency={investmentCurrency}
                  placeholder="0"
                  value={draft.cost_basis}
                  onChange={(v) =>
                    setDraft((d) => ({
                      ...d,
                      cost_basis: formatNumericInput(v),
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  What is it worth today?
                </Label>
                <CurrencyInput
                  currency={investmentCurrency}
                  placeholder="0"
                  value={draft.current_value}
                  onChange={(v) =>
                    setDraft((d) => ({
                      ...d,
                      current_value: formatNumericInput(v),
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <FontAwesomeIcon
                    icon={faInfoCircle}
                    className="h-2.5 w-2.5"
                  />
                  Update from your latest statement.
                </p>
              </div>
            </div>
          )}

          {/* Purchase date (for non-bond types) */}
          {!isBond && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                {isCash ? "As-of date" : "When did you buy this?"}
              </Label>
              <DateInput
                value={draft.purchase_date}
                onChange={(v) => setDraft((d) => ({ ...d, purchase_date: v }))}
                placeholder="Pick a date"
                toDate={new Date()}
                toYear={new Date().getFullYear()}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!draft.name && !draft.symbol}>
            {editHolding ? "Save changes" : "Add holding"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Chart tooltip ─────────────────────────────────────────────────────────────

function ChartTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
}) {
  const { fmtWealth } = useWealthFormatting();
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2.5 text-xs space-y-1 min-w-40">
      <p className="font-semibold text-foreground">{label}</p>
      {payload.map((p: any) => (
        <div
          key={p.dataKey}
          className="flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: p.color }}
            />
            <span className="text-muted-foreground">{p.name}</span>
          </div>
          <span className="font-medium">{fmtWealth(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Allocation donut ──────────────────────────────────────────────────────────

function AllocationDonut({
  data,
}: {
  data: { label: string; value: number; percentage: number }[];
}) {
  const { fmtWealth } = useWealthFormatting();
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0);

  if (data.length === 0 || total <= 0) {
    return (
      <div className="flex min-h-56 items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 px-6 text-center">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            Allocation will appear here
          </p>
          <p className="text-xs text-muted-foreground">
            Add a priced holding to see your portfolio mix by asset type.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row items-center gap-6 rounded-2xl bg-muted/10 p-3 sm:p-4">
      <div className="relative shrink-0">
        <PieChart width={180} height={180}>
          <Pie
            data={data}
            cx={90}
            cy={90}
            innerRadius={55}
            outerRadius={80}
            dataKey="value"
            paddingAngle={data.length > 1 ? 2 : 0}
            onMouseEnter={(_, i) => setActiveIndex(i)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={ALLOCATION_COLORS[i % ALLOCATION_COLORS.length]}
                opacity={activeIndex === null || activeIndex === i ? 1 : 0.35}
                stroke="none"
              />
            ))}
          </Pie>
        </PieChart>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-sm font-bold">{fmtWealth(total)}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-2 w-full">
        {data.map((slice, i) => (
          <div
            key={slice.label}
            className={`flex items-center gap-3 cursor-default transition-opacity ${
              activeIndex !== null && activeIndex !== i ? "opacity-40" : ""
            }`}
            onMouseEnter={() => setActiveIndex(i)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
              style={{
                backgroundColor:
                  ALLOCATION_COLORS[i % ALLOCATION_COLORS.length],
              }}
            />
            <span className="text-xs text-muted-foreground flex-1">
              {slice.label}
            </span>
            <span className="text-xs font-medium tabular-nums">
              {fmtWealth(slice.value)}
            </span>
            <span className="text-xs text-muted-foreground w-10 text-right">
              {slice.percentage.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Holding row ───────────────────────────────────────────────────────────────

function HoldingRow({
  holding,
  valuations,
  livePrices,
  totalPortfolio,
  onEdit,
  onDelete,
}: {
  holding: AssetHolding;
  valuations: AssetValuation[];
  livePrices: LivePrices;
  totalPortfolio: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { fmtWealth } = useWealthFormatting();
  const [expanded, setExpanded] = React.useState(false);
  const value = getLiveValue(holding, valuations, livePrices);
  const gl = getLiveGainLoss(holding, valuations, livePrices);
  const pct = totalPortfolio > 0 ? (value / totalPortfolio) * 100 : 0;
  const hasLivePrice = livePrices[holding.holding_id] != null;
  const hasHistoricalValuation = valuations.some(
    (valuation) => valuation.holding_id === holding.holding_id,
  );
  const showReturnMetrics =
    hasLivePrice ||
    holding.current_value != null ||
    hasHistoricalValuation ||
    holding.valuation_method !== "market";

  // Stale-data nudge: manual holdings not updated in >30 days
  const daysSinceUpdate = holding.last_updated
    ? Math.floor(
        (Date.now() - new Date(holding.last_updated).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : null;
  const showStaleWarning =
    holding.valuation_method === "manual" &&
    daysSinceUpdate !== null &&
    daysSinceUpdate > 30;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, transform: "translateY(6px)" }}
      animate={{ opacity: 1, transform: "translateY(0px)" }}
      className="border rounded-lg overflow-hidden"
    >
      {/* Main row */}
      <div
        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Icon */}
        <div
          className="p-2 rounded-lg shrink-0"
          style={{ backgroundColor: "color-mix(in srgb, var(--brand-primary) 8%, transparent)" }}
        >
          <FontAwesomeIcon
            icon={ASSET_TYPE_ICONS[holding.asset_type]}
            className="h-3.5 w-3.5"
            style={{ color: "var(--brand-primary)" }}
          />
        </div>

        {/* Name + badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold truncate">{holding.name}</p>
            {holding.symbol && (
              <Badge
                variant="outline"
                className="text-xs font-mono px-1.5 py-0 shrink-0"
              >
                {holding.symbol}
              </Badge>
            )}
            {hasLivePrice && (
              <Badge
                variant="outline"
                className="text-xs gap-1 py-0 shrink-0"
                style={{
                  color: "#10b981",
                  borderColor: "#a7f3d0",
                  backgroundColor: "#f0fdf4",
                }}
              >
                <FontAwesomeIcon icon={faBroadcastTower} className="h-2 w-2" />{" "}
                Live
              </Badge>
            )}
            {holding.valuation_method === "auto_calculated" && (
              <Badge
                variant="outline"
                className="text-xs gap-1 py-0 shrink-0"
                style={{
                  color: "#2563eb",
                  borderColor: "#bfdbfe",
                  backgroundColor: "#eff6ff",
                }}
              >
                Auto-calc
              </Badge>
            )}
            {holding.valuation_method === "manual" && (
              <Badge
                variant="outline"
                className="text-xs gap-1 py-0 shrink-0"
                style={{
                  color: "#d97706",
                  borderColor: "#fde68a",
                  backgroundColor: "#fffbeb",
                }}
              >
                Manual
              </Badge>
            )}
            {showStaleWarning && (
              <Badge
                variant="outline"
                className="text-xs gap-1 py-0 shrink-0"
                style={{
                  color: "#ef4444",
                  borderColor: "#fecaca",
                  backgroundColor: "#fff1f2",
                }}
              >
                <FontAwesomeIcon
                  icon={faTriangleExclamation}
                  className="h-2 w-2"
                />
                Updated {daysSinceUpdate}d ago
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground capitalize">
            {assetTypeLabel(holding.asset_type)}
          </p>
        </div>

        {/* Portfolio % bar */}
        <div className="hidden md:flex flex-col gap-1 w-24 shrink-0">
          <Progress value={pct} className="h-1.5" />
          <p className="text-xs text-muted-foreground text-right">
            {pct.toFixed(1)}%
          </p>
        </div>

        {/* Gain / loss */}
        <div className="hidden sm:flex flex-col items-end shrink-0 w-24">
          {showReturnMetrics ? (
            <>
              <span
                className="text-xs font-medium"
                style={{ color: gl.amount >= 0 ? "#10b981" : "#ef4444" }}
              >
                {gl.amount >= 0 ? "+" : ""}
                {fmtWealth(gl.amount)}
              </span>
              <span
                className="text-xs"
                style={{ color: gl.pct >= 0 ? "#10b981" : "#ef4444" }}
              >
                {gl.pct >= 0 ? "+" : ""}
                {gl.pct.toFixed(2)}%
              </span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">
              Awaiting price
            </span>
          )}
        </div>

        {/* Current value */}
        <div className="text-right shrink-0 w-28">
          <p className="text-sm font-bold tabular-nums">
            {fmtWealth(value)}
          </p>
        </div>

        <FontAwesomeIcon
          icon={expanded ? faChevronUp : faChevronDown}
          className="h-3 w-3 text-muted-foreground shrink-0"
        />
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-3 border-t bg-muted/20 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {holding.quantity != null && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Shares / units
                    </p>
                    <p className="text-sm font-semibold">
                      {holding.quantity.toLocaleString()}
                    </p>
                  </div>
                )}
                {holding.cost_basis > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground">Cost basis</p>
                    <p className="text-sm font-semibold">
                      {fmtWealth(holding.cost_basis)}
                    </p>
                  </div>
                )}
                {holding.current_value != null && !hasLivePrice && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Current value
                    </p>
                    <p className="text-sm font-semibold">
                      {fmtWealth(holding.current_value)}
                    </p>
                  </div>
                )}
                {holding.coupon_rate != null && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Coupon / interest rate
                    </p>
                    <p className="text-sm font-semibold">
                      {holding.coupon_rate}% p.a.
                    </p>
                  </div>
                )}
                {holding.maturity_date && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Maturity date
                    </p>
                    <p className="text-sm font-semibold">
                      {new Date(holding.maturity_date).toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric", year: "numeric" },
                      )}
                    </p>
                  </div>
                )}
                {hasLivePrice && holding.quantity != null && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Live price / unit
                    </p>
                    <p className="text-sm font-semibold">
                      {fmtWealth(livePrices[holding.holding_id]!)}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Held since</p>
                  <p className="text-sm font-semibold">
                    {new Date(holding.initial_value_date).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        year: "numeric",
                      },
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valuation</p>
                  <p className="text-sm font-semibold capitalize">
                    {holding.valuation_method === "auto_calculated"
                      ? "Auto-calculated"
                      : holding.valuation_method}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 justify-end pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                >
                  <FontAwesomeIcon icon={faPencil} className="h-3 w-3" /> Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  <FontAwesomeIcon icon={faTrash} className="h-3 w-3" /> Remove
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────────

function EmptyHoldings({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, transform: "translateY(12px)" }}
      animate={{ opacity: 1, transform: "translateY(0px)" }}
      className="flex flex-col items-center justify-center py-24 text-center space-y-4"
    >
      <div className="p-4 rounded-full bg-muted">
        <FontAwesomeIcon
          icon={faChartPie}
          className="h-8 w-8 text-muted-foreground"
        />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold">Add your first holding</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          Add your investments, savings, or other assets to track your
          portfolio.
        </p>
      </div>
      <Button size="sm" className="gap-1.5" onClick={onAdd}>
        <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
        Add asset
      </Button>
    </motion.div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function AssetsPage() {
  const { loading } = usePageData("assets");
  const storeHoldings = useFinancialStore((s) => s.holdings);
  const [holdings, setHoldings] = React.useState<AssetHolding[]>(() =>
    useFinancialStore.getState().holdings.filter((h) => h.is_active),
  );
  const [valuations, setValuations] = React.useState<AssetValuation[]>([]);

  React.useEffect(() => {
    setHoldings(storeHoldings.filter((h) => h.is_active));
  }, [storeHoldings]);

  const { data: viewHoldings } = useTourDemoData(
    holdings,
    TOUR_DEMO_ASSET_HOLDINGS,
  );

  const storePortfolioPerformance = useFinancialStore(
    (s) => s.portfolioPerformance,
  );
  const storeAccounts = useFinancialStore((s) => s.accounts);
  const storePropertyAssets = useFinancialStore((s) => s.propertyAssets);
  const riskProfile = useFinancialStore((s) => s.user?.risk_profile ?? null);
  const user = useFinancialStore((s) => s.user);
  const {
    fmtWealth,
    fmtNetWorth,
    convertAmount,
    displayCurrency,
    investmentCurrency,
  } = useWealthFormatting();
  const netWorthFx = React.useMemo(() => getNetWorthFx(user), [user]);
  const currencySymbol = getCurrencySymbol(investmentCurrency);
  const [addOpen, setAddOpen] = React.useState(false);
  const [editHolding, setEditHolding] = React.useState<AssetHolding | null>(
    null,
  );
  const [filterType, setFilterType] = React.useState<AssetType | "all">("all");
  const [sortBy, setSortBy] = React.useState<"value" | "gain">("value");

  const {
    prices: livePrices,
    loading: pricesLoading,
    lastUpdated,
    fromCache,
    refresh,
  } = useLivePrices(viewHoldings);

  // ── Derived values ────────────────────────────────────────────────────────

  const totalPortfolioValue = React.useMemo(
    () =>
      viewHoldings.reduce((s, h) => s + getLiveValue(h, valuations, livePrices), 0),
    [viewHoldings, valuations, livePrices],
  );

  const totalCostBasis = React.useMemo(
    () =>
      viewHoldings.reduce(
        (s, h) => s + (Number.isFinite(h.cost_basis) ? h.cost_basis : 0),
        0,
      ),
    [viewHoldings],
  );

  const totalGainLoss = totalPortfolioValue - totalCostBasis;
  const totalGainPct =
    totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;

  // Only use real performance history - never fall back to mock data.
  const performanceSource = storePortfolioPerformance;

  const perfMetrics = React.useMemo(
    () =>
      performanceSource.length > 0
        ? selectPerformanceMetrics(performanceSource)
        : { ytdReturnPct: null, totalContributions: 0, totalGrowth: 0 },
    [performanceSource],
  );

  // Allocation breakdown by asset type - derived from holdings + live prices
  const allocationByType = React.useMemo(() => {
    const map = new Map<string, number>();
    viewHoldings.forEach((h) => {
      const v = getLiveValue(h, valuations, livePrices);
      const label = assetTypeLabel(h.asset_type);
      map.set(label, (map.get(label) ?? 0) + v);
    });
    return [...map.entries()]
      .map(([label, value]) => ({
        label,
        value,
        percentage:
          totalPortfolioValue > 0 ? (value / totalPortfolioValue) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [viewHoldings, valuations, livePrices, totalPortfolioValue]);

  const portfolioInsights = React.useMemo(() => {
    const holdingValues: Record<string, number> = {};
    viewHoldings.forEach((h) => {
      holdingValues[h.holding_id] = getLiveValue(h, valuations, livePrices);
    });
    return derivePortfolioInsights({
      holdings: holdingsToInsightHoldings(viewHoldings, holdingValues),
      properties: propertiesToInsightProperties(storePropertyAssets),
      riskProfile,
      currency: displayCurrency,
    });
  }, [
    viewHoldings,
    valuations,
    livePrices,
    storePropertyAssets,
    riskProfile,
    displayCurrency,
  ]);

  // Performance chart - from store portfolioPerformance
  const perfChartData = React.useMemo(
    () =>
      buildPortfolioPerformanceSeries(
        storePortfolioPerformance,
        totalPortfolioValue,
      ),
    [storePortfolioPerformance, totalPortfolioValue],
  );

  const hasPerformanceHistory = storePortfolioPerformance.length > 0;

  // Filtered + sorted holdings
  const filteredHoldings = React.useMemo(() => {
    let list = viewHoldings;
    if (filterType !== "all")
      list = list.filter((h) => h.asset_type === filterType);
    return [...list].sort((a, b) =>
      sortBy === "value"
        ? getLiveValue(b, valuations, livePrices) -
          getLiveValue(a, valuations, livePrices)
        : getLiveGainLoss(b, valuations, livePrices).pct -
          getLiveGainLoss(a, valuations, livePrices).pct,
    );
  }, [viewHoldings, valuations, livePrices, filterType, sortBy]);

  // Unique asset types present in holdings (for filter buttons)
  const presentTypes = React.useMemo(
    () => [...new Set(viewHoldings.map((h) => h.asset_type))],
    [viewHoldings],
  );

  // Account totals by type - derived from store accounts
  const accountsByType = React.useMemo(() => {
    const map = new Map<string, typeof storeAccounts>();
    storeAccounts.forEach((acc) => {
      const list = map.get(acc.type) ?? [];
      list.push(acc);
      map.set(acc.type, list);
    });
    return [...map.entries()];
  }, [storeAccounts]);

  const totalAccountsValue = React.useMemo(
    () => storeAccounts.reduce((s, a) => s + a.balance, 0),
    [storeAccounts],
  );

  // ── Handlers ──────────────────────────────────────────────────────────────

  function openAddHolding() {
    if (blockRecordCreate("assets")) return;
    setEditHolding(null);
    setAddOpen(true);
  }

  async function handleSaveHolding(h: AssetHolding, val?: AssetValuation) {
    const exists = holdings.find((x) => x.holding_id === h.holding_id);
    if (!exists && blockRecordCreate("assets")) return;
    try {
      if (exists) {
        const updated = await updateAsset(h);
        // Use server-returned holding if available, otherwise keep local
        h = updated ?? h;
      } else {
        const created = await createAsset(h);
        // Adopt server-assigned holding_id if different
        if (created?.holding_id && created.holding_id !== h.holding_id) {
          h = { ...h, holding_id: created.holding_id };
        }
      }
      toast.success(exists ? "Asset updated." : "Asset added.");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to save asset. Please try again.",
      );
      if (!exists) return;
    }
    const updatedHoldings = exists
      ? holdings.map((x) => (x.holding_id === h.holding_id ? h : x))
      : [...holdings, h];
    setHoldings(updatedHoldings);
    useFinancialStore.getState().setHoldings(updatedHoldings);
    if (val) {
      setValuations((prev) => [
        ...prev.filter((v) => v.holding_id !== val.holding_id),
        val,
      ]);
      createAssetValuation({
        holding_id: h.holding_id,
        value: val.value,
        as_of: val.as_of,
        source: val.source ?? "manual",
      })
        .then((r) => console.log("[Assets] createAssetValuation response:", r))
        .catch((err) =>
          console.warn("[Assets] createAssetValuation failed:", err),
        );
    }
    setEditHolding(null);
  }

  function handleDelete(holdingId: string) {
    const updatedHoldings = holdings.filter((h) => h.holding_id !== holdingId);
    setHoldings(updatedHoldings);
    useFinancialStore.getState().setHoldings(updatedHoldings);
    deleteAsset(holdingId)
      .then(() => toast.success("Asset removed."))
      .catch(() => toast.error("Failed to remove asset. Please try again."));
  }

  // ── KPI strip ─────────────────────────────────────────────────────────────

  const netWorth = React.useMemo(
    () =>
      calculateNetWorth(
        holdings,
        valuations,
        storePropertyAssets.filter((p) => p.is_active),
        [],
        [],
        [],
        netWorthFx,
      ),
    [holdings, valuations, storePropertyAssets, netWorthFx],
  );

  const nwMetrics: NetWorthBreakdownMetrics = React.useMemo(() => {
    const shortTermDebt = Math.max(
      0,
      netWorth.totalLiabilities - netWorth.mortgageBalances,
    );
    return {
      totalInvestments: netWorth.investmentAssets,
      totalCash: netWorth.cashAssets,
      totalPropertyValue: netWorth.propertyValues,
      totalOtherAssets: netWorth.totalOtherAssets,
      totalAssets: netWorth.totalAssets,
      totalMortgages: netWorth.mortgageBalances,
      totalShortTermDebt: shortTermDebt,
      totalLiabilities: netWorth.totalLiabilities,
      totalNetWorth: netWorth.netWorth,
      liquidNetWorth: netWorth.cashAssets - shortTermDebt,
    };
  }, [netWorth]);

  const kpiItems = [
    {
      label: "Net Worth",
      value: fmtNetWorth(netWorth.netWorth),
      subline: "Assets minus liabilities",
      tone: netWorth.netWorth >= 0 ? ("good" as const) : ("danger" as const),
    },
    {
      label: "Portfolio Value",
      value: fmtWealth(totalPortfolioValue),
      subline: `${viewHoldings.length} holding${viewHoldings.length !== 1 ? "s" : ""}`,
      tone: "neutral" as const,
    },
    {
      label: "Total Gain / Loss",
      value: `${totalGainLoss >= 0 ? "+" : ""}${fmtWealth(totalGainLoss)}`,
      subline: `${totalGainPct >= 0 ? "+" : ""}${totalGainPct.toFixed(2)}% on cost basis`,
      tone: totalGainLoss >= 0 ? ("good" as const) : ("danger" as const),
    },
    {
      label: "YTD Return",
      value:
        perfMetrics.ytdReturnPct != null
          ? `${perfMetrics.ytdReturnPct >= 0 ? "+" : ""}${perfMetrics.ytdReturnPct.toFixed(2)}%`
          : "-",
      subline: "Year to date",
      tone:
        (perfMetrics.ytdReturnPct ?? 0) >= 0
          ? ("good" as const)
          : ("danger" as const),
    },
    {
      label: "Total Contributed",
      value: fmtWealth(perfMetrics.totalContributions),
      subline: `${fmtWealth(perfMetrics.totalGrowth)} growth`,
      tone: "neutral" as const,
    },
  ];

  // ── Animation variants ────────────────────────────────────────────────────

  const mc = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.07, delayChildren: 0.04 },
    },
  };
  const mi = {
    hidden: { opacity: 0, transform: "translateY(12px)" },
    show: { opacity: 1, transform: "translateY(0px)", transition: { duration: 0.22, ease: [0.23, 1, 0.32, 1] as const } },
  };

  // ── Empty state - no assets added yet ───────────────────────────────────
  if (!loading && viewHoldings.length === 0 && storeAccounts.length === 0) {
    return (
      <TooltipProvider>
        <div className={dashboardTheme.pageContainer}>
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Assets</h1>
              <p className="text-sm text-muted-foreground">
                Your investment portfolio and holdings
              </p>
            </div>
            <Button
              size="sm"
              className="gap-1.5 self-start sm:self-auto"
              data-tour="primary-action"
              onClick={openAddHolding}
            >
              <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
              Add holding
            </Button>
          </div>

          {/* Empty state card */}
          <DashboardEmptyState
            icon={
              <FontAwesomeIcon
                icon={faChartPie}
                className="h-8 w-8 text-muted-foreground"
              />
            }
            title="Build your portfolio"
            description={
              <>
                Assets is where your investments, savings, and other holdings
                live - stocks, ETFs, crypto, cash accounts, anything that builds
                wealth. Add one or two to unlock your portfolio breakdown,
                allocation insights, and returns over time.
              </>
            }
            action={{
              label: "Add your first asset",
              icon: <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />,
              onClick: openAddHolding,
            }}
          />
        </div>

        {/* Still mount the add dialog so clicks above work */}
        <AddHoldingDialog
          open={addOpen}
          onClose={() => {
            setAddOpen(false);
            setEditHolding(null);
          }}
          onSave={handleSaveHolding}
          editHolding={editHolding}
        />
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <motion.div
        initial="hidden"
        animate="show"
        variants={mc}
        className="w-full"
      >
        <div className={dashboardTheme.pageContainer}>
          {/* ── Header ── */}
          <motion.div
            variants={mi}
            className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
          >
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  Assets
                </h1>
                <p className="text-sm text-muted-foreground">
                  Your investment portfolio and holdings
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {lastUpdated && (
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <FontAwesomeIcon
                    icon={faClockRotateLeft}
                    className="h-3 w-3"
                  />
                  {fromCache ? "Cached · " : "Live · "}
                  {lastUpdated.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={refresh}
                disabled={pricesLoading}
              >
                <FontAwesomeIcon
                  icon={faRotate}
                  className={`h-3 w-3 ${pricesLoading ? "animate-spin" : ""}`}
                />
                {pricesLoading ? "Refreshing…" : "Refresh prices"}
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                data-tour="primary-action"
                onClick={openAddHolding}
              >
                <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
                Add holding
              </Button>
            </div>
          </motion.div>

          {/* ── KPI Strip ── */}
          <motion.div variants={mi}>
            <div className="mb-2 sm:mb-3 flex items-center justify-end">
              <CurrencyDisplayToggle />
            </div>
            <KpiStrip cols={5} items={kpiItems} loading={loading} />
          </motion.div>

          {/* ── Allocation + Performance (only when holdings exist) ── */}
          {viewHoldings.length > 0 && (
            <motion.div
              key="charts-section"
              initial="hidden"
              animate="show"
              variants={mi}
              className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(340px,460px)_minmax(0,1fr)]"
            >
              {/* Allocation donut */}
              <div className="xl:max-w-115">
                <SectionLabel>Allocation</SectionLabel>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FontAwesomeIcon
                        icon={faChartPie}
                        className="h-4 w-4 text-primary"
                      />
                      Portfolio breakdown
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      By asset type · live values
                    </p>
                  </CardHeader>
                  <CardContent>
                    <AllocationDonut data={allocationByType} />
                  </CardContent>
                </Card>
              </div>

              {/* Performance chart */}
              <div className="min-w-0">
                <SectionLabel>Performance</SectionLabel>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FontAwesomeIcon
                        icon={faChartLine}
                        className="h-4 w-4 text-primary"
                      />
                      Portfolio value over time
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {perfChartData.length} months of history
                      {!hasPerformanceHistory && perfChartData.length > 0
                        ? " · estimated from current portfolio value"
                        : ""}
                    </p>
                  </CardHeader>
                  <CardContent className="px-2 sm:px-6">
                    {perfChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <AreaChart
                          data={perfChartData}
                          margin={{ left: 8, right: 8, top: 4, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient
                              id="perfGrad"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="var(--brand-primary)"
                                stopOpacity={0.25}
                              />
                              <stop
                                offset="95%"
                                stopColor="var(--brand-primary)"
                                stopOpacity={0.02}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            vertical={false}
                            strokeDasharray="3 3"
                            stroke="currentColor"
                            strokeOpacity={0.1}
                          />
                          <XAxis
                            dataKey="label"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tick={{ fontSize: 10 }}
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tick={{ fontSize: 10 }}
                            tickFormatter={(v) =>
                              formatPortfolioAxisTick(
                                convertAmount(v, investmentCurrency),
                                displayCurrency,
                              )
                            }
                            width={64}
                          />
                          <Tooltip content={<ChartTooltipContent />} />
                          <Area
                            type="monotone"
                            dataKey="value"
                            name="Portfolio value"
                            stroke="var(--brand-primary)"
                            strokeWidth={2}
                            fill="url(#perfGrad)"
                            dot={perfChartData.length === 1}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-50 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/70 bg-muted/20 px-6 text-center">
                        <FontAwesomeIcon icon={faChartLine} className="h-6 w-6 text-muted-foreground" />
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">
                            Performance builds as the portfolio moves
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Add a holding and the value trend draws from that history.
                          </p>
                        </div>
                        <Button size="sm" onClick={openAddHolding}>
                          Add a holding
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

          {/* ── Portfolio insights (data-driven) ── */}
          {portfolioInsights.length > 0 && (
            <motion.div variants={mi}>
              <SectionLabel>Analysis</SectionLabel>
              <CelereyInsights insights={portfolioInsights} />
            </motion.div>
          )}

          {/* ── Net Worth Breakdown + Holdings (side by side) ── */}
          <motion.div
            variants={mi}
            className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]"
          >
            {/* Net Worth Breakdown */}
            <div>
              <SectionLabel>Net Worth</SectionLabel>
              <NetWorthBreakdownCard netWorth={nwMetrics} freshness={[]} />
            </div>

            {/* Holdings list */}
            <div>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
                <SectionLabel>Holdings</SectionLabel>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Type filter pills */}
                  <div className="flex items-center gap-1 text-xs flex-wrap">
                    <button
                      onClick={() => setFilterType("all")}
                      className={`px-2.5 py-1 rounded-full border transition-[color,background-color,border-color,transform] duration-160 ease-out active:scale-[0.97] ${
                        filterType === "all"
                          ? "text-white border-transparent"
                          : "border-muted text-muted-foreground hover:border-foreground/30"
                      }`}
                      style={
                        filterType === "all"
                          ? { backgroundColor: "var(--brand-primary)" }
                          : {}
                      }
                    >
                      All ({viewHoldings.length})
                    </button>
                    {presentTypes.map((t) => (
                      <button
                        key={t}
                        onClick={() => setFilterType(t)}
                        className={`px-2.5 py-1 rounded-full border transition-[color,background-color,border-color,transform] duration-160 ease-out active:scale-[0.97] ${
                          filterType === t
                            ? "text-white border-transparent"
                            : "border-muted text-muted-foreground hover:border-foreground/30"
                        }`}
                        style={
                          filterType === t ? { backgroundColor: "var(--brand-primary)" } : {}
                        }
                      >
                        {assetTypeLabel(t)}
                      </button>
                    ))}
                  </div>

                  {/* Sort */}
                  <Select
                    value={sortBy}
                    onValueChange={(v) => setSortBy(v as "value" | "gain")}
                  >
                    <SelectTrigger className="h-7 text-xs w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="value">Sort: Value</SelectItem>
                      <SelectItem value="gain">Sort: Gain %</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-xl" />
                  ))}
                </div>
              ) : filteredHoldings.length === 0 ? (
                <EmptyHoldings onAdd={openAddHolding} />
              ) : (
                <div className="space-y-2">
                  {/* Column header */}
                  <div
                    className="hidden md:grid gap-3 px-4 py-2 text-xs text-muted-foreground font-medium"
                    style={{
                      gridTemplateColumns: "1fr 120px 96px 96px 112px 16px",
                    }}
                  >
                    <span>Asset</span>
                    <span className="text-right">Portfolio %</span>
                    <span className="text-right">Gain / Loss</span>
                    <span className="text-right">Return</span>
                    <span className="text-right">Value</span>
                    <span />
                  </div>
                  {filteredHoldings.map((h) => (
                    <HoldingRow
                      key={h.holding_id}
                      holding={h}
                      valuations={valuations}
                      livePrices={livePrices}
                      totalPortfolio={totalPortfolioValue}
                      onEdit={() => {
                        setEditHolding(h);
                        setAddOpen(true);
                      }}
                      onDelete={() => handleDelete(h.holding_id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* ── Accounts ── */}
          {/* <motion.div variants={mi}>
            <div className="flex items-center justify-between mb-3">
              <SectionLabel>Accounts</SectionLabel>
              <span className="text-xs text-muted-foreground">
                Total: {formatCurrency(totalAccountsValue)}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {storeAccounts.map((acc, i) => (
                <motion.div
                  key={acc.id}
                  initial={{ opacity: 0, transform: "translateY(8px)" }}
                  animate={{ opacity: 1, transform: "translateY(0px)" }}
                  transition={{ delay: 0.04 * i }}
                >
                  <Card className="">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="p-2 rounded-lg shrink-0"
                            style={{ backgroundColor: "color-mix(in srgb, var(--brand-primary) 8%, transparent)" }}
                          >
                            <FontAwesomeIcon
                              icon={faWallet}
                              className="h-3.5 w-3.5"
                              style={{ color: "var(--brand-primary)" }}
                            />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{acc.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {acc.institution}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold tabular-nums">
                            {formatCurrency(acc.balance, acc.currency)}
                          </p>
                          <Badge
                            variant="outline"
                            className="text-xs capitalize py-0"
                          >
                            {acc.type.replace("_", " ")}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div> */}

          {/* ── Manual valuation notice ── */}
          {holdings.some((h) => h.valuation_method === "manual") && (
            <motion.div variants={mi}>
              <Card
                className="border-dashed"
                style={{ borderColor: "#fde68a", backgroundColor: "#fffbeb55" }}
              >
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <FontAwesomeIcon
                      icon={faTriangleExclamation}
                      className="h-4 w-4 mt-0.5 shrink-0"
                      style={{ color: "#d97706" }}
                    />
                    <div>
                      <p
                        className="text-xs font-semibold"
                        style={{ color: "#d97706" }}
                      >
                        Manual holdings need periodic updates
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Holdings marked{" "}
                        <span className="font-medium">Manual</span> (private
                        equity, no-symbol mutual funds, static cash) show the
                        last value you entered. Bonds and interest-bearing
                        savings are{" "}
                        <span className="font-medium">Auto-calculated</span>{" "}
                        server-side and don&apos;t need manual updates. Update
                        manual holdings when you receive your latest statement.
                        A red badge appears when a value is more than 30 days
                        old.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* ── Add / Edit Dialog ── */}
        <AddHoldingDialog
          open={addOpen}
          onClose={() => {
            setAddOpen(false);
            setEditHolding(null);
          }}
          onSave={handleSaveHolding}
          editHolding={editHolding}
        />
      </motion.div>
    </TooltipProvider>
  );
}
