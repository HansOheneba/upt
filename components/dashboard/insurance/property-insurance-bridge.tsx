"use client";

import Link from "next/link";
import { ArrowUpRight, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  type Property,
  totalInsurancePremium,
  totalInsuranceCoverage,
  isInsuranceExpiringSoon,
  isInsuranceExpired,
  propertyInsuranceTypeLabel,
  formatCurrency,
} from "@/lib/client-data";

function sum(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0);
}

export function PropertyInsuranceBridge({
  properties,
}: {
  properties: Property[];
}) {
  const allPolicies = properties.flatMap((p) =>
    p.insurance.map((ins) => ({
      ...ins,
      propertyName: p.name,
      propertyId: p.property_id,
    })),
  );

  const totalPremiums = sum(properties.map((p) => totalInsurancePremium(p)));
  const totalCoverage = sum(properties.map((p) => totalInsuranceCoverage(p)));
  const expired = allPolicies.filter((p) => isInsuranceExpired(p));
  const expiringSoon = allPolicies.filter(
    (p) => isInsuranceExpiringSoon(p) && !isInsuranceExpired(p),
  );
  const uninsured = properties.filter((p) => p.insurance.length === 0);
  const hasAlerts =
    expired.length > 0 || expiringSoon.length > 0 || uninsured.length > 0;

  if (properties.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Property Insurance</CardTitle>
          </div>
          <Button variant="ghost" size="sm" className="text-xs gap-1" asChild>
            <Link href="/dashboard/properties">
              View properties <ArrowUpRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Insurance attached to your real estate holdings. Managed in the{" "}
          <Link
            href="/dashboard/properties"
            className="underline underline-offset-2 hover:text-foreground transition-colors"
          >
            Properties tab
          </Link>
          .
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-0.5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Policies
            </p>
            <p className="text-lg font-bold tabular-nums">
              {allPolicies.length}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Across {properties.length}{" "}
              {properties.length === 1 ? "property" : "properties"}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Total Coverage
            </p>
            <p className="text-lg font-bold tabular-nums">
              {formatCurrency(totalCoverage)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Combined insured value
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Annual Premium
            </p>
            <p className="text-lg font-bold tabular-nums">
              {formatCurrency(totalPremiums)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {formatCurrency(Math.round(totalPremiums / 12))}/mo
            </p>
          </div>
        </div>

        <Separator />

        {/* Alerts */}
        {hasAlerts && (
          <div className="space-y-2">
            {uninsured.map((prop) => (
              <div
                key={prop.property_id}
                className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  <span className="font-medium">{prop.name}</span> has no
                  insurance.{" "}
                  <Link
                    href="/dashboard/properties"
                    className="underline underline-offset-2"
                  >
                    Go to Properties
                  </Link>
                </p>
              </div>
            ))}
            {expired.map((pol, i) => (
              <div
                key={`exp-${i}`}
                className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-3"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                <p className="text-xs text-red-700 dark:text-red-300">
                  <span className="font-medium">{pol.propertyName}</span> -{" "}
                  {propertyInsuranceTypeLabel(pol.insurance_type)} expired{" "}
                  {new Date(pol.expiry_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                  .{" "}
                  <Link
                    href="/dashboard/properties"
                    className="underline underline-offset-2"
                  >
                    Renew in Properties
                  </Link>
                </p>
              </div>
            ))}
            {expiringSoon.map((pol, i) => (
              <div
                key={`soon-${i}`}
                className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  <span className="font-medium">{pol.propertyName}</span> -{" "}
                  {propertyInsuranceTypeLabel(pol.insurance_type)} expires{" "}
                  {new Date(pol.expiry_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                  .{" "}
                  <Link
                    href="/dashboard/properties"
                    className="underline underline-offset-2"
                  >
                    Review in Properties
                  </Link>
                </p>
              </div>
            ))}
          </div>
        )}

        {!hasAlerts && allPolicies.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 p-3">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              All properties are insured with current policies.
            </p>
          </div>
        )}

        {/* Per-property breakdown */}
        {allPolicies.length > 0 && (
          <div className="space-y-2.5">
            {properties
              .filter((p) => p.insurance.length > 0)
              .map((prop) => {
                const propExpired = prop.insurance.some(isInsuranceExpired);
                const propSoon = prop.insurance.some(
                  (i) => isInsuranceExpiringSoon(i) && !isInsuranceExpired(i),
                );
                return (
                  <Link
                    key={prop.property_id}
                    href="/dashboard/properties"
                    className="flex items-center justify-between gap-4 hover:bg-muted/40 rounded-md px-1 -mx-1 transition-colors"
                  >
                    <div className="min-w-0 py-1">
                      <p className="text-xs font-medium truncate">
                        {prop.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {prop.insurance
                          .map((i) =>
                            propertyInsuranceTypeLabel(i.insurance_type),
                          )
                          .join(", ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {propExpired && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 text-red-600 border-red-200 bg-red-50"
                        >
                          Expired
                        </Badge>
                      )}
                      {propSoon && !propExpired && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 text-amber-600 border-amber-200 bg-amber-50"
                        >
                          Expiring
                        </Badge>
                      )}
                      <span className="text-xs font-medium tabular-nums">
                        {formatCurrency(totalInsurancePremium(prop))}/yr
                      </span>
                    </div>
                  </Link>
                );
              })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
