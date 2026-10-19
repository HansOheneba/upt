"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  DashCard,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/dash-card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  propertyEquity,
  getPrimaryProperty,
  getPropertiesWithMortgages,
  getEffectivePropertyMortgage,
  getPropertyCountryConcentration,
  type Property,
} from "@/lib/client-data";
import { useWealthFormatting } from "@/hooks/useUserCurrency";
import { useFinancialStore } from "@/store/financialStore";

export type TabKey = "buy_vs_rent" | "refinancing" | "portfolio_impact";

// ── formatting helpers ────────────────────────────────────────────────────────

const pct = (n: number) => `${n.toFixed(1)}%`;

// Approximate prevailing 30-yr fixed mortgage rate (2026)
const MARKET_RATE_PCT = 5.75;

function AnalysisEmpty({ message }: { message: string }) {
  return (
    <p className="text-xs text-muted-foreground py-2">{message}</p>
  );
}

// ── Buy vs Rent ───────────────────────────────────────────────────────────────

function BuyVsRent({ properties }: { properties: Property[] }) {
  const { fmtWealth } = useWealthFormatting();
  const fmt = fmtWealth;
  const primary = getPrimaryProperty(properties);
  const mortgage = primary ? getEffectivePropertyMortgage(primary) : null;

  if (!primary || !mortgage) {
    return (
      <AnalysisEmpty message="Add a primary property with a mortgage to compare owning vs renting." />
    );
  }

  const monthlyMortgage = mortgage.min_payment_monthly;
  const monthlyInsurance = primary.insurance.reduce(
    (s, i) => s + i.annual_premium / 12,
    0,
  );
  const monthlyTax = (primary.market_value * 0.012) / 12; // 1.2% effective annual rate
  const monthlyMaintenance = (primary.market_value * 0.01) / 12; // 1% rule
  const totalOwn =
    monthlyMortgage + monthlyInsurance + monthlyTax + monthlyMaintenance;
  const estimatedRent = primary.market_value * 0.004; // 0.4%/mo of value
  const monthlyEquityBuild = monthlyMortgage * 0.35; // ~35% of payment builds equity

  const rows = [
    { label: "Mortgage payment", own: monthlyMortgage, rent: null },
    { label: "Insurance", own: monthlyInsurance, rent: null },
    { label: "Property tax (est.)", own: monthlyTax, rent: null },
    { label: "Maintenance (est.)", own: monthlyMaintenance, rent: null },
    { label: "Market rent (est.)", own: null, rent: estimatedRent },
  ];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-x-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide pb-1">
        <span>Item</span>
        <span className="text-right">Own</span>
        <span className="text-right">Rent</span>
      </div>

      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-3 gap-x-2 text-xs">
          <span className="text-muted-foreground">{r.label}</span>
          <span className="text-right font-medium">
            {r.own != null ? fmt(r.own) : "-"}
          </span>
          <span className="text-right font-medium">
            {r.rent != null ? fmt(r.rent) : "-"}
          </span>
        </div>
      ))}

      <Separator />

      <div className="grid grid-cols-3 gap-x-2 text-xs font-semibold">
        <span>Total / mo</span>
        <span className="text-right">{fmt(totalOwn)}</span>
        <span className="text-right">{fmt(estimatedRent)}</span>
      </div>

      <p className="text-[11px] text-muted-foreground pt-1">
        Owning costs {fmt(totalOwn - estimatedRent)}/mo more than renting, but
        builds ~{fmt(monthlyEquityBuild)}/mo in equity on {primary.name}.
      </p>
    </div>
  );
}

// ── Refinancing ───────────────────────────────────────────────────────────────

