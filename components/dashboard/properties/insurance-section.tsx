"use client";

import * as React from "react";
import { Plus, Shield, AlertTriangle } from "lucide-react";

import {
  DashCard,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/dash-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { DateInput } from "@/components/ui/date-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type PropertyInsurance,
  type PropertyInsuranceType,
  PROPERTY_INSURANCE_TYPE_OPTIONS,
  formatCurrency,
} from "@/lib/client-data";
import { InsurancePolicyCard } from "@/components/dashboard/properties/insurance-policy-card";

// ── Types ───────────────────────────────────────────────────────
export type InsuranceFormValues = {
  insuranceType: PropertyInsuranceType;
  provider: string;
  policyNumber: string;
  coverageAmount: string;
  annualPremium: string;
  deductible: string;
  expiryDate: string;
};

const emptyInsuranceForm: InsuranceFormValues = {
  insuranceType: "homeowners",
  provider: "",
  policyNumber: "",
  coverageAmount: "",
  annualPremium: "",
  deductible: "",
  expiryDate: "",
};

// ── Helpers ─────────────────────────────────────────────────────
function formatNumberWithCommas(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

function toNumber(value: string): number {
  const n = Number(value.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

// ── Component ───────────────────────────────────────────────────
export function InsuranceSection({
  policies,
  currency = "USD",
  suggestedType = "homeowners",
  onChange,
}: {
  policies: PropertyInsurance[];
  currency?: string;
  /** Rented properties start on landlord cover. */
  suggestedType?: PropertyInsuranceType;
  onChange: (policies: PropertyInsurance[]) => void;
}) {
  const [showForm, setShowForm] = React.useState(false);
  const [form, setForm] =
    React.useState<InsuranceFormValues>(emptyInsuranceForm);

  function update<K extends keyof InsuranceFormValues>(
    key: K,
    value: InsuranceFormValues[K],
  ): void {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleMoneyInput(
    key: "coverageAmount" | "annualPremium" | "deductible",
    value: string,
  ): void {
    update(key, formatNumberWithCommas(value));
  }

  const isValid =
    form.provider.trim().length > 0 &&
    toNumber(form.coverageAmount) > 0 &&
    toNumber(form.annualPremium) > 0 &&
    form.expiryDate.length > 0;

  function handleAdd() {
    if (!isValid) return;

    const newPolicy: PropertyInsurance = {
      insurance_type: form.insuranceType,
      provider: form.provider.trim(),
      policy_number: form.policyNumber.trim(),
      coverage_amount: toNumber(form.coverageAmount),
      annual_premium: toNumber(form.annualPremium),
      deductible: toNumber(form.deductible),
      expiry_date: form.expiryDate,
    };

    onChange([...policies, newPolicy]);
    setForm(emptyInsuranceForm);
    setShowForm(false);
  }

  function handleRemove(index: number) {
    onChange(policies.filter((_, i) => i !== index));
  }

  const totalPremium = policies.reduce((s, p) => s + p.annual_premium, 0);
  const totalCoverage = policies.reduce((s, p) => s + p.coverage_amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Property Insurance</h3>
          {policies.length === 0 && (
            <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3 w-3" />
              No coverage
            </span>
          )}
        </div>
        {!showForm && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => {
              setForm((prev) =>
                prev.provider.trim()
                  ? prev
                  : { ...prev, insuranceType: suggestedType },
              );
              setShowForm(true);
            }}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Policy
          </Button>
        )}
      </div>

      {/* Existing policies */}
      {policies.length > 0 && (
        <div className="space-y-3">
          {policies.map((p, i) => (
            <InsurancePolicyCard
              key={`${p.policy_number}-${i}`}
              policy={p}
              onRemove={() => handleRemove(i)}
            />
          ))}

          {policies.length > 1 && (
            <div className="rounded-xl border bg-muted/20 p-3 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>
                  Total Coverage:{" "}
                  <span className="font-medium text-foreground">
                    {formatCurrency(totalCoverage, currency)}
                  </span>
                </span>
                <span>
                  Total Premium/yr:{" "}
                  <span className="font-medium text-foreground">
                    {formatCurrency(totalPremium, currency)}
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <DashCard>
          <CardHeader className="space-y-1 pb-3">
            <CardTitle className="text-sm">New Insurance Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Type + Provider */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="insurance-type">Insurance type</Label>
                <Select
                  value={form.insuranceType}
                  onValueChange={(v) =>
                    update("insuranceType", v as PropertyInsuranceType)
                  }
                >
                  <SelectTrigger id="insurance-type" className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_INSURANCE_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="insurance-provider">Provider</Label>
                <Input
                  id="insurance-provider"
                  placeholder="e.g. State Farm, Allianz"
                  value={form.provider}
                  onChange={(e) => update("provider", e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Policy # */}
            <div className="space-y-2">
              <Label htmlFor="policy-number">Policy number (optional)</Label>
              <Input
                id="policy-number"
                placeholder="e.g. HO-2024-88412"
                value={form.policyNumber}
                onChange={(e) => update("policyNumber", e.target.value)}
              />
            </div>

            <Separator />

            {/* Financial details */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="coverage-amount">Coverage amount</Label>
                <div className="flex h-9 w-full overflow-hidden rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
                  <span className="flex shrink-0 select-none items-center border-r border-input bg-muted/50 px-2.5 text-xs font-medium text-muted-foreground">
                    {currency}
                  </span>
                  <input
                    id="coverage-amount"
                    type="text"
                    inputMode="numeric"
                    placeholder="850,000"
                    value={form.coverageAmount}
                    onChange={(e) =>
                      handleMoneyInput("coverageAmount", e.target.value)
                    }
                    required
                    className="flex-1 bg-transparent px-3 py-1 text-base outline-none placeholder:text-muted-foreground md:text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="annual-premium">Annual premium</Label>
                <div className="flex h-9 w-full overflow-hidden rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
                  <span className="flex shrink-0 select-none items-center border-r border-input bg-muted/50 px-2.5 text-xs font-medium text-muted-foreground">
                    {currency}
                  </span>
                  <input
                    id="annual-premium"
                    type="text"
                    inputMode="numeric"
                    placeholder="2,400"
                    value={form.annualPremium}
                    onChange={(e) =>
                      handleMoneyInput("annualPremium", e.target.value)
                    }
                    required
                    className="flex-1 bg-transparent px-3 py-1 text-base outline-none placeholder:text-muted-foreground md:text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deductible">Deductible</Label>
                <div className="flex h-9 w-full overflow-hidden rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
                  <span className="flex shrink-0 select-none items-center border-r border-input bg-muted/50 px-2.5 text-xs font-medium text-muted-foreground">
                    {currency}
                  </span>
                  <input
                    id="deductible"
                    type="text"
                    inputMode="numeric"
                    placeholder="2,500"
                    value={form.deductible}
                    onChange={(e) =>
                      handleMoneyInput("deductible", e.target.value)
                    }
                    className="flex-1 bg-transparent px-3 py-1 text-base outline-none placeholder:text-muted-foreground md:text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Expiry date */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="insurance-expiry">Policy expiry date</Label>
                <DateInput
                  id="insurance-expiry"
                  value={form.expiryDate}
                  onChange={(v) => update("expiryDate", v)}
                  placeholder="Pick expiry date"
                  fromDate={new Date()}
                  fromYear={new Date().getFullYear()}
                  toYear={new Date().getFullYear() + 30}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowForm(false);
                  setForm(emptyInsuranceForm);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!isValid}
                onClick={handleAdd}
              >
                Add Policy
              </Button>
            </div>
          </CardContent>
        </DashCard>
      )}
    </div>
  );
}
