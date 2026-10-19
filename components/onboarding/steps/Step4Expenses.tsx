"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
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
  expenseSchema,
  type ExpenseFormValues,
} from "@/lib/onboarding/schemas";
import type { ExpenseData } from "@/lib/onboarding/types";
import {
  ArrowRight,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronDown,
  Receipt,
} from "lucide-react";
import { formatCurrencyAmount, getCurrencyPrefix } from "@/lib/utils";
import { useOnboardingStore } from "@/store/onboardingStore";

const EXPENSE_CATEGORIES = [
  "Housing",
  "Food & Groceries",
  "Transport",
  "Utilities",
  "Healthcare",
  "Education",
  "Entertainment",
  "Clothing",
  "Personal Care",
  "Insurance",
  "Subscriptions",
  "Other",
];

const CATEGORY_COLORS: Record<string, string> = {
  Housing: "bg-blue-100 text-blue-700",
  "Food & Groceries": "bg-green-100 text-green-700",
  Transport: "bg-orange-100 text-orange-700",
  Utilities: "bg-yellow-100 text-yellow-700",
  Healthcare: "bg-red-100 text-red-700",
  Education: "bg-purple-100 text-purple-700",
  Entertainment: "bg-pink-100 text-pink-700",
  Clothing: "bg-fuchsia-100 text-fuchsia-700",
  "Personal Care": "bg-rose-100 text-rose-700",
  Insurance: "bg-indigo-100 text-indigo-700",
  Subscriptions: "bg-cyan-100 text-cyan-700",
  Other: "bg-gray-100 text-gray-700",
};