function RefinancingOptions({ properties }: { properties: Property[] }) {
  const { fmtWealth } = useWealthFormatting();
  const fmt = fmtWealth;
  const mortgagedProperties = getPropertiesWithMortgages(properties);

  if (mortgagedProperties.length === 0) {
    return (
      <AnalysisEmpty message="No property mortgages on file. Add mortgage details to a property to see refinancing options." />
    );
  }

  const belowMarket = mortgagedProperties.filter((p) => {
    const m = getEffectivePropertyMortgage(p);
    return m != null && MARKET_RATE_PCT - m.interest_rate_pct > 0.5;
  });
  const aboveMarket = mortgagedProperties.filter((p) => {
    const m = getEffectivePropertyMortgage(p);
    return m != null && m.interest_rate_pct - MARKET_RATE_PCT > 0.5;
  });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-x-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide pb-1">
        <span>Property</span>
        <span className="text-right">Current</span>
        <span className="text-right">Market</span>
      </div>

      {mortgagedProperties.map((p) => {
        const m = getEffectivePropertyMortgage(p);
        if (!m) return null;
        const beneficial = MARKET_RATE_PCT - m.interest_rate_pct > 0.5;
        const rateEstimated = !p.mortgage;
        return (
          <div key={p.property_id} className="space-y-0.5">
            <div className="grid grid-cols-3 gap-x-2 text-xs">
              <span className="text-muted-foreground truncate">{p.name}</span>
              <span
                className={cn(
                  "text-right font-medium",
                  beneficial ? "text-amber-600" : "text-emerald-600",
                )}
              >
                {pct(m.interest_rate_pct)}
                {rateEstimated ? "*" : ""}
              </span>
              <span className="text-right font-medium">
                {pct(MARKET_RATE_PCT)}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Balance: {fmt(m.balance)} ·{" "}
              {beneficial ? "Consider refinancing" : "Below market - hold"}
            </p>
          </div>
        );
      })}

      <Separator />

      <p className="text-[11px] text-muted-foreground">
        {belowMarket.length === mortgagedProperties.length
            ? `All ${mortgagedProperties.length} mortgages are above the market rate of ${pct(MARKET_RATE_PCT)}. Refinancing might cut payments.`
            : aboveMarket.length === mortgagedProperties.length
              ? `All mortgages are below the market rate of ${pct(MARKET_RATE_PCT)}. Refinancing would probably cost more. Keep current terms.`
              : `${belowMarket.length} of ${mortgagedProperties.length} mortgages might benefit from refinancing at ${pct(MARKET_RATE_PCT)}.`}
        {mortgagedProperties.some((p) => !p.mortgage) &&
          " * Estimated rate where full mortgage details are not on file."}
      </p>
    </div>
  );
}

// ── Portfolio Impact ──────────────────────────────────────────────────────────

function PortfolioImpact({ properties }: { properties: Property[] }) {
  const { fmtWealth } = useWealthFormatting();
  const fmt = fmtWealth;
  const storeLiabilities = useFinancialStore((s) => s.liabilities);
  const storePortfolioPerformance = useFinancialStore(
    (s) => s.portfolioPerformance,
  );
  const storeEmergencyFund = useFinancialStore((s) => s.emergencyFund);
  const storeHoldings = useFinancialStore((s) => s.holdings);
  const active = properties.filter((p) => p.is_active && p.country !== "");
  const totalMarketValue = active.reduce((s, p) => s + p.market_value, 0);
  const totalEquity = active.reduce((s, p) => s + propertyEquity(p), 0);
  const investmentValue =
    storeHoldings
      .filter((h) => h.is_active)
      .reduce((s, h) => s + (h.current_value ?? h.cost_basis ?? 0), 0) ||
    (storePortfolioPerformance.at(-1)?.value ?? 0);
  const cash = storeEmergencyFund.currentCashBalance;
  const otherLiabilities = storeLiabilities
    .filter((l) => l.type !== "mortgage")
    .reduce((s, l) => s + l.balance, 0);
  const totalNetWorth = totalEquity + investmentValue + cash - otherLiabilities;
  const totalGrossAssets = totalMarketValue + investmentValue;
  const brickOfAssetsPct =
    totalGrossAssets > 0 ? (totalMarketValue / totalGrossAssets) * 100 : 0;
  const equityOfNwPct =
    totalNetWorth > 0 ? (totalEquity / totalNetWorth) * 100 : 0;
  const highBrick = brickOfAssetsPct >= 60;
  const highEquityShare = equityOfNwPct > 50;

  if (active.length === 0) {
    return (
      <AnalysisEmpty message="Add active properties to see how real estate fits your overall net worth." />
    );
  }

  const rows = [
    { label: "Active properties", value: String(active.length), warn: false },
    { label: "Total market value", value: fmt(totalMarketValue), warn: false },
    { label: "Total equity", value: fmt(totalEquity), warn: false },
    {
      label: "Investment portfolio",
      value: fmt(investmentValue),
      warn: false,
    },
    { label: "Est. net worth", value: fmt(totalNetWorth), warn: false },
    {
      label: "Property share of assets",
      value: pct(brickOfAssetsPct),
      warn: highBrick,
    },
    {
      label: "Property equity of NW",
      value: pct(equityOfNwPct),
      warn: highEquityShare,
    },
  ];

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label} className="flex justify-between text-xs">
          <span className="text-muted-foreground">{r.label}</span>
          <span className={cn("font-medium", r.warn ? "text-amber-600" : "")}>
            {r.value}
          </span>
        </div>
      ))}

      <Separator />

      <p className="text-[11px] text-muted-foreground">
        {highBrick
          ? `${pct(brickOfAssetsPct)} of total assets is property. Only ${pct(100 - brickOfAssetsPct)} is in investable holdings. Put new savings into markets before buying another place.`
          : highEquityShare
            ? `Property equity is ${pct(equityOfNwPct)} of net worth, above 50%. Worth building investable assets alongside housing.`
            : `Property is ${pct(brickOfAssetsPct)} of assets and ${pct(equityOfNwPct)} of net worth. Mix looks balanced.`}
      </p>

      {(() => {
        const geo = getPropertyCountryConcentration(properties);
        if (!geo || geo.countryCount < 2) return null;
        if (geo.topPct >= 65 || (geo.topPct >= 55 && geo.topCount >= 3)) {
          return (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 mt-2">
              <p className="text-xs font-semibold text-amber-800">
                Concentrated in {geo.topCountryLabel}
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                {Math.round(geo.topPct)}% of property value (
                {fmt(geo.topValue)}) is in one country, across{" "}
                {geo.topCount} properties. One country means one tax system and
                one housing downturn. Buy elsewhere next, or build investable
                assets outside that market.
              </p>
            </div>
          );
        }
        if (geo.topPct >= 45) {
          return (
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5 mt-2">
              <p className="text-xs font-semibold text-blue-800">
                Regional tilt toward {geo.topCountryLabel}
              </p>
              <p className="text-[11px] text-blue-700 mt-0.5">
                {Math.round(geo.topPct)}% of property value is in one country.
                You hold property in {geo.countryCount} countries, but the
                weight is uneven. Check FX, insurance, and estate rules before
                adding more in the same market.
              </p>
            </div>
          );
        }
        return null;
      })()}
    </div>
  );
}

