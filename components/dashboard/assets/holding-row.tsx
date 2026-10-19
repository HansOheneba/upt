"use client";

import Link from "next/link";
import { DashCard, CardContent } from "@/components/dashboard/dash-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import {
  type AssetHolding,
  type AssetValuation,
  currentValue,
  gainLoss,
  assetTypeLabel,
  formatCurrency,
} from "@/lib/client-data";
import { useFinancialStore } from "@/store/financialStore";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function HoldingRow({
  holding,
  valuations,
}: {
  holding: AssetHolding;
  valuations: AssetValuation[];
}) {
  const current = currentValue(holding, valuations);
  const userCurrency = useFinancialStore((s) => s.user?.currency ?? "USD");
  const gl = gainLoss(holding, valuations);
  const isPositive = gl.amount >= 0;

  return (
    <DashCard>
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Left: name + type */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold">{holding.name}</span>
              {holding.symbol && (
                <Badge variant="secondary" className="text-xs font-normal">
                  {holding.symbol}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                asChild
              >
                <Link href={`/dashboard/assets/${holding.holding_id}/edit`}>
                  <Pencil className="h-3.5 w-3.5" />
                  <span className="sr-only">Edit {holding.name}</span>
                </Link>
              </Button>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{assetTypeLabel(holding.asset_type)}</span>
              <span className="text-muted-foreground/40">·</span>
              <span className="capitalize">{holding.valuation_method}</span>
            </div>
          </div>

          {/* Right: stats */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5 md:gap-6">
            <div>
              <div className="text-xs text-muted-foreground">Current Value</div>
              <div className="text-sm font-semibold tabular-nums">
                {formatCurrency(current, userCurrency)}
              </div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">
                Amount Invested
              </div>
              <div className="text-sm font-semibold tabular-nums">
                {formatCurrency(
                  holding.amount_invested ??
                    holding.initial_value ??
                    holding.cost_basis,
                  userCurrency,
                )}
              </div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Gain / Loss</div>
              <div
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  isPositive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400",
                )}
              >
                {isPositive ? "+" : ""}
                {formatCurrency(gl.amount, userCurrency)}
              </div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Return</div>
              <div
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  isPositive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400",
                )}
              >
                {isPositive ? "+" : ""}
                {gl.pct.toFixed(1)}%
              </div>
            </div>

            {holding.quantity != null && (
              <div>
                <div className="text-xs text-muted-foreground">Qty</div>
                <div className="text-sm font-semibold tabular-nums">
                  {holding.quantity.toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </DashCard>
  );
}