/* ─── Accordion Expense Item ────────────────────────────────────── */
function ExpenseAccordionItem({
  expense,
  index,
  preferredCurrency,
  onRemove,
}: {
  expense: ExpenseData;
  index: number;
  preferredCurrency: string;
  onRemove: (i: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const colorClass =
    CATEGORY_COLORS[expense.category] ?? "bg-gray-100 text-gray-700";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, transform: "translateY(-6px)" }}
      animate={{ opacity: 1, transform: "translateY(0px)" }}
      exit={{ opacity: 0, transform: "translateY(-6px)", height: 0 }}
      transition={{ duration: 0.18 }}
      className="overflow-hidden rounded-xl border border-slate-100 bg-white"
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50/60 transition-colors"
      >
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${colorClass}`}
        >
          {expense.category}
        </span>
        <p className="flex-1 min-w-0 text-sm font-medium text-slate-800 truncate">
          {expense.name}
        </p>
        <p className="text-sm font-semibold text-slate-900 tabular-nums shrink-0">
          {formatCurrencyAmount(expense.amount_monthly, preferredCurrency)}
          <span className="text-xs text-slate-400 font-normal">/mo</span>
        </p>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform shrink-0 ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 pt-1 border-t border-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => onRemove(index)}
                aria-label="Remove"
                className="text-slate-300 hover:text-red-500 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Main Step ─────────────────────────────────────────────────── */
export function Step4Expenses({ defaultValues = [], onComplete, onBack }: any) {
  const [expenses, setExpenses] = useState<ExpenseData[]>(defaultValues);
  const [showForm, setShowForm] = useState(defaultValues.length === 0);
  const store = useOnboardingStore();
  const preferredCurrency = store.identity?.currency || "USD";
  const setStoreExpenses = useOnboardingStore((s) => s.setExpenses);

  useEffect(() => {
    setStoreExpenses(expenses);
  }, [expenses, setStoreExpenses]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    control,
    formState: { errors, isSubmitted },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema) as never,
    defaultValues: {
      name: "",
      amount_monthly: 0,
      category: "",
    },
    mode: "onChange",
    reValidateMode: "onChange",
  });

  const selectedCategory = watch("category");
  const watchedValues = watch();

  const canSave = Boolean(
    watchedValues.category &&
    watchedValues.name?.trim() &&
    Number(watchedValues.amount_monthly) > 0,
  );

  const totalMonthlyExpenses = expenses.reduce(
    (s, e) => s + Number(e.amount_monthly),
    0,
  );

  function addExpense(data: ExpenseFormValues) {
    const newExpense: ExpenseData = {
      name: data.name,
      amount_monthly: data.amount_monthly as number,
      category: data.category,
    };
    const next = [...expenses, newExpense];
    setExpenses(next);
    setStoreExpenses(next);
    reset({ name: "", amount_monthly: 0, category: "" });
    setShowForm(false);
  }

  function removeExpense(i: number) {
    const next = expenses.filter((_, idx) => idx !== i);
    setExpenses(next);
    setStoreExpenses(next);
    if (next.length === 0) setShowForm(true);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 leading-tight">
          Your monthly expenses
        </h1>
        <p className="mt-1.5 text-slate-500 text-sm">
          Add your regular outgoings so we can understand your true financial
          picture.
        </p>
      </div>

      {/* Total card */}
      <div className="rounded-2xl bg-[var(--brand-primary)] text-white px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium text-white/50 uppercase tracking-widest">
            Total monthly expenses
          </p>
          <motion.p
            key={totalMonthlyExpenses}
            initial={{ opacity: 0, transform: "translateY(4px)" }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            className="text-2xl font-semibold mt-0.5 tabular-nums"
          >
            {formatCurrencyAmount(totalMonthlyExpenses, preferredCurrency)}
          </motion.p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
          <Receipt className="h-4.5 w-4.5 text-white/70" />
        </div>
      </div>

      {/* Saved expenses list */}
      {expenses.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold capitalize uppercase tracking-widest text-slate-400">
            Expenses ({expenses.length})
          </p>
          <AnimatePresence>
            {expenses.map((exp, i) => (
              <ExpenseAccordionItem
                key={`${exp.category}-${i}`}
                expense={exp}
                index={i}
                preferredCurrency={preferredCurrency}
                onRemove={removeExpense}
              />
            ))}
          </AnimatePresence>

          {!showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 py-2.5 text-sm text-slate-400 hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add another expense
            </button>
          )}
        </div>
      )}

      {/* Add expense form */}
      {showForm && (
        <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5 shadow-sm space-y-4">
          <p className="text-[11px] font-semibold capitalize uppercase tracking-widest text-slate-400">
            {expenses.length === 0
              ? "Add your first expense"
              : "Add another expense"}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-600">Category</Label>
              <Select
                value={selectedCategory}
                onValueChange={(v) =>
                  setValue("category", v, {
                    shouldValidate: true,
                    shouldTouch: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-xs text-red-500">
                  {errors.category.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-600">Label</Label>
              <Input placeholder="e.g. Monthly rent" {...register("name")} />
              {errors.name && (
                <p className="text-xs text-red-500">{errors.name.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">Monthly amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                {getCurrencyPrefix(preferredCurrency)}
              </span>
              <CurrencyNumberInputField
                control={control}
                name="amount_monthly"
                className="pl-12"
              />
            </div>
            {isSubmitted && errors.amount_monthly && (
              <p className="text-xs text-red-500">
                {errors.amount_monthly.message}
              </p>
            )}
          </div>

          <Button
            type="button"
            onClick={handleSubmit(addExpense)}
            disabled={!canSave}
            className="w-full h-10 gap-2 bg-[var(--brand-primary)] hover:bg-[color-mix(in_srgb,var(--brand-primary)_85%,black)] text-white rounded-xl text-sm"
          >
            <Plus className="h-4 w-4" />
            Save expense
          </Button>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between gap-3 pt-1">
        {onBack && (
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="flex-1 gap-1 h-12 rounded-xl"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
        )}
        <Button
          onClick={() => onComplete(expenses)}
          className="flex-1 gap-2 h-12 bg-[var(--brand-primary)] hover:bg-[color-mix(in_srgb,var(--brand-primary)_85%,black)] text-white rounded-xl"
        >
          {expenses.length === 0 ? "Skip" : "Continue"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