// ── Pill Tabs ─────────────────────────────────────────────────────────────────

function PillTabs({
  value,
  onChange,
}: {
  value: TabKey;
  onChange: (v: TabKey) => void;
}) {
  const items: { key: TabKey; label: string }[] = [
    { key: "buy_vs_rent", label: "Buy vs Rent" },
    { key: "refinancing", label: "Refinancing" },
    { key: "portfolio_impact", label: "Portfolio Impact" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((t) => {
        const active = value === t.key;
        return (
          <Button
            key={t.key}
            type="button"
            size="sm"
            variant={active ? "default" : "secondary"}
            className={cn(
              "rounded-full h-7 px-3 text-xs",
              active ? "" : "bg-muted/60 text-foreground hover:bg-muted",
            )}
            onClick={() => onChange(t.key)}
          >
            {t.label}
          </Button>
        );
      })}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function PropertyAnalysis({ properties }: { properties: Property[] }) {
  const [tab, setTab] = React.useState<TabKey>("buy_vs_rent");
  const geo = React.useMemo(
    () => getPropertyCountryConcentration(properties),
    [properties],
  );
  const showGeoBanner =
    geo &&
    geo.countryCount >= 2 &&
    (geo.topPct >= 65 || (geo.topPct >= 55 && geo.topCount >= 3));

  return (
    <DashCard className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Property Analysis</CardTitle>
        <p className="text-xs text-muted-foreground">
          Quick lenses to evaluate property decisions.
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col space-y-3 pt-2">
        {showGeoBanner && geo && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
            <p className="text-xs font-semibold text-amber-800">
              Most property is in {geo.topCountryLabel}
            </p>
            <p className="text-[11px] text-amber-700 mt-0.5">
              {Math.round(geo.topPct)}% of property value is in{" "}
              {geo.topCountryLabel}. See Portfolio Impact for why that
              concentration matters.
            </p>
          </div>
        )}

        <PillTabs value={tab} onChange={setTab} />

        <Separator />

        <div className="flex flex-1 flex-col min-h-0">
          {tab === "buy_vs_rent" && <BuyVsRent properties={properties} />}
          {tab === "refinancing" && (
            <RefinancingOptions properties={properties} />
          )}
          {tab === "portfolio_impact" && (
            <PortfolioImpact properties={properties} />
          )}
        </div>
      </CardContent>
    </DashCard>
  );
}
