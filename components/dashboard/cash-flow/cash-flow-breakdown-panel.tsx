"use client";

import * as React from "react";
import { Plus, Banknote, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, type CashFlowRow, type ExpenseCategory } from "@/lib/client-data";
import { useUserCurrency } from "@/hooks/useUserCurrency";
import { CashFlowEntryList } from "./cash-flow-entry-list";
import type { MoneyRow } from "./row-item";
import type { EditMode } from "./delete-confirm-dialog";

type CashFlowBreakdownPanelProps = {
  income: CashFlowRow[];
  expenses: ExpenseCategory[];
  totalIncome: number;
  totalExpenses: number;
  loading?: boolean;
  onAdd: (type: EditMode) => void;
  onEdit: (type: EditMode, row: CashFlowRow | ExpenseCategory) => void;
  onDelete: (type: EditMode, row: MoneyRow) => void;
};

function EntryPanel({
  type,
  rows,
  total,
  loading,
  onAdd,
  onEdit,
  onDelete,
}: {
  type: EditMode;
  rows: MoneyRow[];
  total: number;
  loading?: boolean;
  onAdd: () => void;
  onEdit: (row: MoneyRow) => void;
  onDelete: (row: MoneyRow) => void;
}) {
  const currency = useUserCurrency();
  const isIncome = type === "income";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isIncome ? (
            <Banknote className="h-4 w-4 shrink-0 text-emerald-500" />
          ) : (
            <CreditCard className="h-4 w-4 shrink-0 text-red-400" />
          )}
          <span className="text-sm font-medium">
            {isIncome ? "Income" : "Expenses"}
          </span>
          <Badge variant="secondary" className="tabular-nums">
            {rows.length}
          </Badge>
        </div>
        <Badge
          variant="secondary"
          className={`tabular-nums ${isIncome ? "text-emerald-600" : "text-red-500"}`}
        >
          {formatCurrency(total, currency)}
        </Badge>
      </div>

      <CashFlowEntryList
        rows={rows}
        total={total}
        type={type}
        loading={loading}
        onEdit={onEdit}
        onDelete={onDelete}
        onAdd={onAdd}
      />

      {rows.length > 0 ? (
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5 text-xs"
          data-tour={isIncome ? "primary-action" : undefined}
          onClick={onAdd}
        >
          <Plus className="h-3.5 w-3.5" />
          Add {isIncome ? "income source" : "expense"}
        </Button>
      ) : null}
    </div>
  );
}

export function CashFlowBreakdownPanel({
  income,
  expenses,
  totalIncome,
  totalExpenses,
  loading,
  onAdd,
  onEdit,
  onDelete,
}: CashFlowBreakdownPanelProps) {
  const incomeRows: MoneyRow[] = income.map((r) => ({
    id: r.id,
    name: r.name,
    amount: r.amount,
  }));
  const expenseRows: MoneyRow[] = expenses.map((r) => ({
    id: r.id,
    name: r.name,
    amount: r.amount,
  }));

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Income & Expenses</CardTitle>
        <p className="text-xs text-muted-foreground">
          Where your monthly money comes from and goes. Tap a row to edit.
        </p>
      </CardHeader>
      <CardContent>
        {/* Mobile + tablet: one list at a time */}
        <div className="lg:hidden">
          <Tabs defaultValue="expenses" className="gap-3">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="income" className="text-xs">
                Income ({income.length})
              </TabsTrigger>
              <TabsTrigger value="expenses" className="text-xs">
                Expenses ({expenses.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="income" className="mt-3">
              <EntryPanel
                type="income"
                rows={incomeRows}
                total={totalIncome}
                loading={loading}
                onAdd={() => onAdd("income")}
                onEdit={(row) => {
                  const full = income.find((r) => r.id === row.id);
                  if (full) onEdit("income", full);
                }}
                onDelete={(row) => onDelete("income", row)}
              />
            </TabsContent>
            <TabsContent value="expenses" className="mt-3">
              <EntryPanel
                type="expense"
                rows={expenseRows}
                total={totalExpenses}
                loading={loading}
                onAdd={() => onAdd("expense")}
                onEdit={(row) => {
                  const full = expenses.find((r) => r.id === row.id);
                  if (full) onEdit("expense", full);
                }}
                onDelete={(row) => onDelete("expense", row)}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Desktop: side by side */}
        <div className="hidden lg:grid lg:grid-cols-2 lg:gap-6">
          <EntryPanel
            type="income"
            rows={incomeRows}
            total={totalIncome}
            loading={loading}
            onAdd={() => onAdd("income")}
            onEdit={(row) => {
              const full = income.find((r) => r.id === row.id);
              if (full) onEdit("income", full);
            }}
            onDelete={(row) => onDelete("income", row)}
          />
          <div className="border-l pl-6">
            <EntryPanel
              type="expense"
              rows={expenseRows}
              total={totalExpenses}
              loading={loading}
              onAdd={() => onAdd("expense")}
              onEdit={(row) => {
                const full = expenses.find((r) => r.id === row.id);
                if (full) onEdit("expense", full);
              }}
              onDelete={(row) => onDelete("expense", row)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
