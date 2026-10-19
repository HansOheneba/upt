"use client";

import * as React from "react";
import {
  Plus,
  Pencil,
  BarChart3,
  Banknote,
  CreditCard,
  ChevronDown,
  FileSpreadsheet,
} from "lucide-react";
import { motion } from "framer-motion";

import { KpiStrip, type KpiItem } from "@/components/dashboard/kpi-strip";
import { dashboardTheme } from "@/lib/dashboard-theme";
import { DashboardSectionLabelWide } from "@/components/dashboard/section-label";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  DeleteConfirmDialog,
  type EditMode,
  type DeleteTarget,
} from "@/components/dashboard/cash-flow/delete-confirm-dialog";
import { CashFlowChart } from "@/components/dashboard/cash-flow/cash-flow-chart";
import { EmergencyFundCard } from "@/components/dashboard/emergency-fund-card";
import {
  InsightCard,
  deriveInsights,
  momChange,
} from "@/components/dashboard/cash-flow/insight-card";
import { SurplusHistoryChart } from "@/components/dashboard/cash-flow/surplus-history-chart";
import { GoalsCostWidget } from "@/components/dashboard/cash-flow/goals-cost-widget";
import { CashFlowBreakdownPanel } from "@/components/dashboard/cash-flow/cash-flow-breakdown-panel";
import type { MoneyRow } from "@/components/dashboard/cash-flow/row-item";
import { SettingsDialog } from "@/components/dashboard/cash-flow/settings-dialog";
import { NetWorthCard } from "@/components/dashboard/cash-flow/net-worth-card";
import {
  CreateEntryDialog,
  EditEntryDialog,
} from "@/components/dashboard/cash-flow/entry-dialog";
import { ImportStatementDialog } from "@/components/statements/import-statement-dialog";
import { loadStatementContributionsAction } from "@/app/actions/statement-import";
import { mergeStatementHistory } from "@/lib/statements/aggregate";

import {
  calculateNetWorth,
  getNetWorthFx,
  selectEmergencyFundMetrics,
  formatCurrency,
  type CashFlowRow,
  type ExpenseCategory,
  type CashFlowEntryDraft,
  type CashFlowSettings,
  type FinancialDomainData,
} from "@/lib/client-data";
import { useFinancialStore } from "@/store/financialStore";
import {
  createIncome,
  updateIncome,
  deleteIncome,
  createExpense,
  updateExpense,
  deleteExpense,
  updateEmergencyFund,
} from "@/lib/dashboard-api";
import { usePageData } from "@/hooks/usePageData";
import { toast } from "sonner";

