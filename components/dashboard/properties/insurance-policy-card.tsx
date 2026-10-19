"use client";

import { Badge } from "@/components/ui/badge";
import { DashCard, CardContent } from "@/components/dashboard/dash-card";
import {
  type PropertyInsurance,
  propertyInsuranceTypeLabel,
  isInsuranceExpiringSoon,
  isInsuranceExpired,
} from "@/lib/client-data";
import { useWealthFormatting } from "@/hooks/useUserCurrency";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function InsurancePolicyCard({
  policy,
  onRemove,
}: {
  policy: PropertyInsurance;
  onRemove?: () => void;
}) {
  const { fmtWealth } = useWealthFormatting();
  const expired = isInsuranceExpired(policy);
  const expiringSoon = isInsuranceExpiringSoon(policy);

  return (
    <DashCard
      className={cn(
        expired && "border-rose-500/30 bg-rose-500/5",
        expiringSoon && !expired && "border-amber-500/30 bg-amber-500/5",
      )}
    >
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          {/* Left: provider + type + policy # */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{policy.provider}</span>
              <Badge
                variant="outline"
                className="text-xs font-normal capitalize"
              >
                {propertyInsuranceTypeLabel(policy.insurance_type)}
              </Badge>
              {expired && (
                <Badge variant="destructive" className="text-xs font-normal">
                  Expired
                </Badge>
              )}
              {expiringSoon && !expired && (
                <Badge className="bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-400 text-xs font-normal border border-amber-500/30">
                  Expiring Soon
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              Policy #{policy.policy_number}
            </div>
          </div>

          {/* Right: stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-5">
            <div>
              <div className="text-xs text-muted-foreground">Coverage</div>
              <div className="text-sm font-semibold tabular-nums">
                {fmtWealth(policy.coverage_amount)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Premium/yr</div>
              <div className="text-sm font-semibold tabular-nums">
                {fmtWealth(policy.annual_premium)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Deductible</div>
              <div className="text-sm font-semibold tabular-nums">
                {fmtWealth(policy.deductible)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Expires</div>
              <div
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  expired && "text-rose-600 dark:text-rose-400",
                  expiringSoon &&
                    !expired &&
                    "text-amber-600 dark:text-amber-400",
                )}
              >
                {formatDate(policy.expiry_date)}
              </div>
            </div>
          </div>
        </div>

        {onRemove && (
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={onRemove}
              className="text-xs text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
            >
              Remove policy
            </button>
          </div>
        )}
      </CardContent>
    </DashCard>
  );
}
