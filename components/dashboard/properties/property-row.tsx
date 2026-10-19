"use client";

import Link from "next/link";
import { Pencil, Shield, AlertTriangle } from "lucide-react";
import { DashCard, CardContent } from "@/components/dashboard/dash-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  type Property,
  propertyEquity,
  propertyLvr,
  propertyTypeLabel,
  formatPropertySpecs,
  totalInsurancePremium,
  isInsuranceExpiringSoon,
  isInsuranceExpired,
} from "@/lib/client-data";
import { useWealthFormatting } from "@/hooks/useUserCurrency";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function PropertyRow({ property }: { property: Property }) {
  const { fmtWealth } = useWealthFormatting();
  const equity = propertyEquity(property);
  const lvr = propertyLvr(property);
  const hasInsurance = property.insurance.length > 0;
  const annualPremium = totalInsurancePremium(property);
  const anyExpired = property.insurance.some(isInsuranceExpired);
  const anyExpiringSoon = property.insurance.some(
    (p) => isInsuranceExpiringSoon(p) && !isInsuranceExpired(p),
  );

  const insuranceStatus = anyExpired
    ? "expired"
    : anyExpiringSoon
      ? "expiring"
      : "ok";

  const hasPurchasePrice =
    property.purchase_price != null && property.purchase_price > 0;
  const hasMarketValue = property.market_value > 0;
  const gainLoss =
    hasPurchasePrice && hasMarketValue
      ? property.market_value - property.purchase_price!
      : null;
  const gainLossPct =
    gainLoss !== null && hasPurchasePrice
      ? (gainLoss / property.purchase_price!) * 100
      : null;
  const specs = formatPropertySpecs(property);

  return (
    <DashCard>
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Left: name + location + type */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold">{property.name}</span>
              {property.is_primary && (
                <Badge variant="secondary" className="text-xs font-normal">
                  Primary
                </Badge>
              )}
              <Badge
                variant="outline"
                className="text-xs font-normal capitalize"
              >
                {propertyTypeLabel(property.property_type)}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                asChild
              >
                <Link
                  href={`/dashboard/properties/${property.property_id}/edit`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span className="sr-only">Edit {property.name}</span>
                </Link>
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              {[property.locality, property.city, property.country]
                .filter(Boolean)
                .join(", ")}
            </div>
            {property.address ? (
              <div className="text-xs text-muted-foreground">
                {property.address}
              </div>
            ) : null}
            {specs ? (
              <div className="text-xs text-muted-foreground">{specs}</div>
            ) : null}
          </div>

          {/* Right: stats */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5 md:gap-6">
            {hasPurchasePrice && (
              <div>
                <div className="text-xs text-muted-foreground">Bought For</div>
                <div className="text-sm font-semibold tabular-nums">
                  {fmtWealth(property.purchase_price!)}
                </div>
              </div>
            )}

            <div>
              <div className="text-xs text-muted-foreground">Market Value</div>
              {property.value_uncertain ? (
                <div className="flex items-center gap-1">
                  <span className="text-sm font-semibold tabular-nums text-muted-foreground">
                    -
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-normal border-amber-400/50 text-amber-600 dark:text-amber-400"
                  >
                    Valuation pending
                  </Badge>
                </div>
              ) : (
                <div className="text-sm font-semibold tabular-nums">
                  {fmtWealth(property.market_value)}
                </div>
              )}
            </div>

            {gainLoss !== null && (
              <div>
                <div className="text-xs text-muted-foreground">Gain / Loss</div>
                <div
                  className={cn(
                    "text-sm font-semibold tabular-nums",
                    gainLoss >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400",
                  )}
                >
                  {gainLoss >= 0 ? "+" : ""}
                  {fmtWealth(gainLoss)}
                  <span className="ml-1 text-xs font-normal opacity-70">
                    ({gainLossPct! >= 0 ? "+" : ""}
                    {gainLossPct!.toFixed(1)}%)
                  </span>
                </div>
              </div>
            )}

            <div>
              <div className="text-xs text-muted-foreground">Mortgage</div>
              <div className="text-sm font-semibold tabular-nums">
                {property.mortgage_balance > 0
                  ? fmtWealth(property.mortgage_balance)
                  : "Paid off"}
              </div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Equity</div>
              <div
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  equity >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400",
                )}
              >
                {fmtWealth(equity)}
              </div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">LVR</div>
              <div
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  lvr > 80
                    ? "text-rose-600 dark:text-rose-400"
                    : lvr > 60
                      ? "text-amber-600 dark:text-amber-400"
                      : "",
                )}
              >
                {lvr}%
              </div>
            </div>

            {/* Insurance - clicking goes to the property edit form */}
            <div>
              <div className="text-xs text-muted-foreground">Insurance</div>
              {hasInsurance ? (
                <Link
                  href={`/dashboard/properties/${property.property_id}/edit?focus=insurance`}
                  className="flex items-center gap-1 group"
                >
                  <Shield
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      insuranceStatus === "expired"
                        ? "text-rose-500"
                        : insuranceStatus === "expiring"
                          ? "text-amber-500"
                          : "text-emerald-500",
                    )}
                  />
                  <span className="text-sm font-semibold tabular-nums group-hover:underline underline-offset-2">
                    {fmtWealth(annualPremium)}/yr
                  </span>
                  {insuranceStatus === "expired" && (
                    <AlertTriangle className="h-3 w-3 text-rose-500 shrink-0" />
                  )}
                  {insuranceStatus === "expiring" && (
                    <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                  )}
                </Link>
              ) : (
                <Link
                  href={`/dashboard/properties/${property.property_id}/edit?focus=insurance`}
                  className="text-xs text-amber-600 dark:text-amber-400 hover:underline underline-offset-2"
                >
                  None - add
                </Link>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </DashCard>
  );
}
