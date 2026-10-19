"use client";

import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, formatDistanceToNow, isFuture } from "date-fns";
import {
  CalendarIcon,
  ArrowRight,
  Trash2,
  Plus,
  ChevronLeft,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CurrencyNumberInputField } from "@/components/ui/currency-number-input-field";
import { goalSchema, type GoalFormValues } from "@/lib/onboarding/schemas";
import type { GoalData } from "@/lib/onboarding/types";
import { cn, formatCurrencyAmount, getCurrencyPrefix } from "@/lib/utils";
import { useOnboardingStore } from "@/store/onboardingStore";

const SUGGESTED_GOALS = [
  "Emergency Fund",
  "Buy a Home",
  "Retire Early",
  "Pay off Debt",
  "Save for Education",
  "Build Wealth",
  "Travel Fund",
  "Start a Business",
];

function getGoalsHeading(mode?: "solo" | "partner" | "family") {
  if (mode === "partner")
    return "What are your household financial goals with your partner?";
  if (mode === "family") return "What are your family financial goals?";
  return "What are your financial goals?";
}

function getGoalsSubheading(mode?: "solo" | "partner" | "family") {
  if (mode === "partner")
    return "Add your goals one at a time. You can save up to 3 before moving on.";
  if (mode === "family")
    return "Add your goals one at a time. You can save up to 3 before moving on.";
  return "Add your goals one at a time. Fill in the details below and save each one before moving on.";
}

function naturalCountdown(date: Date): string {
  if (!isFuture(date)) return "That date has passed";
  return "In " + formatDistanceToNow(date);
}

interface Step2GoalsProps {
  defaultValues?: GoalData[];
  onComplete: (goals: GoalData[]) => void;
  onBack?: () => void;
}

