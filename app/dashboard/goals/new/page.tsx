"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, TrendingUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatCurrency,
  GOAL_CATEGORY_OPTIONS,
  GOAL_CATEGORY_META,
  type Goal,
  type GoalCategory,
} from "@/lib/client-data";
import { useFinancialStore } from "@/store/financialStore";
import { createGoal } from "@/lib/dashboard-api";
import { blockRecordCreate } from "@/lib/record-limits";
import { toast } from "sonner";

type GoalForm = {
  title: string;
  category: GoalCategory;
  description: string;
  target: string;
  current: string;
  timelineValue: string;
  timelineUnit: "months" | "years";
  targetDate?: string;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatNumberWithCommas(value: string): string {
  return value.replace(/[^\d]/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function toNumber(value: string): number {
  const n = Number(value.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function clamp(min: number, v: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function pct(current: number, target: number): number {
  if (target <= 0) return 0;
  return clamp(0, (current / target) * 100, 100);
}

export default function NewGoalPage() {
  const router = useRouter();

  const storeGoals = useFinancialStore((s) => s.goals);
  const activeCurrency = useFinancialStore((s) => s.user?.currency ?? "USD");
  const nextPriority = storeGoals.length + 1;

  const [form, setForm] = React.useState<GoalForm>({
    title: "",
    category: "other",
    description: "",
    target: "",
    current: "",
    timelineValue: "",
    timelineUnit: "years",
  });

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  function update<K extends keyof GoalForm>(key: K, value: GoalForm[K]): void {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleMoneyInput(key: "target" | "current", value: string): void {
    update(key, formatNumberWithCommas(value));
  }

  const currentNum = React.useMemo(
    () => toNumber(form.current),
    [form.current],
  );
  const targetNum = React.useMemo(() => toNumber(form.target), [form.target]);
  const progress = React.useMemo(
    () => pct(currentNum, targetNum),
    [currentNum, targetNum],
  );

  const timelineValueNum = React.useMemo(
    () => Number(form.timelineValue || 0),
    [form.timelineValue],
  );

  const yearsRemaining = React.useMemo(() => {
    if (!timelineValueNum) return 0;
    return form.timelineUnit === "months"
      ? timelineValueNum / 12
      : timelineValueNum;
  }, [timelineValueNum, form.timelineUnit]);

  const remaining = React.useMemo(
    () => Math.max(0, targetNum - currentNum),
    [targetNum, currentNum],
  );

  const isValid =
    form.title.trim().length > 0 &&
    form.category.length > 0 &&
    toNumber(form.current) >= 0 &&
    toNumber(form.target) > 0 &&
    Number(form.timelineValue) >= 1;

  const isComplete = targetNum > 0 && currentNum >= targetNum;
  const progressBarClass = isComplete ? "bg-emerald-500" : "bg-sky-500";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (blockRecordCreate("goals")) return;
    setIsSubmitting(true);

    try {
      const targetDate = form.targetDate
        ? form.targetDate
        : (() => {
            const d = new Date();
            const years =
              form.timelineUnit === "years"
                ? timelineValueNum
                : timelineValueNum / 12;
            d.setFullYear(d.getFullYear() + Math.round(years));
            return d.toISOString().split("T")[0];
          })();

      const created = await createGoal({
        title: form.title.trim(),
        target_amount: toNumber(form.target),
        current_amount: toNumber(form.current),
        target_date: targetDate,
        priority: nextPriority,
        category: form.category,
        description: form.description.trim() || undefined,
        icon: GOAL_CATEGORY_META[form.category].icon,
        color: GOAL_CATEGORY_META[form.category].color,
        status: isComplete ? "completed" : "active",
      });

      const now = new Date().toISOString();
      const newGoal: Goal = {
        id: created.goal_id ?? `goal-${Date.now()}`,
        title: form.title.trim(),
        category: form.category,
        priority: nextPriority,
        description: form.description.trim() || undefined,
        target: toNumber(form.target),
        current: toNumber(form.current),
        yearsRemaining,
        completed: isComplete,
        targetDate,
        monthlyContributionNeeded:
          yearsRemaining > 0 ? Math.ceil(remaining / (yearsRemaining * 12)) : 0,
        probability: 50,
        createdAt: now,
        updatedAt: now,
      };

      useFinancialStore.getState().addGoal(newGoal);
      toast.success("Goal created.");
      router.push("/dashboard/goals");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create goal.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted/20">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="rounded-full"
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                Create a goal
              </h1>
              <p className="text-sm text-muted-foreground">
                Build a clear target, timeline, and saving pace.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
          {/* Left: Main card */}
          <Card className="border-muted/60 bg-background/70 backdrop-blur lg:col-span-2">
            <CardHeader className="space-y-1">
              <CardTitle className="text-base">Goal Setup</CardTitle>
              <p className="text-sm text-muted-foreground">
                Keep it simple. You can refine later.
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Goal name</Label>
                <Input
                  id="title"
                  placeholder="e.g. Buy a home, Emergency fund, Car deposit"
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                  required
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => update("category", v as GoalCategory)}
                >
                  <SelectTrigger id="category" className="w-full">
                    <SelectValue placeholder="Pick a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {GOAL_CATEGORY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  Description{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="What is this goal for? Add any context that may help."
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  maxLength={300}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {form.description.length}/300
                </p>
              </div>

              <Separator />

              {/* Amounts */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="current">Current amount</Label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
                      {activeCurrency}
                    </div>
                    <Input
                      id="current"
                      type="text"
                      inputMode="numeric"
                      placeholder="100,000"
                      value={form.current}
                      onChange={(e) =>
                        handleMoneyInput("current", e.target.value)
                      }
                      className="pl-12"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    What you've saved toward this goal so far.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target">Target amount</Label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
                      {activeCurrency}
                    </div>
                    <Input
                      id="target"
                      type="text"
                      inputMode="numeric"
                      placeholder="500,000"
                      value={form.target}
                      onChange={(e) =>
                        handleMoneyInput("target", e.target.value)
                      }
                      className="pl-12"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The amount you want to reach.
                  </p>
                </div>
              </div>

              {/* Progress preview */}
              {targetNum > 0 && (
                <div className="rounded-xl border bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">Progress preview</p>
                    <p className="text-sm font-semibold">
                      {Math.round(progress)}%
                    </p>
                  </div>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-[width] duration-200 ease-out",
                        progressBarClass,
                      )}
                      style={{ width: `${Math.round(progress)}%` }}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      Current:{" "}
                      <span className="font-medium text-foreground">
                        {formatCurrency(currentNum)}
                      </span>
                    </span>
                    <span>
                      Remaining:{" "}
                      <span className="font-medium text-foreground">
                        {formatCurrency(remaining)}
                      </span>
                    </span>
                  </div>
                </div>
              )}

              <Separator />

              {/* Timeline */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="timeline-unit">Timeline unit</Label>
                  <Select
                    value={form.timelineUnit}
                    onValueChange={(v) =>
                      update("timelineUnit", v as GoalForm["timelineUnit"])
                    }
                  >
                    <SelectTrigger id="timeline-unit" className="w-full">
                      <SelectValue placeholder="Select a time unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="months">Months</SelectItem>
                      <SelectItem value="years">Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeline-value">
                    Duration ({form.timelineUnit})
                  </Label>
                  <Input
                    id="timeline-value"
                    type="text"
                    inputMode="numeric"
                    placeholder={form.timelineUnit === "months" ? "24" : "5"}
                    value={form.timelineValue}
                    onChange={(e) =>
                      update(
                        "timelineValue",
                        e.target.value.replace(/[^\d]/g, ""),
                      )
                    }
                    required
                  />
                </div>
              </div>

              {timelineValueNum >= 1 && (
                <p className="text-sm text-muted-foreground">
                  Based on your timeline, this goal should be achieved by{" "}
                  <span className="font-medium text-foreground">
                    {new Date(
                      (() => {
                        const d = new Date();
                        if (form.timelineUnit === "months") {
                          d.setMonth(d.getMonth() + timelineValueNum);
                        } else {
                          d.setFullYear(d.getFullYear() + timelineValueNum);
                        }
                        return d;
                      })(),
                    ).toLocaleDateString(undefined, {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  .
                </p>
              )}

              <Separator />

              {/* Actions */}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.push("/dashboard/goals")}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || !isValid}>
                  {isSubmitting ? "Saving..." : "Create goal"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Right: Summary card */}
          <div className="space-y-6">
            <Card className="border-muted/60 bg-background/70 backdrop-blur">
              <CardHeader className="space-y-1">
                <CardTitle className="text-base">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-muted-foreground">
                      Progress
                    </span>
                    <span className="text-sm font-semibold">
                      {targetNum > 0 ? `${Math.round(progress)}%` : "-"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-muted-foreground">
                      Remaining
                    </span>
                    <span className="text-sm font-semibold">
                      {targetNum > 0 ? formatCurrency(remaining) : "-"}
                    </span>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-muted-foreground">
                      Timeline
                    </span>
                    <span className="text-sm font-semibold">
                      {timelineValueNum >= 1
                        ? `${timelineValueNum} ${form.timelineUnit}`
                        : "-"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-muted-foreground">
                      Category
                    </span>
                    <span className="text-sm font-semibold capitalize">
                      {form.category}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border bg-muted/20 p-3 text-xs text-muted-foreground leading-relaxed">
                  {isComplete ? (
                    <span className="flex items-center gap-2 text-emerald-700 font-medium">
                      <CheckCircle2 className="h-4 w-4" />
                      You've already reached this target. Nice work.
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 shrink-0" />
                      Contribution insights and probability will be calculated
                      by the backend once submitted.
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      </div>
    </div>
  );
}
