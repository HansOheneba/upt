"use client";

import * as React from "react";
import { Building2, X } from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import { type PropertyMortgage } from "@/lib/client-data";
import { formatCurrency } from "@/lib/client-data";
import { DateInput } from "@/components/ui/date-input";

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

// ── Form state ───────────────────────────────────────────────────
export type MortgageFormValues = {
  lender: string;
  balance: string;
  interestRatePct: string;
  minPaymentMonthly: string;
  dueDay: string;
  originalLoanAmount: string;
  expectedPayoffDate: string;
  termYears: string;
  startDate: string;
};

const emptyMortgageForm: MortgageFormValues = {
  lender: "",
  balance: "",
  interestRatePct: "",
  minPaymentMonthly: "",
  dueDay: "",
  originalLoanAmount: "",
  expectedPayoffDate: "",
  termYears: "",
  startDate: "",
};

function mortgageToForm(m: PropertyMortgage): MortgageFormValues {
  return {
    lender: m.lender,
    balance: formatNumberWithCommas(String(m.balance)),
    interestRatePct: String(m.interest_rate_pct),
    minPaymentMonthly: formatNumberWithCommas(String(m.min_payment_monthly)),
    dueDay: m.due_day !== undefined ? String(m.due_day) : "",
    originalLoanAmount: m.original_loan_amount
      ? formatNumberWithCommas(String(m.original_loan_amount))
      : "",
    expectedPayoffDate: m.expected_payoff_date ?? "",
    termYears: m.term_years ? String(m.term_years) : "",
    startDate: m.start_date ?? "",
  };
}

