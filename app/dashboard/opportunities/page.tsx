"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Landmark,
  LineChart,
  PieChart,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashCard, CardContent } from "@/components/dashboard/dash-card";
import { DashboardEmptyState } from "@/components/dashboard/empty-state";
import { KpiStrip } from "@/components/dashboard/kpi-strip";
import { dashboardTheme } from "@/lib/dashboard-theme";
import { getRiskBand } from "@/lib/dashboard-api";
import { useFinancialStore } from "@/store/financialStore";
import { isDemoPath } from "@/lib/demo-mode";
import { cn } from "@/lib/utils";

type Risk = "conservative" | "balanced" | "growth" | "aggressive";
type AssetClass =
  | "cash"
  | "fixed_income"
  | "equities"
  | "multi_asset"
  | "alternatives";
type Filter = "all" | "recommended" | AssetClass;

type Product = {
  id: string;
  name: string;
  assetClass: AssetClass;
  summary: string;
  currency: string;
  minimum: string;
  liquidity: string;
  indicative: string;
  risk: Risk;
  recommended: boolean;
};

const ASSET_CLASS_LABEL: Record<AssetClass, string> = {
  cash: "Cash",
  fixed_income: "Fixed income",
  equities: "Equities",
  multi_asset: "Multi-asset",
  alternatives: "Alternatives",
};

const RISK_LABEL: Record<Risk, string> = {
  conservative: "Conservative",
  balanced: "Balanced",
  growth: "Growth",
  aggressive: "Aggressive",
};

const PROFILE_RANK: Record<string, number> = {
  "capital preservation": 0,
  conservative: 1,
  balanced: 2,
  moderate: 2,
  growth: 3,
  aggressive: 4,
};

const PROFILE_LABEL: Record<string, string> = {
  "capital preservation": "Capital Preservation",
  conservative: "Conservative",
  balanced: "Balanced",
  moderate: "Moderate Growth",
  growth: "Growth",
  aggressive: "Aggressive",
};

const CLASS_ICON: Record<AssetClass, LucideIcon> = {
  cash: Wallet,
  fixed_income: Landmark,
  equities: LineChart,
  multi_asset: PieChart,
  alternatives: Building2,
};

const PRODUCTS: Product[] = [
  {
    id: "tbill-91",
    name: "Treasury bill, 91-day",
    assetClass: "cash",
    summary: "Short-dated government paper, held to maturity.",
    currency: "Local",
    minimum: "1,000",
    liquidity: "91 days",
    indicative: "Auction yield",
    risk: "conservative",
    recommended: true,
  },
  {
    id: "tbill-364",
    name: "Treasury bill, 364-day",
    assetClass: "cash",
    summary: "One-year government bill for cash you can set aside.",
    currency: "Local",
    minimum: "1,000",
    liquidity: "1 year",
    indicative: "Auction yield",
    risk: "conservative",
    recommended: false,
  },
  {
    id: "usd-call",
    name: "USD call deposit",
    assetClass: "cash",
    summary: "Dollar cash you can call without locking a long tenor.",
    currency: "USD",
    minimum: "10,000",
    liquidity: "Call",
    indicative: "Bank rate",
    risk: "conservative",
    recommended: true,
  },
  {
    id: "fd-6m",
    name: "Fixed deposit, 6-month",
    assetClass: "cash",
    summary: "A locked local deposit with a known rate for the term.",
    currency: "Local",
    minimum: "5,000",
    liquidity: "6 months",
    indicative: "Bank rate",
    risk: "conservative",
    recommended: false,
  },
  {
    id: "mmf",
    name: "Money market fund",
    assetClass: "cash",
    summary: "A pooled short-term fund. Value can move by a small amount.",
    currency: "Local",
    minimum: "500",
    liquidity: "T+1 to T+3",
    indicative: "Fund yield",
    risk: "conservative",
    recommended: true,
  },
  {
    id: "gov-bond",
    name: "Government bond",
    assetClass: "fixed_income",
    summary:
      "Longer local government debt. The price moves if you sell before maturity.",
    currency: "Local",
    minimum: "10,000",
    liquidity: "Secondary market",
    indicative: "Coupon and price",
    risk: "balanced",
    recommended: true,
  },
  {
    id: "usd-sovereign",
    name: "USD sovereign note",
    assetClass: "fixed_income",
    summary: "Hard-currency government debt for clients who want dollar income.",
    currency: "USD",
    minimum: "50,000",
    liquidity: "Secondary market",
    indicative: "Yield to maturity",
    risk: "balanced",
    recommended: true,
  },
  {
    id: "balanced",
    name: "Balanced fund",
    assetClass: "multi_asset",
    summary: "A mix of bonds and shares aimed at a moderate profile.",
    currency: "Local",
    minimum: "1,000",
    liquidity: "Fund dealing days",
    indicative: "Income and growth",
    risk: "balanced",
    recommended: true,
  },
  {
    id: "local-equity",
    name: "Local equity fund",
    assetClass: "equities",
    summary: "Listed local shares in one fund. Value can fall.",
    currency: "Local",
    minimum: "1,000",
    liquidity: "Fund dealing days",
    indicative: "Market return",
    risk: "growth",
    recommended: false,
  },
  {
    id: "global-equity",
    name: "Global equity fund",
    assetClass: "equities",
    summary:
      "Developed-market shares. Currency and the market both move the value.",
    currency: "USD",
    minimum: "5,000",
    liquidity: "Fund dealing days",
    indicative: "Market return",
    risk: "aggressive",
    recommended: false,
  },
  {
    id: "property-note",
    name: "Real estate income note",
    assetClass: "alternatives",
    summary: "Income from property. Capital is tied up for the term.",
    currency: "USD",
    minimum: "25,000",
    liquidity: "Locked term",
    indicative: "Target distribution",
    risk: "balanced",
    recommended: false,
  },
];

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "recommended", label: "Recommended" },
  { id: "cash", label: "Cash" },
  { id: "fixed_income", label: "Fixed income" },
  { id: "equities", label: "Equities" },
  { id: "multi_asset", label: "Multi-asset" },
  { id: "alternatives", label: "Alternatives" },
];

