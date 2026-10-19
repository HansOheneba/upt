"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  CreditCard,
  Plus,
  Trash2,
  Pencil,
  TrendingDown,
  Banknote,
  AlertTriangle,
  Building2,
  ArrowRight,
} from "lucide-react";

import { KpiStrip, type KpiItem } from "@/components/dashboard/kpi-strip";
import { dashboardTheme } from "@/lib/dashboard-theme";
import { DashboardEmptyState } from "@/components/dashboard/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
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

import {
  finiteNumber,
  formatCurrency,
  type Liability,
  type LiabilityType,
  type Property,
  type PropertyMortgage,
} from "@/lib/client-data";
import { useFinancialStore } from "@/store/financialStore";
import { usePageData } from "@/hooks/usePageData";
import { Skeleton } from "@/components/ui/skeleton";
import { useTourDemoData } from "@/hooks/useTourDemo";
import { TOUR_DEMO_LIABILITIES } from "@/lib/tour-demo-data";
import {
  createLiability,
  updateLiability as apiUpdateLiability,
  deleteLiability,
} from "@/lib/dashboard-api";
import { toast } from "sonner";
import { blockRecordCreate } from "@/lib/record-limits";
import { DateInput } from "@/components/ui/date-input";
import { MoneyInput } from "@/components/ui/money-input";

// ─── Helpers ───────────────────────────────────────────────────────────────

function ordinalSuffix(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID();
  return `id_${Math.random().toString(16).slice(2)}`;
}

/** Returns the currency symbol for the current locale's default currency. */
function getCurrencySymbol(): string {
  try {
    return (
      new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" })
        .formatToParts(0)
        .find((p) => p.type === "currency")?.value ?? "$"
    );
  } catch {
    return "$";
  }
}

// Mortgages are excluded - they are managed directly on properties.
const LIABILITY_TYPE_OPTIONS: { value: LiabilityType; label: string }[] = [
  { value: "credit_card", label: "Credit Card" },
  { value: "personal_loan", label: "Personal Loan" },
  { value: "auto_loan", label: "Auto Loan" },
  { value: "student_loan", label: "Student Loan" },
  { value: "other", label: "Other" },
];

function liabilityTypeLabel(type: LiabilityType): string {
  return LIABILITY_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

// ─── Property-linked mortgage entry ──────────────────────────────────────

interface PropertyLinkedMortgage {
  property: Property;
  mortgage: PropertyMortgage;
}

// ─── Draft type ────────────────────────────────────────────────────────────

interface LiabilityDraft {
  name: string;
  lender: string;
  type: LiabilityType | "";
  balance: string;
  interestRatePct: string;
  minPaymentMonthly: string;
  dueDay: string;
  originalLoanAmount: string;
  expectedPayoffDate: string;
}

const DEFAULT_DRAFT: LiabilityDraft = {
  name: "",
  lender: "",
  type: "",
  balance: "",
  interestRatePct: "",
  minPaymentMonthly: "",
  dueDay: "",
  originalLoanAmount: "",
  expectedPayoffDate: "",
};

// ─── Liability Form Dialog ────────────────────────────────────────────────

interface LiabilityDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  draft: LiabilityDraft;
  setDraft: React.Dispatch<React.SetStateAction<LiabilityDraft>>;
  onSubmit: () => void;
  isEdit: boolean;
  currencySymbol: string;
}