// ─── Helpers ───────────────────────────────────────────────────────────────

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID();
  return `id_${Math.random().toString(16).slice(2)}`;
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function CashFlowPage() {
  const { loading } = usePageData("cash-flow");

  // ── Store subscriptions ───────────────────────────────────────────────────
  const storeHoldings = useFinancialStore((s) => s.holdings);
  const storePropertyAssets = useFinancialStore((s) => s.propertyAssets);
  const storeAccounts = useFinancialStore((s) => s.accounts);
  const storeGoals = useFinancialStore((s) => s.goals);
  const storeEmergencyFund = useFinancialStore((s) => s.emergencyFund);
  const storeCashFlowHistory = useFinancialStore((s) => s.cashFlowHistory);
  const cashFlowSummary = useFinancialStore((s) => s.cashFlowSummary);

  const income = useFinancialStore((s) => s.incomeRows);
  const expenses = useFinancialStore((s) => s.expenseCategories);
  const pageCurrency = useFinancialStore((s) => s.user?.currency ?? "USD");
  const storeUser = useFinancialStore((s) => s.user);
  const [statementContributions, setStatementContributions] = React.useState<
    Array<{
      month: string;
      income: number;
      expenses: number;
      surplus: number;
      source?: "statement" | "plan";
      statementIncome?: number;
      statementExpenses?: number;
    }>
  >([]);

  React.useEffect(() => {
    const clientId = storeUser?.user_id;
    if (!clientId) {
      return;
    }

    let cancelled = false;
    loadStatementContributionsAction(clientId).then((points) => {
      if (!cancelled) {
        setStatementContributions(points);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [storeUser?.user_id]);

  const chartHistory = React.useMemo(
    () =>
      mergeStatementHistory(
        storeCashFlowHistory.map((point) => ({
          month: point.month,
          income: point.income,
          expenses: point.expenses,
          surplus: point.surplus ?? point.income - point.expenses,
          source: point.source,
          statementIncome: point.statementIncome,
          statementExpenses: point.statementExpenses,
        })),
        statementContributions,
      ),
    [storeCashFlowHistory, statementContributions],
  );
  const netWorthFx = React.useMemo(() => getNetWorthFx(storeUser), [storeUser]);
  const settings = React.useMemo<CashFlowSettings>(
    () => ({
      emergencyFundMonths: storeEmergencyFund.targetMonths,
      currentCashBalance: storeEmergencyFund.currentCashBalance,
    }),
    [storeEmergencyFund],
  );

  // ── Dialog state ──────────────────────────────────────────────────────────

  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);

  // Create dialog
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createType, setCreateType] = React.useState<EditMode>("income");
  const defaultDraft: CashFlowEntryDraft = {
    name: "",
    amount: "",
    recurringType: "monthly",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    category: "",
  };
  const [createDraft, setCreateDraft] =
    React.useState<CashFlowEntryDraft>(defaultDraft);

  // Edit dialog (amount-only)
  const [editOpen, setEditOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<{
    type: EditMode;
    id: string;
    name: string;
  } | null>(null);
  const [editAmount, setEditAmount] = React.useState("");

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<DeleteTarget | null>(
    null,
  );

  // ── Computed ──────────────────────────────────────────────────────────────

  const totalIncome = React.useMemo(
    () => sum(income.map((i) => i.amount)),
    [income],
  );
  const totalExpenses = React.useMemo(
    () => sum(expenses.map((e) => e.amount)),
    [expenses],
  );
  const surplus = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (surplus / totalIncome) * 100 : 0;

  const netWorth = React.useMemo(
    () =>
      calculateNetWorth(
        storeHoldings,
        [],
        storePropertyAssets.filter((p) => p.is_active),
        income,
        expenses,
        [],
        netWorthFx,
      ),
    [storeHoldings, storePropertyAssets, income, expenses, netWorthFx],
  );

  const incMom = momChange(storeCashFlowHistory, "income");
  const expMom = momChange(storeCashFlowHistory, "expenses");

  const insights = React.useMemo(() => {
    const apiIn = cashFlowSummary?.insights_inputs;
    return deriveInsights(
      apiIn?.totalIncome ?? totalIncome,
      apiIn?.totalExpenses ?? totalExpenses,
      apiIn?.savingsRate ?? savingsRate,
      storeCashFlowHistory,
    );
  }, [
    cashFlowSummary,
    totalIncome,
    totalExpenses,
    savingsRate,
    storeCashFlowHistory,
  ]);

  const financialData: FinancialDomainData = React.useMemo(
    () => ({
      accounts: storeAccounts,
      liabilities: [],
      propertyAssets: storePropertyAssets.map((p) => ({
        id: p.property_id,
        name: p.name,
        value: p.market_value,
        updatedAt: p.updated_at,
      })),
      portfolioPerformance: [],
      allocation: [],
      taxProfile: {
        effectiveTaxRatePct: 0,
        marginalTaxRatePct: 0,
        filingStatus: "single" as const,
        updatedAt: new Date().toISOString(),
      },
      emergencyFund: storeEmergencyFund,
      insurancePolicies: [],
      incomeRows: income,
      expenseCategories: expenses,
      freshness: [],
      retirement: {
        currentAge: 0,
        retirementAge: 0,
        lifeExpectancy: 85,
        currentInvested: 0,
        monthlySavings: 0,
        existingPensionBalance: 0,
        monthlyPensionContribution: 0,
        expectedReturnPct: 7,
        inflationPct: 2,
        safeWithdrawalRatePct: 4,
        desiredMonthlyIncome: 0,
      },
      cashFlowHistory: storeCashFlowHistory,
    }),
    [
      storeAccounts,
      storePropertyAssets,
      storeEmergencyFund,
      income,
      expenses,
      storeCashFlowHistory,
    ],
  );

  const efMetrics = React.useMemo(
    () => selectEmergencyFundMetrics(financialData),
    [financialData],
  );

  // Prefer server-computed values when available - they use the server's
  // monthly_baseline (smoothed over time) which is more accurate than
  // the sum of the user's current expense rows.
  const ef = React.useMemo(() => {
    const c = storeEmergencyFund.computed;
    return {
      currentBalance: efMetrics.currentBalance,
      targetBalance: c?.targetAmount ?? efMetrics.targetBalance,
      runwayMonths: c?.runwayMonths ?? efMetrics.runwayMonths,
      targetMonths: efMetrics.targetMonths,
      monthlyBaseline: c?.monthlyBaseline ?? totalExpenses,
      funded: c ? c.fundedPct >= 100 : efMetrics.funded,
      shortfallOrSurplus: c
        ? c.shortfall === 0
          ? efMetrics.currentBalance -
            (c.targetAmount ?? efMetrics.targetBalance)
          : -c.shortfall
        : efMetrics.shortfallOrSurplus,
      fundedPct:
        c?.fundedPct ??
        (efMetrics.targetBalance > 0
          ? (efMetrics.currentBalance / efMetrics.targetBalance) * 100
          : 0),
    };
  }, [storeEmergencyFund.computed, efMetrics, totalExpenses]);

  const fmt = (n: number) => formatCurrency(n, pageCurrency);

  const cashFlowKpis: KpiItem[] = [
    {
      label: "Monthly Income",
      value: fmt(totalIncome),
      subline:
        incMom !== null
          ? `${incMom > 0 ? "+" : ""}${incMom.toFixed(1)}% vs last month`
          : "No prior data",
      tone: incMom !== null ? (incMom >= 0 ? "good" : "warning") : "neutral",
    },
    {
      label: "Monthly Expenses",
      value: fmt(totalExpenses),
      subline:
        expMom !== null
          ? `${expMom > 0 ? "+" : ""}${expMom.toFixed(1)}% vs last month`
          : "No prior data",
      tone: expMom !== null ? (expMom <= 0 ? "good" : "warning") : "neutral",
    },
    {
      label: "Surplus",
      value: fmt(surplus),
      subline: surplus >= 0 ? "Cash positive" : "Monthly deficit",
      tone: surplus >= 0 ? "good" : "danger",
    },
    {
      label: "Savings Rate",
      value: `${savingsRate.toFixed(1)}%`,
      subline: "Target >= 20%",
      tone: savingsRate >= 20 ? "good" : savingsRate > 0 ? "warning" : "danger",
    },
    !storeEmergencyFund.currentCashBalance
      ? {
          label: "Emergency Fund",
          value: "Not set up",
          subline: "Add a cash balance to track runway",
          tone: "neutral" as const,
        }
      : ef.monthlyBaseline === 0
        ? {
            label: "Emergency Fund",
            value: fmt(ef.currentBalance),
            subline: "Add expenses to calculate runway",
            tone: "neutral" as const,
          }
        : {
            label: "Emergency Fund",
            value:
              ef.runwayMonths > 9
                ? "9+ mo runway"
                : `${Math.round(ef.runwayMonths * 10) / 10}mo runway`,
            subline: ef.funded
              ? `${fmt(ef.currentBalance)} - target ${ef.targetMonths}mo`
              : `${fmt(Math.abs(ef.shortfallOrSurplus))} below ${ef.targetMonths}mo target`,
            tone: ef.funded
              ? "good"
              : ef.runwayMonths >= 3
                ? "warning"
                : "danger",
          },
  ];

  // ── Dialog helpers ────────────────────────────────────────────────────────

  function openCreate(type: EditMode) {
    setCreateType(type);
    setCreateDraft({
      ...defaultDraft,
      startDate: new Date().toISOString().split("T")[0],
    });
    setCreateOpen(true);
  }

  function openEdit(type: EditMode, row: CashFlowRow | ExpenseCategory) {
    setEditTarget({ type, id: row.id, name: row.name });
    setEditAmount(String(row.amount));
    setEditOpen(true);
  }

  function requestDelete(type: EditMode, row: MoneyRow) {
    setDeleteTarget({ type, row });
    setDeleteOpen(true);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    if (deleteTarget.type === "income") {
      useFinancialStore
        .getState()
        .setIncome(income.filter((x) => x.id !== deleteTarget.row.id));
      deleteIncome(deleteTarget.row.id)
        .then(() => toast.success("Income source deleted."))
        .catch(() => toast.error("Failed to delete income source."));
    } else {
      useFinancialStore
        .getState()
        .setExpenses(expenses.filter((x) => x.id !== deleteTarget.row.id));
      deleteExpense(deleteTarget.row.id)
        .then(() => toast.success("Expense deleted."))
        .catch(() => toast.error("Failed to delete expense."));
    }
    setDeleteOpen(false);
    setDeleteTarget(null);
  }

  function submitCreate() {
    const amountNum = Number(createDraft.amount);
    if (
      !createDraft.name.trim() ||
      !Number.isFinite(amountNum) ||
      amountNum < 0
    )
      return;

    const rowId = uid();
    const today = new Date().toISOString().split("T")[0];

    if (createType === "income") {
      const newRow: CashFlowRow = {
        id: rowId,
        name: createDraft.name.trim(),
        amount: Math.round(amountNum),
        isRecurring: createDraft.recurringType !== "one-time",
        recurringType: createDraft.recurringType,
        startDate: createDraft.startDate || today,
        endDate: createDraft.endDate || undefined,
      };
      createIncome({
        name: newRow.name,
        amount: newRow.amount,
        category: createDraft.category || "Other",
        source_currency: pageCurrency,
        recurring_type: createDraft.recurringType,
        start_date: newRow.startDate ?? today,
        end_date: createDraft.endDate || null,
      })
        .then((created) => {
          if (created?.id) newRow.id = created.id;
          toast.success("Income source added.");
        })
        .catch(() => toast.error("Failed to add income source."));
      useFinancialStore.getState().setIncome([newRow, ...income]);
    } else {
      const newRow: ExpenseCategory = {
        id: rowId,
        name: createDraft.name.trim(),
        amount: Math.round(amountNum),
        essential: false,
        isRecurring: createDraft.recurringType !== "one-time",
        recurringType: createDraft.recurringType,
        startDate: createDraft.startDate || today,
        endDate: createDraft.endDate || undefined,
      };
      createExpense({
        name: newRow.name,
        amount: newRow.amount,
        category: createDraft.category || "Other",
        source_currency: pageCurrency,
        recurring_type: createDraft.recurringType,
        start_date: newRow.startDate ?? today,
        end_date: createDraft.endDate || null,
      })
        .then((created) => {
          if (created?.id) newRow.id = created.id;
          toast.success("Expense added.");
        })
        .catch(() => toast.error("Failed to add expense."));
      useFinancialStore.getState().setExpenses([newRow, ...expenses]);
    }

    setCreateOpen(false);
    setCreateDraft(defaultDraft);
  }

  function submitEdit() {
    if (!editTarget) return;
    const amountNum = Number(editAmount);
    if (!Number.isFinite(amountNum) || amountNum < 0) return;
    const rounded = Math.round(amountNum);

    if (editTarget.type === "income") {
      useFinancialStore
        .getState()
        .setIncome(
          income.map((r) =>
            r.id === editTarget.id ? { ...r, amount: rounded } : r,
          ),
        );
      updateIncome({ id: editTarget.id, amount: rounded })
        .then(() => toast.success("Income source updated."))
        .catch(() => toast.error("Failed to update income source."));
    } else {
      useFinancialStore
        .getState()
        .setExpenses(
          expenses.map((r) =>
            r.id === editTarget.id ? { ...r, amount: rounded } : r,
          ),
        );
      updateExpense({ id: editTarget.id, amount: rounded })
        .then(() => toast.success("Expense updated."))
        .catch(() => toast.error("Failed to update expense."));
    }

    setEditOpen(false);
    setEditTarget(null);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className={dashboardTheme.pageContainer}>
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">Cash Flow</h1>
            <p className="text-sm text-muted-foreground">
              Your financial pulse - income, spending, and savings patterns.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSettingsOpen(true)}
            >
              <Pencil className="mr-2 h-3.5 w-3.5" /> Edit Overview
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Add Entry
                  <ChevronDown className="h-3.5 w-3.5 ml-0.5 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                  What are you adding?
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gap-2 cursor-pointer"
                  onClick={() => openCreate("income")}
                >
                  <Banknote className="h-4 w-4 text-emerald-500" />
                  <div>
                    <p className="text-sm font-medium capitalize">Income source</p>
                    <p className="text-xs text-muted-foreground">
                      Salary, dividends, rent...
                    </p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 cursor-pointer"
                  onClick={() => openCreate("expense")}
                >
                  <CreditCard className="h-4 w-4 text-red-400" />
                  <div>
                    <p className="text-sm font-medium">Expense</p>
                    <p className="text-xs text-muted-foreground">
                      Housing, food, utilities...
                    </p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gap-2 cursor-pointer"
                  onSelect={() => setImportOpen(true)}
                >
                  <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Import statement</p>
                    <p className="text-xs text-muted-foreground">
                      CSV, Excel, or text PDF
                    </p>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* KPI Strip */}
        <motion.div
          initial={{ opacity: 0, transform: "translateY(8px)" }}
          animate={{ opacity: 1, transform: "translateY(0px)" }}
          transition={{ delay: 0.1 }}
        >
          <KpiStrip items={cashFlowKpis} cols={5} loading={loading} />
        </motion.div>

        {/* Cash Flow Chart */}
        <motion.div
          initial={{ opacity: 0, transform: "translateY(8px)" }}
          animate={{ opacity: 1, transform: "translateY(0px)" }}
          transition={{ delay: 0.15 }}
        >
          <CashFlowChart data={chartHistory} />
        </motion.div>

        {/* Overview: insights + supporting metrics (merged Analytics + Insights) */}
        <motion.div
          initial={{ opacity: 0, transform: "translateY(8px)" }}
          animate={{ opacity: 1, transform: "translateY(0px)" }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          {insights.length > 0 && (
            <div>
              <DashboardSectionLabelWide>Insights</DashboardSectionLabelWide>
              <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 snap-x snap-mandatory md:mx-0 md:grid md:grid-cols-2 md:gap-3 md:overflow-visible md:px-0 xl:grid-cols-4">
                {insights.map((ins) => (
                  <div
                    key={ins.id}
                    className="min-w-[min(100%,280px)] shrink-0 snap-start md:min-w-0"
                  >
                    <InsightCard insight={ins} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <DashboardSectionLabelWide>At a glance</DashboardSectionLabelWide>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <EmergencyFundCard
                currentBalance={ef.currentBalance}
                targetBalance={ef.targetBalance}
                runwayMonths={ef.runwayMonths}
                targetMonths={ef.targetMonths}
                monthlyExpenses={ef.monthlyBaseline}
                funded={ef.funded}
                shortfallOrSurplus={ef.shortfallOrSurplus}
                storageLocation={storeEmergencyFund.storageLocation}
              />

              <GoalsCostWidget
                goals={storeGoals}
                totalExpenses={totalExpenses}
                surplus={surplus}
              />

              <Card className="sm:col-span-2 xl:col-span-1">
                <CardContent className="pt-5">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs font-semibold capitalize">
                      Monthly surplus trend
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Last 6 months
                  </p>
                  <SurplusHistoryChart history={chartHistory} />
                </CardContent>
              </Card>
            </div>
          </div>
        </motion.div>

        {/* Income, expenses, and net worth */}
        <motion.div
          initial={{ opacity: 0, transform: "translateY(8px)" }}
          animate={{ opacity: 1, transform: "translateY(0px)" }}
          transition={{ delay: 0.3 }}
        >
          <DashboardSectionLabelWide>Your numbers</DashboardSectionLabelWide>
          <div className="grid gap-4 lg:grid-cols-5 lg:items-start pb-1">
            <div className="lg:col-span-2 order-2 lg:order-1">
              <NetWorthCard breakdown={netWorth} />
            </div>
            <div className="lg:col-span-3 order-1 lg:order-2">
              <CashFlowBreakdownPanel
                income={income}
                expenses={expenses}
                totalIncome={totalIncome}
                totalExpenses={totalExpenses}
                loading={loading}
                onAdd={openCreate}
                onEdit={openEdit}
                onDelete={requestDelete}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Dialogs */}
      <ImportStatementDialog
        clientId={storeUser?.user_id ?? ""}
        open={importOpen}
        onOpenChange={setImportOpen}
      />

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        setSettings={(s) => {
          const updated = {
            ...storeEmergencyFund,
            targetMonths: s.emergencyFundMonths,
            currentCashBalance: s.currentCashBalance,
            updatedAt: new Date().toISOString(),
          };
          useFinancialStore.getState().setEmergencyFund(updated);
          updateEmergencyFund({
            cash_balance: s.currentCashBalance,
            target_months: s.emergencyFundMonths,
          })
            .then(() => toast.success("Emergency fund settings saved."))
            .catch(() =>
              toast.error("Failed to save emergency fund settings."),
            );
        }}
      />

      <CreateEntryDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        type={createType}
        draft={createDraft}
        setDraft={setCreateDraft}
        onSubmit={submitCreate}
      />

      <EditEntryDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        type={editTarget?.type ?? "income"}
        name={editTarget?.name ?? ""}
        amount={editAmount}
        setAmount={setEditAmount}
        onSubmit={submitEdit}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        target={deleteTarget}
        onConfirm={confirmDelete}
      />
    </motion.div>
  );
}
