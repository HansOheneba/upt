"use client";

import React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  retirementSchema,
  type RetirementFormValues,
} from "@/lib/onboarding/schemas";
import type { RetirementData } from "@/lib/onboarding/types";
import { RETIREMENT_STORAGE_LOCATIONS } from "@/lib/retirement-storage";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { getCurrencyPrefix } from "@/lib/utils";
import { useOnboardingStore } from "@/store/onboardingStore";

interface Step6RetirementProps {
  defaultValues?: RetirementData | null;
  onComplete: (data: RetirementData) => void;
  onBack?: () => void;
}

export function Step6Retirement({
  defaultValues,
  onComplete,
  onBack,
}: Step6RetirementProps) {
  const store = useOnboardingStore();
  const preferredCurrency = store.identity?.currency || "USD";
  const accountMode = store.accountMode;
  const isSolo = accountMode === "solo";

  const [storageLocation, setStorageLocation] = React.useState<string>(
    defaultValues?.storage_location ?? "",
  );

  // Derive current age from DOB so we can enforce a meaningful minimum
  const currentAge = React.useMemo(() => {
    const dob = store.identity?.date_of_birth;
    if (!dob) return null;
    const birth = new Date(dob);
    if (Number.isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const hasBirthdayPassed =
      today.getMonth() > birth.getMonth() ||
      (today.getMonth() === birth.getMonth() &&
        today.getDate() >= birth.getDate());
    if (!hasBirthdayPassed) age -= 1;
    if (!Number.isFinite(age) || age < 0) return null;
    return age;
  }, [store.identity?.date_of_birth]);

  // Minimum allowed retirement age = current age + 1
  const minRetirementAge = currentAge !== null ? currentAge + 1 : 18;

  const {
    register,
    control,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<RetirementFormValues>({
    resolver: zodResolver(retirementSchema) as never,
    defaultValues: {
      retirement_age: undefined,
      retirement_target_year: defaultValues?.retirement_target_year,
      monthly_savings: defaultValues?.monthly_savings ?? 0,
      desired_monthly_income: defaultValues?.desired_monthly_income ?? 0,
    },
  });

  // Reactively compute years until retirement for the hint label
  const watchedRetirementAge = watch("retirement_age");
  const watchedTargetYear = watch("retirement_target_year");
  const watchedMonthlySavings = watch("monthly_savings");
  const monthlySavingsNum = Number(watchedMonthlySavings) || 0;
  const ageValue =
    typeof watchedRetirementAge === "number" &&
    Number.isFinite(watchedRetirementAge)
      ? watchedRetirementAge
      : null;
  const yearValue =
    typeof watchedTargetYear === "number" && Number.isFinite(watchedTargetYear)
      ? watchedTargetYear
      : null;
  const { yearsUntilRetirement, retirementTargetYear } = React.useMemo(() => {
    if (!isSolo || ageValue === null || currentAge === null)
      return { yearsUntilRetirement: null, retirementTargetYear: null };
    const years = ageValue - currentAge;
    if (years <= 0)
      return { yearsUntilRetirement: null, retirementTargetYear: null };
    const dob = store.identity?.date_of_birth;
    const birthYear = dob ? new Date(dob).getFullYear() : NaN;
    const targetYear = Number.isFinite(birthYear)
      ? birthYear + ageValue
      : new Date().getFullYear() + years;
    return { yearsUntilRetirement: years, retirementTargetYear: targetYear };
  }, [isSolo, ageValue, currentAge, store.identity?.date_of_birth]);

  const currentYear = new Date().getFullYear();
  const ageTooSoon =
    ageValue !== null && currentAge !== null && ageValue <= currentAge;
  const blockerMessage = isSolo
    ? ageValue === null
      ? "Enter a target retirement age to continue. An estimate is fine. You can change it later."
      : currentAge === null
        ? "Check your date of birth on the profile step. We need it to set a retirement year."
        : ageTooSoon
          ? `Enter an age greater than your current age (${currentAge}) to continue.`
          : ageValue < minRetirementAge || ageValue > 100
            ? `Enter an age between ${minRetirementAge} and 100 to continue.`
            : null
    : yearValue === null
      ? "Enter a target retirement year to continue. An estimate is fine. You can change it later."
      : yearValue < currentYear || yearValue > 2100
        ? `Enter a year between ${currentYear} and 2100 to continue.`
        : null;
  const canContinue = blockerMessage === null;

  function onSubmit(data: RetirementFormValues) {
    let retirement_target_year = data.retirement_target_year as number;

    if (
      isSolo &&
      typeof data.retirement_age === "number" &&
      Number.isFinite(data.retirement_age)
    ) {
      const dob = store.identity?.date_of_birth;
      const birthYear = dob ? new Date(dob).getFullYear() : NaN;
      if (Number.isFinite(birthYear)) {
        retirement_target_year = birthYear + data.retirement_age;
      } else if (currentAge !== null) {
        retirement_target_year =
          new Date().getFullYear() + (data.retirement_age - currentAge);
      }
    }

    if (!Number.isFinite(retirement_target_year)) {
      return;
    }

    onComplete({
      retirement_target_year,
      monthly_savings: data.monthly_savings ?? 0,
      desired_monthly_income: data.desired_monthly_income ?? 0,
      storage_location: storageLocation || undefined,
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 leading-tight">
          Plan your retirement
        </h1>
        <p className="mt-1.5 text-slate-500 text-sm">
          We need a retirement target to build your plan. An estimate is fine.
          You can change it anytime.
        </p>
      </div>

      {/* ── Section 1: When & Lifestyle ── */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5 shadow-sm space-y-4">
        <p className="text-xs font-semibold capitalize uppercase tracking-widest text-slate-400">
          When &amp; lifestyle
        </p>

        <div className="grid grid-cols-2 gap-3">
          {/* Retirement timing */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">
              {isSolo ? "Target retirement age" : "Target retirement year"}{" "}
              <span className="text-red-500">*</span>
            </Label>
            {isSolo ? (
              <>
                <Controller
                  control={control}
                  name="retirement_age"
                  render={({ field }) => (
                    <Input
                      type="number"
                      min={minRetirementAge}
                      max={100}
                      placeholder="e.g. 65"
                      name={field.name}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      value={
                        typeof field.value === "number" &&
                        Number.isFinite(field.value)
                          ? field.value
                          : ""
                      }
                      onChange={(event) => {
                        const raw = event.target.value;
                        if (raw === "") {
                          field.onChange(undefined);
                          return;
                        }
                        const next = Number(raw);
                        field.onChange(Number.isFinite(next) ? next : undefined);
                      }}
                    />
                  )}
                />
                {yearsUntilRetirement !== null ? (
                  <p className="text-[11px] text-slate-400">
                    That&apos;s in{" "}
                    <span className="font-medium text-slate-600">
                      {yearsUntilRetirement} year
                      {yearsUntilRetirement !== 1 ? "s" : ""}
                    </span>
                    {retirementTargetYear !== null && (
                      <> ({retirementTargetYear})</>
                    )}
                  </p>
                ) : ageTooSoon ? (
                  <p className="text-xs text-red-500">
                    Must be greater than your current age ({currentAge}).
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400">
                    Rough guess works. You can update this later in your
                    dashboard.
                  </p>
                )}
              </>
            ) : (
              <>
                <Input
                  type="number"
                  min={currentYear}
                  max={2100}
                  placeholder="e.g. 2055"
                  {...register("retirement_target_year", {
                    valueAsNumber: true,
                    validate: (v) => {
                      const n = v as number | undefined;
                      if (n === undefined || Number.isNaN(n)) {
                        return "Add a target year to continue";
                      }
                      if (n < currentYear) {
                        return `Must be ${currentYear} or later`;
                      }
                      return true;
                    },
                  })}
                />
                {!(
                  typeof watchedTargetYear === "number" &&
                  !Number.isNaN(watchedTargetYear)
                ) && (
                  <p className="text-[11px] text-slate-400">
                    Rough guess works. You can update this later in your
                    dashboard.
                  </p>
                )}
              </>
            )}
            {(errors.retirement_age || errors.retirement_target_year) && (
              <p className="text-xs text-red-500">
                {errors.retirement_age?.message ??
                  errors.retirement_target_year?.message}
              </p>
            )}
          </div>

          {/* Desired income */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">
              Desired monthly income
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                {getCurrencyPrefix(preferredCurrency)}
              </span>
              <CurrencyNumberInputField
                control={control}
                name="desired_monthly_income"
                placeholder="3 000"
                className="pl-12"
              />
            </div>
            {errors.desired_monthly_income && (
              <p className="text-xs text-red-500">
                {errors.desired_monthly_income.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Section 2: Contributions ── */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5 shadow-sm space-y-4">
        <p className="text-xs font-semibold capitalize uppercase tracking-widest text-slate-400">
          Your contributions
        </p>

        {/* Monthly savings — full width, feels primary */}
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-600">
            Monthly retirement savings
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
              {getCurrencyPrefix(preferredCurrency)}
            </span>
            <CurrencyNumberInputField
              control={control}
              name="monthly_savings"
              placeholder="500"
              className="pl-12"
            />
          </div>
          {errors.monthly_savings && (
            <p className="text-xs text-red-500">
              {errors.monthly_savings.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label
            className={`text-xs text-slate-600 ${monthlySavingsNum === 0 ? "text-slate-400" : ""}`}
          >
            Where is your retirement money saved?
          </Label>
          <Select
            value={storageLocation}
            onValueChange={setStorageLocation}
            disabled={monthlySavingsNum === 0}
          >
            <SelectTrigger
              className={`h-11 rounded-xl ${monthlySavingsNum === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <SelectValue placeholder="Select account type" />
            </SelectTrigger>
            <SelectContent>
              {RETIREMENT_STORAGE_LOCATIONS.map((loc) => (
                <SelectItem key={loc.value} value={loc.value}>
                  {loc.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {monthlySavingsNum === 0 ? (
            <p className="text-[11px] text-slate-400">
              Enter a monthly savings amount above to choose where it goes.
            </p>
          ) : (
            <p className="text-[11px] text-slate-400">
              Pick the main account where your retirement contributions land.
            </p>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between gap-3 pt-1">
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
          disabled={!canContinue}
          className="flex-1 gap-2 h-12 bg-[var(--brand-primary)] hover:bg-[color-mix(in_srgb,var(--brand-primary)_85%,black)] text-white rounded-xl"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
      {!canContinue && blockerMessage && (
        <p className="text-sm text-slate-500">{blockerMessage}</p>
      )}
    </div>
  );
}