function LiabilityDialog({
  open,
  onOpenChange,
  draft,
  setDraft,
  onSubmit,
  isEdit,
  currencySymbol,
}: LiabilityDialogProps) {
  const canSave = !!draft.name.trim() && !!draft.type && !!draft.balance;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-red-400" />
            {isEdit ? "Edit liability" : "Add liability"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="lib-name">Name</Label>
            <Input
              id="lib-name"
              placeholder="e.g. Home mortgage"
              value={draft.name}
              onChange={(e) =>
                setDraft((d) => ({ ...d, name: e.target.value }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lib-lender">Lender or provider</Label>
            <Input
              id="lib-lender"
              placeholder="e.g. Barclays, Standard Bank, Stanbic"
              value={draft.lender}
              onChange={(e) =>
                setDraft((d) => ({ ...d, lender: e.target.value }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select
              value={draft.type}
              onValueChange={(v) =>
                setDraft((d) => ({ ...d, type: v as LiabilityType }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type…" />
              </SelectTrigger>
              <SelectContent>
                {LIABILITY_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-0.5">
              <Building2 className="h-3 w-3" />
              Mortgages are managed directly on each property.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lib-balance">Outstanding balance</Label>
              <MoneyInput
                id="lib-balance"
                value={draft.balance}
                onChange={(v) => setDraft((d) => ({ ...d, balance: v }))}
                currencySymbol={currencySymbol}
                placeholder="0"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lib-rate">Interest rate (%)</Label>
              <Input
                id="lib-rate"
                type="number"
                placeholder="0"
                min="0"
                max="100"
                step="0.01"
                value={draft.interestRatePct}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, interestRatePct: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lib-payment">Min monthly payment</Label>
              <MoneyInput
                id="lib-payment"
                value={draft.minPaymentMonthly}
                onChange={(v) =>
                  setDraft((d) => ({ ...d, minPaymentMonthly: v }))
                }
                currencySymbol={currencySymbol}
                placeholder="0"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lib-due">Due day of month</Label>
              <Input
                id="lib-due"
                type="number"
                min="1"
                max="31"
                placeholder="1-31"
                value={draft.dueDay}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") {
                    setDraft((d) => ({ ...d, dueDay: "" }));
                    return;
                  }
                  const n = Math.min(31, Math.max(1, parseInt(v, 10)));
                  setDraft((d) => ({
                    ...d,
                    dueDay: isNaN(n) ? "" : String(n),
                  }));
                }}
              />
              <p className="text-xs text-muted-foreground">Day 1 - 31</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lib-original">
                Original loan{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <MoneyInput
                id="lib-original"
                value={draft.originalLoanAmount}
                onChange={(v) =>
                  setDraft((d) => ({ ...d, originalLoanAmount: v }))
                }
                currencySymbol={currencySymbol}
                placeholder="0"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lib-payoff">
                Payoff date{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <DateInput
                id="lib-payoff"
                value={draft.expectedPayoffDate}
                onChange={(v) =>
                  setDraft((d) => ({ ...d, expectedPayoffDate: v }))
                }
                placeholder="Pick a date"
                fromDate={new Date()}
                fromYear={new Date().getFullYear()}
                toYear={new Date().getFullYear() + 40}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={!canSave}>
            {isEdit ? "Save changes" : "Add liability"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Confirmation Dialog ────────────────────────────────────────────

function DeleteConfirmDialog({
  open,
  name,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  name: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-red-500" />
            Remove liability
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground py-2">
          Are you sure you want to remove{" "}
          <span className="font-semibold text-foreground">{name}</span>? This
          cannot be undone.
        </p>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Liability Row ────────────────────────────────────────────────────────

function LiabilityRow({
  liability,
  totalDebt,
  onEdit,
  onDelete,
}: {
  liability: Liability;
  totalDebt: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const pct = totalDebt > 0 ? (liability.balance / totalDebt) * 100 : 0;
  const annualInterest = (liability.balance * liability.interestRatePct) / 100;

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-semibold truncate">{liability.name}</p>
              <Badge variant="secondary" className="text-[10px] shrink-0">
                {liabilityTypeLabel(liability.type)}
              </Badge>
            </div>
            {liability.lender && (
              <p className="text-xs text-muted-foreground mb-1">
                {liability.lender}
              </p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mt-2">
              <div>
                <p className="text-muted-foreground">Balance</p>
                <p className="font-semibold tabular-nums text-red-500">
                  {formatCurrency(liability.balance)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Rate</p>
                <p className="font-medium tabular-nums">
                  {finiteNumber(liability.interestRatePct).toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Min payment</p>
                <p className="font-medium tabular-nums">
                  {formatCurrency(liability.minPaymentMonthly)}/mo
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Annual interest</p>
                <p className="font-medium tabular-nums text-amber-600">
                  {formatCurrency(annualInterest)}
                </p>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>{pct.toFixed(1)}% of total debt</span>
                {liability.dueDay && (
                  <span>Due on the {ordinalSuffix(liability.dueDay)}</span>
                )}
              </div>
              <Progress value={pct} className="h-1.5" />
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onEdit}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-red-400 hover:text-red-600"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Property-linked mortgage card (read-only) ────────────────────────────

function PropertyMortgageCard({
  entry,
  totalDebt,
  onGoToProperty,
}: {
  entry: PropertyLinkedMortgage;
  totalDebt: number;
  onGoToProperty: () => void;
}) {
  const { property, mortgage } = entry;
  const pct = totalDebt > 0 ? (mortgage.balance / totalDebt) * 100 : 0;
  const annualInterest = (mortgage.balance * mortgage.interest_rate_pct) / 100;

  return (
    <Card className="bg-muted/30">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <p className="text-sm font-semibold truncate">
                {property.name} - Mortgage
              </p>
              <Badge
                variant="outline"
                className="text-[10px] shrink-0 gap-1 text-muted-foreground border-muted-foreground/30 bg-background"
              >
                <Building2 className="h-2.5 w-2.5" />
                Managed via Property
              </Badge>
            </div>
            {mortgage.lender && (
              <p className="text-xs text-muted-foreground mb-1">
                {mortgage.lender}
              </p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mt-2">
              <div>
                <p className="text-muted-foreground">Balance</p>
                <p className="font-semibold tabular-nums text-red-500">
                  {formatCurrency(mortgage.balance)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Rate</p>
                <p className="font-medium tabular-nums">
                  {finiteNumber(mortgage.interest_rate_pct).toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Min payment</p>
                <p className="font-medium tabular-nums">
                  {formatCurrency(mortgage.min_payment_monthly)}/mo
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Annual interest</p>
                <p className="font-medium tabular-nums text-amber-600">
                  {formatCurrency(annualInterest)}
                </p>
              </div>
            </div>
            {(mortgage.original_loan_amount ||
              mortgage.expected_payoff_date) && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mt-2">
                {mortgage.original_loan_amount && (
                  <div>
                    <p className="text-muted-foreground">Original loan</p>
                    <p className="font-medium tabular-nums">
                      {formatCurrency(mortgage.original_loan_amount)}
                    </p>
                  </div>
                )}
                {mortgage.expected_payoff_date && (
                  <div>
                    <p className="text-muted-foreground">Expected payoff</p>
                    <p className="font-medium">
                      {new Date(
                        mortgage.expected_payoff_date,
                      ).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>
                )}
              </div>
            )}
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>{pct.toFixed(1)}% of total debt</span>
                {mortgage.due_day && (
                  <span>Due on the {ordinalSuffix(mortgage.due_day)}</span>
                )}
              </div>
              <Progress value={pct} className="h-1.5" />
            </div>
          </div>
          <div className="shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={onGoToProperty}
            >
              Edit in Properties
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function LiabilitiesPage() {
  const router = useRouter();
  const { loading: isLoading } = usePageData("liabilities");
  const storeAddLiability = useFinancialStore((s) => s.addLiability);
  const storeUpdateLiability = useFinancialStore((s) => s.updateLiability);
  const storeRemoveLiability = useFinancialStore((s) => s.removeLiability);
  const storeLiabilities = useFinancialStore((s) => s.liabilities);
  const storeProperties = useFinancialStore((s) => s.propertyAssets);

  const currencySymbol = React.useMemo(() => getCurrencySymbol(), []);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<LiabilityDraft>(DEFAULT_DRAFT);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = React.useState<{
    id: string;
    name: string;
  } | null>(null);

  // ── Property-linked mortgages derived from store ──────────────────────────
  const propertyMortgages = React.useMemo<PropertyLinkedMortgage[]>(
    () =>
      storeProperties
        .filter((p) => p.is_active && p.mortgage)
        .map((p) => ({ property: p, mortgage: p.mortgage! })),
    [storeProperties],
  );

  const { data: liabilitiesDisplay, isDemo: tourDemoLiab } = useTourDemoData(
    storeLiabilities,
    TOUR_DEMO_LIABILITIES,
  );
  const propertyMortgagesDisplay = tourDemoLiab ? [] : propertyMortgages;

  // ── Combined totals (standalone + property mortgages) ────────────────────
  const totalDebt = React.useMemo(
    () =>
      liabilitiesDisplay.reduce((s, l) => s + l.balance, 0) +
      propertyMortgagesDisplay.reduce((s, e) => s + e.mortgage.balance, 0),
    [liabilitiesDisplay, propertyMortgagesDisplay],
  );

  const totalMinPayments = React.useMemo(
    () =>
      liabilitiesDisplay.reduce(
        (s, l) => s + finiteNumber(l.minPaymentMonthly),
        0,
      ) +
      propertyMortgagesDisplay.reduce(
        (s, e) => s + finiteNumber(e.mortgage.min_payment_monthly),
        0,
      ),
    [liabilitiesDisplay, propertyMortgagesDisplay],
  );

  const avgRate = React.useMemo(() => {
    if (totalDebt === 0) return 0;
    const standaloneWeighted = liabilitiesDisplay.reduce(
      (s, l) => s + l.interestRatePct * l.balance,
      0,
    );
    const propWeighted = propertyMortgagesDisplay.reduce(
      (s, e) => s + e.mortgage.interest_rate_pct * e.mortgage.balance,
      0,
    );
    return (standaloneWeighted + propWeighted) / totalDebt;
  }, [liabilitiesDisplay, propertyMortgagesDisplay, totalDebt]);

  const annualInterestCost = (totalDebt * avgRate) / 100;

  // ── Debt by lender breakdown - named lenders only ────────────────────────
  const debtByLender = React.useMemo(() => {
    const map = new Map<string, number>();
    liabilitiesDisplay.forEach((l) => {
      const key = l.lender?.trim();
      if (!key) return;
      map.set(key, (map.get(key) ?? 0) + l.balance);
    });
    propertyMortgagesDisplay.forEach((e) => {
      const key = e.mortgage.lender?.trim();
      if (!key) return;
      map.set(key, (map.get(key) ?? 0) + e.mortgage.balance);
    });
    return [...map.entries()]
      .map(([lender, balance]) => ({ lender, balance }))
      .sort((a, b) => b.balance - a.balance);
  }, [liabilitiesDisplay, propertyMortgagesDisplay]);

  const totalEntries =
    liabilitiesDisplay.length + propertyMortgagesDisplay.length;

  const kpiItems: KpiItem[] = [
    {
      label: "Total Debt",
      value: formatCurrency(totalDebt),
      subline: `${totalEntries} liabilit${totalEntries === 1 ? "y" : "ies"}`,
      tone: "neutral",
    },
    {
      label: "Min Monthly Payments",
      value: formatCurrency(totalMinPayments),
      subline: "Required monthly outflow",
      tone: totalMinPayments > 0 ? "warning" : "neutral",
    },
    {
      label: "Weighted Avg Rate",
      value: `${finiteNumber(avgRate).toFixed(2)}%`,
      subline: "Interest across all debts",
      tone: avgRate > 15 ? "danger" : avgRate > 8 ? "warning" : "good",
    },
    {
      label: "Annual Interest Cost",
      value: formatCurrency(annualInterestCost),
      subline: "Estimated yearly interest",
      tone: annualInterestCost > 5000 ? "danger" : "warning",
    },
  ];

  function openCreate() {
    if (blockRecordCreate("liabilities")) return;
    setEditingId(null);
    setDraft(DEFAULT_DRAFT);
    setDialogOpen(true);
  }

  function openEdit(liability: Liability) {
    setEditingId(liability.id);
    setDraft({
      name: liability.name,
      lender: liability.lender ?? "",
      type: liability.type,
      balance: String(liability.balance),
      interestRatePct: String(liability.interestRatePct),
      minPaymentMonthly: String(liability.minPaymentMonthly),
      dueDay: liability.dueDay !== undefined ? String(liability.dueDay) : "",
      originalLoanAmount: liability.originalLoanAmount
        ? String(liability.originalLoanAmount)
        : "",
      expectedPayoffDate: liability.expectedPayoffDate ?? "",
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!draft.name.trim() || !draft.type) return;

    const now = new Date().toISOString();

    if (editingId) {
      // Optimistic: update store immediately
      const patch = {
        name: draft.name.trim(),
        lender: draft.lender.trim() || undefined,
        type: draft.type as LiabilityType,
        balance: Number(draft.balance) || 0,
        interestRatePct: Number(draft.interestRatePct) || 0,
        minPaymentMonthly: Number(draft.minPaymentMonthly) || 0,
        dueDay: draft.dueDay ? Number(draft.dueDay) : undefined,
        originalLoanAmount: draft.originalLoanAmount
          ? Number(draft.originalLoanAmount)
          : undefined,
        expectedPayoffDate: draft.expectedPayoffDate || undefined,
      };
      storeUpdateLiability(editingId, patch);
      apiUpdateLiability({ id: editingId, ...patch })
        .then((updated) => {
          console.log("[LiabilitiesPage] updateLiability response:", updated);
          storeUpdateLiability(updated.id, updated);
          toast.success("Liability updated");
        })
        .catch((err) => {
          console.error("[LiabilitiesPage] updateLiability error:", err);
          toast.error("Failed to update liability");
        });
    } else {
      if (blockRecordCreate("liabilities")) return;
      const payload = {
        name: draft.name.trim(),
        type: draft.type as LiabilityType,
        balance: Number(draft.balance) || 0,
        interestRatePct: Number(draft.interestRatePct) || 0,
        minPaymentMonthly: Number(draft.minPaymentMonthly) || 0,
        lender: draft.lender.trim() || undefined,
        dueDay: draft.dueDay ? Number(draft.dueDay) : undefined,
        originalLoanAmount: draft.originalLoanAmount
          ? Number(draft.originalLoanAmount)
          : undefined,
        expectedPayoffDate: draft.expectedPayoffDate || undefined,
      };
      // Optimistic: add a temp entry to store while API call is in-flight
      const tempId = uid();
      storeAddLiability({
        id: tempId,
        name: payload.name,
        lender: payload.lender,
        type: payload.type,
        balance: payload.balance,
        interestRatePct: payload.interestRatePct,
        minPaymentMonthly: payload.minPaymentMonthly,
        dueDay: payload.dueDay,
        originalLoanAmount: payload.originalLoanAmount,
        expectedPayoffDate: payload.expectedPayoffDate,
        updatedAt: now,
      });
      createLiability(payload)
        .then((created) => {
          console.log("[LiabilitiesPage] createLiability response:", created);
          // Replace temp entry with real one from API
          storeRemoveLiability(tempId);
          storeAddLiability(created);
          toast.success("Liability added");
        })
        .catch((err) => {
          console.error("[LiabilitiesPage] createLiability error:", err);
          storeRemoveLiability(tempId);
          toast.error(
            err instanceof Error && err.message
              ? err.message
              : "Failed to add liability",
          );
        });
    }

    setDialogOpen(false);
    setDraft(DEFAULT_DRAFT);
    setEditingId(null);
  }

  function requestDelete(id: string, name: string) {
    setDeleteConfirm({ id, name });
  }

  function confirmDelete() {
    if (deleteConfirm) {
      const { id, name } = deleteConfirm;
      storeRemoveLiability(id);
      setDeleteConfirm(null);
      deleteLiability(id)
        .then(() => {
          console.log("[LiabilitiesPage] deleteLiability success for id:", id);
          toast.success(`"${name}" removed`);
        })
        .catch((err) => {
          console.error("[LiabilitiesPage] deleteLiability error:", err);
          toast.error("Failed to delete liability");
        });
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen"
    >
      <div className={dashboardTheme.pageContainer}>
        {/* Header - always visible */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">
              Liabilities
            </h1>
            <p className="text-sm text-muted-foreground">
              All your debts and obligations in one place.
            </p>
          </div>
          <Button size="sm" className="gap-1.5" data-tour="primary-action" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" /> Add liability
          </Button>
        </div>

        {isLoading ? (
          <>
            {/* KPI strip skeleton - labels visible, values loading */}
            <KpiStrip items={kpiItems} cols={4} loading />
            {/* Liability card skeletons */}
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))}
            </div>
          </>
        ) : totalEntries === 0 ? (
          <DashboardEmptyState
            icon={<TrendingDown className="h-8 w-8 text-muted-foreground" />}
            title="Track what you owe"
            description={
              <>
                Liabilities tracks what you owe - credit cards, student loans,
                personal loans, business debt, anything with a balance. Add one
                or two and you&apos;ll see total debt, monthly obligations,
                interest exposure, and a complete net worth picture.
              </>
            }
            action={{
              label: "Add liability",
              icon: <Plus className="h-3.5 w-3.5" />,
              onClick: openCreate,
            }}
          />
        ) : (
          <>
            {/* KPI Strip */}
            <motion.div
              initial={{ opacity: 0, transform: "translateY(8px)" }}
              animate={{ opacity: 1, transform: "translateY(0px)" }}
              transition={{ delay: 0.1 }}
            >
              <KpiStrip items={kpiItems} cols={4} />
            </motion.div>

            {/* Debt by lender */}
            {debtByLender.length >= 2 && (
              <motion.div
                initial={{ opacity: 0, transform: "translateY(8px)" }}
                animate={{ opacity: 1, transform: "translateY(0px)" }}
                transition={{ delay: 0.13 }}
              >
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">
                      Debt by lender
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    {debtByLender.map(({ lender, balance }) => (
                      <div
                        key={lender}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-muted-foreground">{lender}</span>
                        <span className="font-semibold tabular-nums text-red-500">
                          {formatCurrency(balance)}
                        </span>
                      </div>
                    ))}
                    <Separator className="mt-1" />
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">Total</span>
                      <span className="font-bold tabular-nums text-red-500">
                        {formatCurrency(totalDebt)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* High rate warning */}
            {avgRate > 15 && (
              <motion.div
                initial={{ opacity: 0, transform: "translateY(8px)" }}
                animate={{ opacity: 1, transform: "translateY(0px)" }}
                transition={{ delay: 0.15 }}
                className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3"
              >
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                    High average interest rate
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your weighted average rate is{" "}
                    <span className="font-medium">{avgRate.toFixed(2)}%</span>.
                    Consider consolidating high-interest debts to reduce your
                    annual interest cost of{" "}
                    <span className="font-medium">
                      {formatCurrency(annualInterestCost)}
                    </span>
                    .
                  </p>
                </div>
              </motion.div>
            )}

            {/* Liability list */}
            <motion.div
              initial={{ opacity: 0, transform: "translateY(8px)" }}
              animate={{ opacity: 1, transform: "translateY(0px)" }}
              transition={{ delay: 0.2 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <p className={dashboardTheme.sectionLabelWide}>
                  All liabilities
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Banknote className="h-3.5 w-3.5" />
                  <span>Total: {formatCurrency(totalDebt)}</span>
                </div>
              </div>

              {/* Standalone liabilities */}
              {liabilitiesDisplay.length === 0 &&
                propertyMortgagesDisplay.length > 0 && (
                  <p className="text-xs text-muted-foreground py-1">
                    No standalone liabilities added. Mortgages are managed via
                    your properties.
                  </p>
                )}
              {liabilitiesDisplay.map((l) => (
                <LiabilityRow
                  key={l.id}
                  liability={l}
                  totalDebt={totalDebt}
                  onEdit={() => openEdit(l)}
                  onDelete={() => requestDelete(l.id, l.name)}
                />
              ))}

              {/* Property-linked mortgages (read-only) */}
              {propertyMortgagesDisplay.map((entry) => (
                <PropertyMortgageCard
                  key={entry.property.property_id}
                  entry={entry}
                  totalDebt={totalDebt}
                  onGoToProperty={() =>
                    router.push(
                      `/dashboard/properties/${entry.property.property_id}/edit?focus=mortgage`,
                    )
                  }
                />
              ))}

              <Separator />

              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold capitalize">Total Debt</p>
                      <p className="text-xs text-muted-foreground">
                        Minimum monthly obligations:{" "}
                        {formatCurrency(totalMinPayments)}/mo
                      </p>
                    </div>
                    <p className="text-lg font-bold tabular-nums text-red-500">
                      {formatCurrency(totalDebt)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </div>

      <LiabilityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        draft={draft}
        setDraft={setDraft}
        onSubmit={handleSubmit}
        isEdit={!!editingId}
        currencySymbol={currencySymbol}
      />

      <DeleteConfirmDialog
        open={!!deleteConfirm}
        name={deleteConfirm?.name ?? ""}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={confirmDelete}
      />
    </motion.div>
  );
}
