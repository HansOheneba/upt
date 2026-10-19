"use client";

import * as React from "react";
import { Shield, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  DashCard,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/dash-card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type {
  InsuranceSummaryMetrics,
  InsuranceCategory,
  SectionFreshness,
} from "@/lib/client-data";
import { DataFreshnessBadge } from "./DataFreshnessBadge";

interface ProtectionSectionProps {
  insurance: InsuranceSummaryMetrics;
  freshness: SectionFreshness[];
}

const TYPE_LABEL: Record<InsuranceCategory, string> = {
  home: "Home",
  health: "Health",
  life: "Life",
  disability: "Disability",
  auto: "Auto",
  umbrella: "Umbrella",
  liability: "Liability",
  travel: "Travel",
  pet: "Pet",
  other: "Other",
};

function fmtCoverage(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

function fmtUSD(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatRenewal(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ProtectionSection({
  insurance,
  freshness,
}: ProtectionSectionProps) {
  const reviewDueCount = insurance.expiredCount + insurance.expiringSoonCount;
  const monthlyTotal = insurance.totalMonthlyPremium;

  return (
    <DashCard>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Protection</CardTitle>
          </div>
          <DataFreshnessBadge freshness={freshness} section="insurance" />
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="secondary" className="text-xs">
            {insurance.totalPolicies} Policies
          </Badge>
          {reviewDueCount > 0 && (
            <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {reviewDueCount} Review Due
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total Monthly Premiums</span>
          <span className="font-semibold">{fmtUSD(monthlyTotal)}</span>
        </div>

        <Separator />

        <div className="space-y-3">
          {insurance.renewals.map((policy) => (
            <div
              key={policy.policy_id}
              className="rounded-lg border p-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{policy.name}</p>
                    <Badge variant="secondary" className="text-xs">
                      {TYPE_LABEL[policy.category]}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Coverage: {fmtCoverage(policy.coverageAmount)}
                  </p>
                </div>
                {policy.renewalStatus !== "ok" ? (
                  <Badge className="bg-amber-100 text-amber-700 border-0 text-xs shrink-0">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Review Due
                  </Badge>
                ) : (
                  <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs shrink-0">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Current
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <span>Premium: {fmtUSD(policy.premiumMonthly)}/mo</span>
                <span className="text-right">
                  Renews: {formatRenewal(policy.renewalDate)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </DashCard>
  );
}