export function Step2Goals({
  defaultValues = [],
  onComplete,
  onBack,
}: Step2GoalsProps) {
  const [goals, setGoals] = useState<GoalData[]>(defaultValues);
  // Show form by default if no goals yet, hide it after first save
  const [showForm, setShowForm] = useState(defaultValues.length === 0);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const store = useOnboardingStore();
  const preferredCurrency = store.identity?.currency || "USD";

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    control,
    formState: { errors, isSubmitted },
  } = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema) as never,
    defaultValues: { title: "", target_amount: 0, target_date: "" },
    mode: "onChange",
    reValidateMode: "onChange",
  });

  const titleValue = watch("title");
  const watchedValues = watch();

  // Button is enabled as soon as all required fields are filled — no need to explicitly "save" first
  const canSaveGoal = Boolean(
    watchedValues.title?.trim() &&
    Number(watchedValues.target_amount) > 0 &&
    watchedValues.target_date,
  );

  function addGoal(data: GoalFormValues) {
    const newGoal: GoalData = {
      title: data.title,
      target_amount: data.target_amount as number,
      target_date: data.target_date,
      status: "active",
    };
    const next = [...goals, newGoal];
    setGoals(next);
    store.setGoals(next);
    reset({ title: "", target_amount: 0, target_date: "" });
    // Hide the form after saving - user can re-open with "+ Add another goal"
    setShowForm(false);
  }

  function removeGoal(i: number) {
    const next = goals.filter((_, idx) => idx !== i);
    setGoals(next);
    store.setGoals(next);
    if (next.length === 0) setShowForm(true);
  }

  function applySuggestion(label: string) {
    setValue("title", label, { shouldValidate: true });
  }

  function handleContinue() {
    onComplete(goals);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 leading-tight">
          {getGoalsHeading(store.identity?.account_mode)}
        </h1>
        <p className="mt-2 text-slate-500 text-sm sm:text-base">
          {getGoalsSubheading(store.identity?.account_mode)}
        </p>
      </div>

      {/* Suggestions — only shown when form is open */}
      {showForm && (
        <div className="space-y-2">
          <p className="text-xs text-slate-400">
            Not sure what to name it? Tap one to pre-fill the goal name:
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_GOALS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => applySuggestion(g)}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  titleValue === g
                    ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Goal entry form */}
      {showForm && (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 sm:p-6 shadow-sm space-y-4">
          <p className="text-xs font-semibold capitalize uppercase tracking-widest text-slate-400">
            {goals.length === 0 ? "Add your first goal" : "Add another goal"}
          </p>

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="goal-title">Goal name</Label>
            <Input
              id="goal-title"
              placeholder="e.g. Buy a Home"
              {...register("title")}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSaveGoal) {
                  e.preventDefault();
                  handleSubmit(addGoal)();
                }
              }}
            />
            {errors.title && (
              <p className="text-xs text-red-500">{errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Amount */}
            <div className="space-y-1.5">
              <Label>Target amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                  {getCurrencyPrefix(preferredCurrency)}
                </span>
                <CurrencyNumberInputField
                  control={control}
                  name="target_amount"
                  className="pl-12"
                />
              </div>
              {isSubmitted && errors.target_amount && (
                <p className="text-xs text-red-500">
                  {errors.target_amount.message}
                </p>
              )}
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label>Target date</Label>
              <Controller
                control={control}
                name="target_date"
                render={({ field }) => {
                  const dateValue = field.value
                    ? new Date(field.value)
                    : undefined;

                  return (
                    <div className="space-y-1.5">
                      <Popover
                        open={calendarOpen}
                        onOpenChange={setCalendarOpen}
                      >
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateValue
                              ? format(dateValue, "PPP")
                              : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0">
                          <Calendar
                            mode="single"
                            selected={dateValue}
                            captionLayout="dropdown"
                            startMonth={new Date(new Date().getFullYear(), 0)}
                            endMonth={
                              new Date(new Date().getFullYear() + 50, 11)
                            }
                            disabled={{ before: new Date() }}
                            onSelect={(date) => {
                              field.onChange(
                                date ? format(date, "yyyy-MM-dd") : "",
                              );
                              setCalendarOpen(false);
                            }}
                          />
                        </PopoverContent>
                      </Popover>

                      {dateValue && (
                        <p className="text-xs text-[var(--brand-primary)]">
                          {naturalCountdown(dateValue)}
                        </p>
                      )}
                      {errors.target_date && (
                        <p className="text-xs text-red-500">
                          {errors.target_date.message}
                        </p>
                      )}
                    </div>
                  );
                }}
              />
            </div>
          </div>

          {/* Save goal — this IS the primary CTA while the form is open */}
          <Button
            type="button"
            onClick={handleSubmit(addGoal)}
            disabled={!canSaveGoal}
            className="w-full h-11 gap-2 bg-[var(--brand-primary)] hover:bg-[color-mix(in_srgb,var(--brand-primary)_85%,black)] text-white rounded-xl"
          >
            <Plus className="h-4 w-4" />
            Save goal
          </Button>
        </div>
      )}

      {/* Saved goals list */}
      {goals.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs uppercase text-slate-400">
            Your goals ({goals.length})
          </p>

          {goals.map((g, i) => (
            <div
              key={i}
              className="flex justify-between items-center border border-slate-100 bg-white p-4 rounded-xl shadow-sm"
            >
              <div>
                <p className="text-sm font-medium text-slate-800">{g.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {formatCurrencyAmount(g.target_amount, preferredCurrency)} ·{" "}
                  {naturalCountdown(new Date(g.target_date))}
                </p>
              </div>

              <button
                type="button"
                onClick={() => removeGoal(i)}
                aria-label="Remove goal"
                className="text-slate-300 hover:text-red-500 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          {/* Add another goal — only shown when form is hidden */}
          {!showForm && goals.length < 3 && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-sm text-slate-500 hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add another goal
            </button>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between gap-3">
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
          onClick={handleContinue}
          disabled={goals.length === 0}
          className="flex-1 gap-2 h-12 bg-[var(--brand-primary)] hover:bg-[color-mix(in_srgb,var(--brand-primary)_85%,black)] text-white rounded-xl"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
