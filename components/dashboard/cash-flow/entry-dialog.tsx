"use client";

import * as React from "react";
import {
  Banknote,
  CreditCard,
  CalendarClock,
  Info,
  Repeat2,
  TimerReset,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DateInput } from "@/components/ui/date-input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { useFinancialStore } from "@/store/financialStore";
import { type CashFlowEntryDraft, type RecurringType } from "@/lib/client-data";
import { type EditMode } from "@/components/dashboard/cash-flow/delete-confirm-dialog";

// ─── Helpers ───────────────────────────────────────────────────────────────

// Adds N months to an ISO date string (YYYY-MM-DD). Returns YYYY-MM-DD.
function addMonthsISO(startISO: string, months: number): string {
  if (!startISO || !Number.isFinite(months) || months <= 0) return "";
  const [y, m, d] = startISO.split("-").map(Number);
  if (!y || !m || !d) return "";
  // JS Date handles month overflow; subtract 1 day so an N-month span ends on the day before the next occurrence.
  const dt = new Date(Date.UTC(y, m - 1 + months, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().split("T")[0];
}

// Inverse of addMonthsISO: rough whole-month count between two ISO dates.
function monthsBetweenISO(startISO: string, endISO: string): number {
  if (!startISO || !endISO) return 0;
  const [sy, sm, sd] = startISO.split("-").map(Number);
  const [ey, em, ed] = endISO.split("-").map(Number);
  if (!sy || !ey) return 0;
  let months = (ey - sy) * 12 + (em - sm);
  if (ed + 1 >= sd) months += 1; // because addMonthsISO subtracts a day
  return Math.max(months, 0);
}

const INCOME_CATEGORIES = [
  "Salary",
  "Freelance",
  "Rental",
  "Dividends",
  "Business",
  "Pension",
  "Other",
];
const EXPENSE_CATEGORIES = [
  "Housing",
  "Food",
  "Transport",
  "Healthcare",
  "Entertainment",
  "Utilities",
  "Education",
  "Insurance",
  "Other",
];

// ─── Create Entry Dialog ───────────────────────────────────────────────────

interface CreateEntryDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  type: EditMode;
  draft: CashFlowEntryDraft;
  setDraft: React.Dispatch<React.SetStateAction<CashFlowEntryDraft>>;
  onSubmit: () => void;
}

export function CreateEntryDialog({
  open,
  onOpenChange,
  type,
  draft,
  setDraft,
  onSubmit,
}: CreateEntryDialogProps) {
  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const userCurrency = useFinancialStore((s) => s.user?.currency ?? "USD");
  // Local UI state for the ongoing/fixed-duration toggle. Source of truth
  // is still draft.endDate (empty = ongoing).
  const [durationMode, setDurationMode] = React.useState<"ongoing" | "fixed">(
    draft.endDate ? "fixed" : "ongoing",
  );
  const [durationMonths, setDurationMonths] = React.useState<string>(() =>
    draft.endDate
      ? String(monthsBetweenISO(draft.startDate, draft.endDate))
      : "",
  );

  // Keep endDate in sync when mode / months / startDate / recurringType change.
  React.useEffect(() => {
    if (draft.recurringType !== "monthly" || durationMode === "ongoing") {
      if (draft.endDate !== "") setDraft((d) => ({ ...d, endDate: "" }));
      return;
    }
    const n = Number(durationMonths);
    const next =
      Number.isFinite(n) && n > 0 ? addMonthsISO(draft.startDate, n) : "";
    if (draft.endDate !== next) setDraft((d) => ({ ...d, endDate: next }));
  }, [
    durationMode,
    durationMonths,
    draft.startDate,
    draft.recurringType,
    draft.endDate,
    setDraft,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === "income" ? (
              <Banknote className="h-4 w-4 text-emerald-500" />
            ) : (
              <CreditCard className="h-4 w-4 text-red-400" />
            )}
            {type === "income" ? "Add income source" : "Add expense"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select
              value={draft.category}
              onValueChange={(v) => setDraft((d) => ({ ...d, category: v }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c.toLowerCase()}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="entry-name">Description</Label>
            <Input
              id="entry-name"
              placeholder={
                type === "income" ? "e.g. Monthly salary" : "e.g. Rent payment"
              }
              value={draft.name}
              onChange={(e) =>
                setDraft((d) => ({ ...d, name: e.target.value }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="entry-amount">Amount</Label>
            <CurrencyInput
              id="entry-amount"
              currency={userCurrency}
              value={draft.amount.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
              onChange={(v) =>
                setDraft((d) => ({ ...d, amount: v.replace(/[^\d]/g, "") }))
              }
              placeholder="0"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="entry-date" className="flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
              Start date
              <span className="text-xs text-muted-foreground font-normal">
                (you can backdate this)
              </span>
            </Label>
            <DateInput
              id="entry-date"
              value={draft.startDate}
              onChange={(v) => setDraft((d) => ({ ...d, startDate: v }))}
              placeholder="Pick a start date"
              toDate={new Date()}
              fromYear={2000}
              toYear={new Date().getFullYear()}
            />
            {draft.startDate &&
              draft.startDate < new Date().toISOString().split("T")[0] && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  This entry will be backdated - historical months will be
                  updated.
                </p>
              )}
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="flex items-center gap-1.5">
              <Repeat2 className="h-3.5 w-3.5 text-muted-foreground" />
              Frequency
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {(["monthly", "one-time"] as RecurringType[]).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() =>
                    setDraft((d) => ({ ...d, recurringType: opt }))
                  }
                  className={`rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                    draft.recurringType === opt
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted bg-background text-muted-foreground hover:border-foreground/30"
                  }`}
                >
                  {opt === "monthly" ? "Recurring Monthly" : "One-time"}
                </button>
              ))}
            </div>

            {draft.recurringType === "monthly" && (
              <div className="space-y-3">
                <Label className="flex items-center gap-1.5">
                  <TimerReset className="h-3.5 w-3.5 text-muted-foreground" />
                  Duration
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["ongoing", "fixed"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setDurationMode(mode)}
                      className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                        durationMode === mode
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-muted bg-background text-muted-foreground hover:border-foreground/30"
                      }`}
                    >
                      {mode === "ongoing" ? "Ongoing" : "Fixed duration"}
                    </button>
                  ))}
                </div>
                {durationMode === "fixed" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="entry-duration" className="text-xs">
                      Number of months
                    </Label>
                    <Input
                      id="entry-duration"
                      type="text"
                      inputMode="numeric"
                      placeholder="e.g. 12"
                      value={durationMonths}
                      onChange={(e) =>
                        setDurationMonths(e.target.value.replace(/[^\d]/g, ""))
                      }
                    />
                    {draft.endDate && (
                      <p className="text-xs text-muted-foreground">
                        Ends on {draft.endDate}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div
              className={`rounded-md px-3 py-2 text-xs ${
                draft.recurringType === "monthly"
                  ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {draft.recurringType === "monthly"
                ? durationMode === "ongoing"
                  ? "Repeats every month from the start date, indefinitely."
                  : durationMonths
                    ? `Repeats every month for ${durationMonths} month(s).`
                    : "Enter the number of months it will recur for."
                : "Appears once in the selected month only."}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!draft.name.trim() || !draft.amount}
          >
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Entry Dialog ─────────────────────────────────────────────────────

interface EditEntryDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  type: EditMode;
  name: string;
  amount: string;
  setAmount: (v: string) => void;
  onSubmit: () => void;
}

export function EditEntryDialog({
  open,
  onOpenChange,
  type,
  name,
  amount,
  setAmount,
  onSubmit,
}: EditEntryDialogProps) {
  const userCurrency = useFinancialStore((s) => s.user?.currency ?? "USD");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === "income" ? (
              <Banknote className="h-4 w-4 text-emerald-500" />
            ) : (
              <CreditCard className="h-4 w-4 text-red-400" />
            )}
            Edit {type === "income" ? "income source" : "expense"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm font-medium">{name}</p>
          <div className="space-y-1.5">
            <Label htmlFor="edit-amount">Amount</Label>
            <CurrencyInput
              id="edit-amount"
              currency={userCurrency}
              value={amount.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
              onChange={(v) => setAmount(v.replace(/[^\d]/g, ""))}
              placeholder="0"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={!amount}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