function profileKey(profile: string | null | undefined): string | null {
  if (!profile) return null;
  const key = profile.trim().toLowerCase();
  return PROFILE_RANK[key] == null ? null : key;
}

function fitsProfile(
  user: string | null | undefined,
  product: Risk,
): boolean | null {
  const key = profileKey(user);
  if (!key) return null;
  return PROFILE_RANK[product] <= PROFILE_RANK[key];
}

export default function InvestmentOpportunitiesPage() {
  const pathname = usePathname();
  const messagesHref = isDemoPath(pathname)
    ? "/dashboard/demo/messages"
    : "/dashboard/messages";
  const riskProfile = useFinancialStore((s) => {
    return getRiskBand(s.riskAssessment) ?? s.user?.risk_profile ?? null;
  });
  const [filter, setFilter] = React.useState<Filter>("all");

  const visible = PRODUCTS.filter((product) => {
    if (filter === "all") return true;
    if (filter === "recommended") return product.recommended;
    return product.assetClass === filter;
  });

  const recommendedCount = PRODUCTS.filter((product) => product.recommended).length;
  const knownProfile = profileKey(riskProfile);
  const fitCount = knownProfile
    ? PRODUCTS.filter((product) => fitsProfile(riskProfile, product.risk)).length
    : null;

  return (
    <div className={dashboardTheme.pageContainer}>
      <div className="space-y-1.5">
        <h1 className={dashboardTheme.pageTitle}>Investment opportunities</h1>
        <p className={dashboardTheme.pageDescription}>
          Products your relationship manager can recommend. Figures are
          indicative. Your RM confirms suitability before you invest.
        </p>
      </div>

      <KpiStrip
        cols={3}
        items={[
          {
            label: "Recommended",
            value: String(recommendedCount),
            subline: "Flagged by your RM",
          },
          {
            label: "Fit your profile",
            value: fitCount == null ? "-" : String(fitCount),
            subline: knownProfile
              ? PROFILE_LABEL[knownProfile]
              : "Take the risk quiz to compare",
          },
          {
            label: "On the shelf",
            value: String(PRODUCTS.length),
            subline: "Across cash, markets, and alternatives",
          },
        ]}
      />

      <div
        role="radiogroup"
        aria-label="Filter products"
        className="flex flex-wrap gap-1 rounded-lg bg-muted/70 p-1 w-fit"
      >
        {FILTERS.map((item) => {
          const selected = filter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setFilter(item.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected
                  ? "bg-card text-foreground ring-1 ring-foreground/10"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {visible.length === 0 ? (
          <DashboardEmptyState
            icon={<PieChart />}
            title="No products in this group"
            description="Switch the filter to see the full shelf, or stay on recommended to match your risk profile."
            action={
              filter === "all"
                ? undefined
                : {
                    label: "Show all products",
                    onClick: () => setFilter("all"),
                  }
            }
          />
        ) : (
          visible.map((product) => {
            const Icon = CLASS_ICON[product.assetClass];
            const fit = fitsProfile(riskProfile, product.risk);
            return (
              <DashCard key={product.id} className="py-0">
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-foreground/70">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-medium">{product.name}</h2>
                        {product.recommended ? (
                          <Badge variant="secondary">Recommended</Badge>
                        ) : null}
                        <Badge variant="outline">
                          {ASSET_CLASS_LABEL[product.assetClass]}
                        </Badge>
                        {fit === true ? (
                          <Badge
                            variant="outline"
                            className="border-emerald-200 bg-emerald-50 text-emerald-700"
                          >
                            Fits your profile
                          </Badge>
                        ) : null}
                        {fit === false ? (
                          <Badge
                            variant="outline"
                            className="border-amber-200 bg-amber-50 text-amber-700"
                          >
                            Above your risk profile
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {product.summary}
                      </p>
                      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <div>
                          <dt className="inline">Currency </dt>
                          <dd className="inline font-medium text-foreground">
                            {product.currency}
                          </dd>
                        </div>
                        <div>
                          <dt className="inline">Minimum </dt>
                          <dd className="inline font-medium text-foreground tabular-nums">
                            {product.minimum}
                          </dd>
                        </div>
                        <div>
                          <dt className="inline">Liquidity </dt>
                          <dd className="inline font-medium text-foreground">
                            {product.liquidity}
                          </dd>
                        </div>
                        <div>
                          <dt className="inline">Return </dt>
                          <dd className="inline font-medium text-foreground">
                            {product.indicative}
                          </dd>
                        </div>
                        <div>
                          <dt className="inline">Risk </dt>
                          <dd className="inline font-medium text-foreground">
                            {RISK_LABEL[product.risk]}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline" className="shrink-0">
                    <Link
                      href={`${messagesHref}?product=${encodeURIComponent(product.name)}`}
                    >
                      Discuss with your RM
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </CardContent>
              </DashCard>
            );
          })
        )}
      </div>
    </div>
  );
}
