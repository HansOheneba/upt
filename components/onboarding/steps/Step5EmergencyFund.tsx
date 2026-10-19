"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CurrencyNumberInputField } from "@/components/ui/currency-number-input-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  emergencyFundSchema,
  type EmergencyFundFormValues,
} from "@/lib/onboarding/schemas";
import type { EmergencyFundData } from "@/lib/onboarding/types";
import {
  ArrowRight,
  ChevronLeft,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Info,
} from "lucide-react";
import { formatCurrencyAmount, getCurrencyPrefix } from "@/lib/utils";
import { useOnboardingStore } from "@/store/onboardingStore";

const STORAGE_LOCATIONS = [
  { value: "savings_account", label: "Savings Account" },
  { value: "checking_account", label: "Checking Account" },
  { value: "money_market", label: "Money Market Account" },
  { value: "fixed_deposit", label: "Fixed Deposit / CD" },
  { value: "physical_cash", label: "Physical Cash" },
  { value: "other", label: "Other" },
];

interface Step5EmergencyFundProps {
  defaultValues?: EmergencyFundData | null;
  totalMonthlyExpenses?: number;
  onComplete: (data: EmergencyFundData) => void;
  onBack?: () => void;
}

export function Step5EmergencyFund({
  defaultValues,
  totalMonthlyExpenses = 0,
  onComplete,
  onBack,
}: Step5EmergencyFundProps) {
  const store = useOnboardingStore();
  const preferredCurrency = store.identity?.currency || "USD";

  const [targetMonths, setTargetMonths] = useState<number>(
    defaultValues?.target_months ?? 6,
  );
  const [storageLocation, setStorageLocation] = useState<string>(
    defaultValues?.storage_location ?? "",
  );

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<EmergencyFundFormValues>({
    resolver: zodResolver(emergencyFundSchema) as never,
    defaultValues: {
      cash_balance: defaultValues?.cash_balance ?? 0,
      storage_location: defaultValues?.storage_location ?? "",
    },
  });

  const balance = watch("cash_balance");
  const balanceNum = Number(balance) || 0;

  const targetAmount =
    totalMonthlyExpenses > 0 ? totalMonthlyExpenses * targetMonths : 0;
  const currentRunwayMonths =
    totalMonthlyExpenses > 0 ? balanceNum / totalMonthlyExpenses : null;
  const fundedPct =
    targetAmount > 0 ? Math.min(100, (balanceNum / targetAmount) * 100) : null;

  function getInsight(): {
    icon: React.ReactNode;
    color: string;
    bg: string;
    border: string;
    title: string;
    body: string;
  } {
    if (balanceNum === 0) {
      return {
        icon: <Info className="h-4 w-4 shrink-0" />,
        color: "text-blue-800",
        bg: "bg-blue-50",
        border: "border-blue-100",
        title: "An emergency fund can start small.",
        body: "Many people start here. Even saving one month of expenses is a meaningful first step.",
      };
    }
    if (currentRunwayMonths !== null) {
      const months = currentRunwayMonths;
      if (months < 1) {
        return {
          icon: <AlertTriangle className="h-4 w-4 shrink-0" />,
          color: "text-amber-800",
          bg: "bg-amber-50",
          border: "border-amber-100",
          title: "You have less than a month of coverage.",
          body: `Building to just ${formatCurrencyAmount(totalMonthlyExpenses, preferredCurrency)} would give you a full month of runway - start there.`,
        };
      }
      if (months < 3) {
        return {
          icon: <AlertTriangle className="h-4 w-4 shrink-0" />,
          color: "text-amber-800",
          bg: "bg-amber-50",
          border: "border-amber-100",
          title: `About ${months.toFixed(1)} months of coverage.`,
          body: `You are ${Math.round(fundedPct ?? 0)}% toward your ${targetMonths}-month target. Aim for 3 months minimum before investing aggressively.`,
        };
      }
      if (months < targetMonths) {
        return {
          icon: <TrendingUp className="h-4 w-4 shrink-0" />,
          color: "text-indigo-800",
          bg: "bg-indigo-50",
          border: "border-indigo-100",
          title: `${months.toFixed(1)} months covered - ${Math.round(fundedPct ?? 0)}% of your goal.`,
          body: `You need ${formatCurrencyAmount(Math.max(0, targetAmount - balanceNum), preferredCurrency)} more to hit your ${targetMonths}-month target.`,
        };
      }
      return {
        icon: <CheckCircle2 className="h-4 w-4 shrink-0" />,
        color: "text-green-800",
        bg: "bg-green-50",
        border: "border-green-100",
        title: `You are fully covered - ${months.toFixed(1)} months of runway.`,
        body:
          months > targetMonths
            ? "You are above your target. Any excess could be working harder in investments."
            : "You have hit your target. Keep it liquid and accessible.",
      };
    }
    // No expense data - just show balance-based feedback
    return {
      icon: <CheckCircle2 className="h-4 w-4 shrink-0" />,
      color: "text-green-800",
      bg: "bg-green-50",
      border: "border-green-100",
      title: "Good - you already have a buffer.",
      body: `${formatCurrencyAmount(balanceNum, preferredCurrency)} saved so far.`,
    };
  }

  function onSubmit(data: EmergencyFundFormValues) {
    onComplete({
      cash_balance: data.cash_balance ?? 0,
      target_months: targetMonths,
      storage_location: storageLocation || undefined,
    });
  }

  const insight = getInsight();

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="max-w-xl">
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 leading-tight">
          Your emergency fund
        </h1>
        <p className="mt-2 text-slate-500 text-sm">
          If your income stopped today, how long could you cover your expenses?
          That is your runway.
        </p>
      </div>

      {/* Coverage target */}
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium text-slate-800">
            How many months of expenses do you want as your safety net?
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Most advisors recommend 3 to 6 months as a minimum.
          </p>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[3, 6, 9, 12].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setTargetMonths(m)}
              className={`rounded-xl border py-2.5 text-xs sm:text-sm font-medium text-center transition-colors ${
                targetMonths === m
                  ? "border-primary bg-primary text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-primary/50"
              }`}
            >
              {m} months
            </button>
          ))}
        </div>

        {totalMonthlyExpenses > 0 && (
          <p className="text-xs text-slate-500">
            At {formatCurrencyAmount(totalMonthlyExpenses, preferredCurrency)}
            /mo in expenses, a {targetMonths}-month fund means{" "}
            <span className="font-semibold text-slate-700">
              {formatCurrencyAmount(
                totalMonthlyExpenses * targetMonths,
                preferredCurrency,
              )}
            </span>{" "}
            saved.
          </p>
        )}
      </div>

      {/* Balance + storage */}
      <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-4 sm:p-5 shadow-sm">
        <div className="space-y-2">
          <Label>How much do you have saved right now?</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
              {getCurrencyPrefix(preferredCurrency)}
            </span>
            <CurrencyNumberInputField
              control={control}
              name="cash_balance"
              placeholder="0"
              className="pl-12 h-12 text-lg"
            />
          </div>
          {errors.cash_balance && (
            <p className="text-xs text-red-500">
              {errors.cash_balance.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label className={balanceNum === 0 ? "text-slate-400" : undefined}>
            Where is this money kept?
          </Label>
          <Select
            value={storageLocation}
            onValueChange={setStorageLocation}
            disabled={balanceNum === 0}
          >
            <SelectTrigger
              className={`h-11 rounded-xl ${balanceNum === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <SelectValue placeholder="Select a location" />
            </SelectTrigger>
            <SelectContent>
              {STORAGE_LOCATIONS.map((loc) => (
                <SelectItem key={loc.value} value={loc.value}>
                  {loc.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {balanceNum === 0 && (
            <p className="text-xs text-slate-400">
              Enter a balance above to choose where it is kept.
            </p>
          )}
        </div>
      </div>

      {/* Smart insight */}
      <div
        className={`rounded-xl border px-4 py-3 ${insight.bg} ${insight.border}`}
      >
        <div className={`flex items-start gap-2 ${insight.color}`}>
          {insight.icon}
          <div>
            <p className="text-sm font-medium">{insight.title}</p>
            <p
              className={`text-xs mt-0.5 ${insight.color.replace("800", "700")}`}
            >
              {insight.body}
            </p>
          </div>
        </div>

        {fundedPct !== null && balanceNum > 0 && (
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Progress toward {targetMonths}-month goal</span>
              <span className="font-medium">{Math.round(fundedPct)}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/60 overflow-hidden">
              <div
                className={`h-full w-full origin-left rounded-full transition-transform duration-200 ease-out ${
                  fundedPct >= 100
                    ? "bg-green-500"
                    : fundedPct >= 50
                      ? "bg-indigo-500"
                      : "bg-amber-400"
                }`}
                style={{
                  transform: `scaleX(${Math.min(100, Math.max(fundedPct, 0)) / 100})`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="flex gap-3">
        {onBack && (
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="flex-1 gap-1 h-12 rounded-xl"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
        )}
        <Button
          type="button"
          onClick={handleSubmit(onSubmit)}
          className="flex-1 gap-2 h-12 bg-[var(--brand-primary)] hover:bg-[color-mix(in_srgb,var(--brand-primary)_85%,black)] text-white rounded-xl"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