// ── Component ───────────────────────────────────────────────────
export function MortgageSection({
  mortgage,
  currency = "USD",
  onChange,
}: {
  mortgage: PropertyMortgage | null;
  currency?: string;
  onChange: (mortgage: PropertyMortgage | null) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [showForm, setShowForm] = React.useState(false);
  const [form, setForm] = React.useState<MortgageFormValues>(
    mortgage ? mortgageToForm(mortgage) : emptyMortgageForm,
  );

  // Keep form in sync with external mortgage changes (e.g. navigating back to edit)
  React.useEffect(() => {
    if (mortgage) {
      setForm(mortgageToForm(mortgage));
    }
  }, []);

  function update<K extends keyof MortgageFormValues>(
    key: K,
    value: MortgageFormValues[K],
  ): void {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleMoneyInput(
    key: "balance" | "minPaymentMonthly" | "originalLoanAmount",
    value: string,
  ): void {
    update(key, formatNumberWithCommas(value));
  }

  const isValid = form.lender.trim().length > 0 && toNumber(form.balance) > 0;

  function handleSave() {
    if (!isValid) return;
    const m: PropertyMortgage = {
      lender: form.lender.trim(),
      balance: toNumber(form.balance),
      interest_rate_pct: Number(form.interestRatePct) || 0,
      min_payment_monthly: toNumber(form.minPaymentMonthly),
      due_day: form.dueDay ? Number(form.dueDay) : undefined,
      original_loan_amount: toNumber(form.originalLoanAmount) || undefined,
      expected_payoff_date: form.expectedPayoffDate || undefined,
      term_years: Number(form.termYears) > 0 ? Number(form.termYears) : undefined,
      start_date: form.startDate || undefined,
      type: "repayment",
    };
    onChange(m);
    setEditing(false);
    setShowForm(false);
  }

  function handleRemove() {
    onChange(null);
    setForm(emptyMortgageForm);
    setEditing(false);
  }

  // ── Render: existing mortgage card ──────────────────────────
  if (mortgage && !editing) {
    const annualInterest =
      (mortgage.balance * mortgage.interest_rate_pct) / 100;
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Mortgage</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full text-xs"
              onClick={() => setEditing(true)}
            >
              Edit
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-red-500"
              onClick={handleRemove}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <DashCard>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-sm font-semibold">{mortgage.lender}</p>
                {mortgage.interest_rate_pct > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {mortgage.interest_rate_pct.toFixed(2)}% interest rate
                  </p>
                )}
              </div>
              <Badge variant="secondary" className="text-xs">
                Mortgage
              </Badge>
            </div>
            <Separator />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground">Outstanding balance</p>
                <p className="font-semibold tabular-nums text-red-500">
                  {formatCurrency(mortgage.balance, currency)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Min payment</p>
                <p className="font-semibold tabular-nums">
                  {formatCurrency(mortgage.min_payment_monthly, currency)}/mo
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Annual interest</p>
                <p className="font-semibold tabular-nums text-amber-600">
                  {formatCurrency(annualInterest, currency)}
                </p>
              </div>
              {mortgage.due_day && (
                <div>
                  <p className="text-muted-foreground">Due day</p>
                  <p className="font-semibold">
                    {mortgage.due_day}
                    {mortgage.due_day === 1
                      ? "st"
                      : mortgage.due_day === 2
                        ? "nd"
                        : mortgage.due_day === 3
                          ? "rd"
                          : "th"}{" "}
                    of month
                  </p>
                </div>
              )}
              {mortgage.original_loan_amount && (
                <div>
                  <p className="text-muted-foreground">Original loan</p>
                  <p className="font-semibold tabular-nums">
                    {formatCurrency(mortgage.original_loan_amount, currency)}
                  </p>
                </div>
              )}
              {mortgage.expected_payoff_date && (
                <div>
                  <p className="text-muted-foreground">Expected payoff</p>
                  <p className="font-semibold">
                    {new Date(mortgage.expected_payoff_date).toLocaleDateString(
                      undefined,
                      { year: "numeric", month: "short" },
                    )}
                  </p>
                </div>
              )}
              {mortgage.term_years ? (
                <div>
                  <p className="text-muted-foreground">Term</p>
                  <p className="font-semibold">{mortgage.term_years} years</p>
                </div>
              ) : null}
              {mortgage.start_date ? (
                <div>
                  <p className="text-muted-foreground">Start date</p>
                  <p className="font-semibold">
                    {new Date(mortgage.start_date).toLocaleDateString(
                      undefined,
                      { year: "numeric", month: "short" },
                    )}
                  </p>
                </div>
              ) : null}
            </div>
          </CardContent>
        </DashCard>
      </div>
    );
  }

  // ── Render: no mortgage, form not shown → collapsed state ────
  if (!mortgage && !showForm) {
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Mortgage</h3>
          <span className="text-xs text-muted-foreground">· Optional</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => setShowForm(true)}
        >
          <Building2 className="h-3 w-3" /> Add mortgage
        </Button>
      </div>
    );
  }

  // ── Render: add / edit form ─────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Mortgage</h3>
          {!mortgage && (
            <span className="text-xs text-muted-foreground">· Optional</span>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground"
          onClick={() => {
            setForm(mortgage ? mortgageToForm(mortgage) : emptyMortgageForm);
            setEditing(false);
            if (!mortgage) setShowForm(false);
          }}
        >
          Cancel
        </Button>
      </div>

      <DashCard>
        <CardHeader className="space-y-1 pb-3">
          <CardTitle className="text-sm">
            {editing ? "Edit Mortgage" : "Add Mortgage Details"}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Adding mortgage details here will make it visible as a read-only
            entry in the Liabilities tab.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Lender */}
          <div className="space-y-2">
            <Label htmlFor="mortgage-lender">Lender</Label>
            <Input
              id="mortgage-lender"
              placeholder="e.g. Barclays, Standard Bank, Chase"
              value={form.lender}
              onChange={(e) => update("lender", e.target.value)}
            />
          </div>

          {/* Balance + Rate */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="mortgage-balance">Outstanding balance</Label>
              <div className="flex h-9 w-full overflow-hidden rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
                <span className="flex shrink-0 select-none items-center border-r border-input bg-muted/50 px-2.5 text-xs font-medium text-muted-foreground">
                  {currency}
                </span>
                <input
                  id="mortgage-balance"
                  type="text"
                  inputMode="numeric"
                  placeholder="450,000"
                  value={form.balance}
                  onChange={(e) => handleMoneyInput("balance", e.target.value)}
                  className="flex-1 bg-transparent px-3 py-1 text-base outline-none placeholder:text-muted-foreground md:text-sm"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                This will also update the Mortgage balance on the property.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mortgage-rate">Interest rate (%)</Label>
              <Input
                id="mortgage-rate"
                type="number"
                step="0.01"
                placeholder="4.5"
                value={form.interestRatePct}
                onChange={(e) => update("interestRatePct", e.target.value)}
              />
            </div>
          </div>

          {/* Min payment + Due day */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="mortgage-payment">Min monthly payment</Label>
              <div className="flex h-9 w-full overflow-hidden rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
                <span className="flex shrink-0 select-none items-center border-r border-input bg-muted/50 px-2.5 text-xs font-medium text-muted-foreground">
                  {currency}
                </span>
                <input
                  id="mortgage-payment"
                  type="text"
                  inputMode="numeric"
                  placeholder="2,500"
                  value={form.minPaymentMonthly}
                  onChange={(e) =>
                    handleMoneyInput("minPaymentMonthly", e.target.value)
                  }
                  className="flex-1 bg-transparent px-3 py-1 text-base outline-none placeholder:text-muted-foreground md:text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mortgage-due">Due day of month</Label>
              <Input
                id="mortgage-due"
                type="number"
                min="1"
                max="31"
                placeholder="1"
                value={form.dueDay}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  update(
                    "dueDay",
                    isNaN(n) ? "" : String(Math.min(31, Math.max(1, n))),
                  );
                }}
              />
            </div>
          </div>

          <Separator />

          {/* Original loan + Payoff date */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="mortgage-original">
                Original loan amount{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <div className="flex h-9 w-full overflow-hidden rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
                <span className="flex shrink-0 select-none items-center border-r border-input bg-muted/50 px-2.5 text-xs font-medium text-muted-foreground">
                  {currency}
                </span>
                <input
                  id="mortgage-original"
                  type="text"
                  inputMode="numeric"
                  placeholder="500,000"
                  value={form.originalLoanAmount}
                  onChange={(e) =>
                    handleMoneyInput("originalLoanAmount", e.target.value)
                  }
                  className="flex-1 bg-transparent px-3 py-1 text-base outline-none placeholder:text-muted-foreground md:text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mortgage-payoff">
                Expected payoff date{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <DateInput
                id="mortgage-payoff"
                value={form.expectedPayoffDate}
                onChange={(v) => update("expectedPayoffDate", v)}
                placeholder="Pick payoff date"
                fromDate={new Date()}
                fromYear={new Date().getFullYear()}
                toYear={new Date().getFullYear() + 40}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="mortgage-term">
                Term (years){" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Input
                id="mortgage-term"
                type="number"
                min="1"
                max="40"
                placeholder="15"
                value={form.termYears}
                onChange={(e) => update("termYears", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mortgage-start">
                Start date{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <DateInput
                id="mortgage-start"
                value={form.startDate}
                onChange={(v) => update("startDate", v)}
                placeholder="Pick start date"
                fromYear={new Date().getFullYear() - 40}
                toYear={new Date().getFullYear() + 1}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setForm(
                  mortgage ? mortgageToForm(mortgage) : emptyMortgageForm,
                );
                setEditing(false);
                if (!mortgage) setShowForm(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={!isValid}
            >
              {editing ? "Save mortgage" : "Add mortgage"}
            </Button>
          </div>
        </CardContent>
      </DashCard>
    </div>
  );
}
