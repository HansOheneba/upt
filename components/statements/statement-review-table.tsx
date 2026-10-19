"use client";

import { useSyncExternalStore, type KeyboardEvent } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
} from "@/lib/cash-flow/categories";
import type { DisplayCurrency } from "@/lib/format";
import { categoryLabel } from "@/lib/statements/categories";
import type {
  StatementTransaction,
  StatementTransactionType,
} from "@/lib/statements/types";
import { cn } from "@/lib/utils";

import {
  confidenceLabel,
  formatReviewDate,
  formatStatementMoney,
} from "./statement-review-format";

export type ReviewEdit = {
  id: string;
  field: "date" | "description" | "amount" | "type" | "category";
} | null;

export type TransactionPatch = Partial<
  Pick<
    StatementTransaction,
    "date" | "description" | "amount" | "type" | "category" | "excluded"
  >
>;

type StatementReviewTableProps = {
  rows: StatementTransaction[];
  currency: DisplayCurrency;
  editing: ReviewEdit;
  pageIncluded: boolean;
  onEdit: (edit: ReviewEdit) => void;
  onChange: (id: string, patch: TransactionPatch) => void;
  onToggle: (id: string, included: boolean) => void;
  onTogglePage: (included: boolean) => void;
};

const fieldClassName =
  "h-8 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const quietClassName =
  "max-w-full rounded-md px-1.5 py-1 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50";

function useDesktopLayout(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia("(min-width: 768px)");
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(min-width: 768px)").matches,
    () => true,
  );
}

function blurOnEscape(event: KeyboardEvent<HTMLElement>) {
  if (event.key === "Escape") {
    event.currentTarget.blur();
  }
}

function commitOnEnter(event: KeyboardEvent<HTMLElement>) {
  if (event.key === "Enter" || event.key === "Escape") {
    event.currentTarget.blur();
  }
}

function typeLabel(type: StatementTransactionType): string {
  if (type === "income") {
    return "Income";
  }

  if (type === "expense") {
    return "Expense";
  }

  return "Transfer";
}

function amountClassName(type: StatementTransactionType): string {
  if (type === "income") {
    return "text-success";
  }

  if (type === "transfer") {
    return "text-muted-foreground";
  }

  return "text-foreground";
}

function formatAmount(transaction: StatementTransaction, currency: DisplayCurrency): string {
  const money = formatStatementMoney(transaction.amount, currency);

  if (transaction.type === "income") {
    return `+${money}`;
  }

  if (transaction.type === "expense") {
    return `−${money}`;
  }

  return money;
}

function categoryName(transaction: StatementTransaction): string {
  if (transaction.type === "transfer") {
    return "Transfer";
  }

  return categoryLabel(transaction.type, transaction.category);
}

function ConfidenceMark({ transaction }: { transaction: StatementTransaction }) {
  const label = confidenceLabel(transaction.confidence);

  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
      <span
        className={cn(
          "text-xs",
          label === "Needs review" && "font-medium text-warning",
          label === "Medium" && "text-foreground",
          label === "High" && "text-muted-foreground",
        )}
      >
        {label}
      </span>
      {transaction.duplicate ? (
        <span className="text-xs text-warning">Duplicate</span>
      ) : null}
    </span>
  );
}

type FieldProps = {
  transaction: StatementTransaction;
  active: boolean;
  onEdit: (edit: ReviewEdit) => void;
  onChange: (id: string, patch: TransactionPatch) => void;
};

function DateField({ transaction, active, onEdit, onChange }: FieldProps) {
  if (active) {
    return (
      <Input
        type="date"
        autoFocus
        value={transaction.date}
        aria-label={`Date for ${transaction.description}`}
        className={cn(fieldClassName, "w-36")}
        onChange={(event) => onChange(transaction.id, { date: event.target.value })}
        onBlur={() => onEdit(null)}
        onKeyDown={commitOnEnter}
      />
    );
  }

  return (
    <button
      type="button"
      className={cn(quietClassName, "text-sm whitespace-nowrap")}
      aria-label={`Edit date for ${transaction.description}`}
      onClick={() => onEdit({ id: transaction.id, field: "date" })}
    >
      {formatReviewDate(transaction.date)}
    </button>
  );
}

function DescriptionField({ transaction, active, onEdit, onChange }: FieldProps) {
  if (active) {
    return (
      <Input
        autoFocus
        value={transaction.description}
        aria-label="Description"
        className={cn(fieldClassName, "w-full min-w-48")}
        onChange={(event) =>
          onChange(transaction.id, { description: event.target.value })
        }
        onBlur={() => onEdit(null)}
        onKeyDown={commitOnEnter}
      />
    );
  }

  return (
    <button
      type="button"
      className={cn(
        quietClassName,
        "block w-full text-sm font-medium whitespace-normal",
        transaction.excluded ? "text-muted-foreground" : "text-foreground",
      )}
      aria-label={`Edit description ${transaction.description}`}
      onClick={() => onEdit({ id: transaction.id, field: "description" })}
    >
      {transaction.description || "Add a description"}
      {transaction.excluded ? (
        <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
          Excluded
        </span>
      ) : null}
    </button>
  );
}

function AmountField({
  transaction,
  currency,
  active,
  onEdit,
  onChange,
}: FieldProps & { currency: DisplayCurrency }) {
  if (active) {
    return (
      <Input
        type="number"
        autoFocus
        min={0}
        step="0.01"
        inputMode="decimal"
        value={transaction.amount}
        aria-label={`Amount for ${transaction.description}`}
        className={cn(fieldClassName, "w-28 text-right tabular-nums")}
        onChange={(event) => {
          const amount = Number(event.target.value);
          onChange(transaction.id, {
            amount: Number.isFinite(amount) ? amount : 0,
          });
        }}
        onBlur={() => onEdit(null)}
        onKeyDown={commitOnEnter}
      />
    );
  }

  return (
    <button
      type="button"
      className={cn(
        quietClassName,
        "ml-auto block w-fit text-right text-sm font-medium tabular-nums",
        amountClassName(transaction.type),
      )}
      aria-label={`Edit amount for ${transaction.description}`}
      onClick={() => onEdit({ id: transaction.id, field: "amount" })}
    >
      {formatAmount(transaction, currency)}
    </button>
  );
}

function TypeField({ transaction, active, onEdit, onChange }: FieldProps) {
  if (active) {
    return (
      <select
        autoFocus
        className={cn(fieldClassName, "w-full min-w-28")}
        value={transaction.type}
        aria-label={`Type for ${transaction.description}`}
        onChange={(event) =>
          onChange(transaction.id, {
            type: event.target.value as StatementTransactionType,
          })
        }
        onBlur={() => onEdit(null)}
        onKeyDown={blurOnEscape}
      >
        <option value="income">Income</option>
        <option value="expense">Expense</option>
        <option value="transfer">Transfer</option>
      </select>
    );
  }

  return (
    <button
      type="button"
      className={cn(quietClassName, "text-sm", amountClassName(transaction.type))}
      aria-label={`Edit type for ${transaction.description}`}
      onClick={() => onEdit({ id: transaction.id, field: "type" })}
    >
      {typeLabel(transaction.type)}
    </button>
  );
}

function CategoryField({ transaction, active, onEdit, onChange }: FieldProps) {
  if (transaction.type === "transfer") {
    return <span className="px-1.5 py-1 text-sm text-muted-foreground">Transfer</span>;
  }

  if (active) {
    const options =
      transaction.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const known = options.some((option) => option.value === transaction.category);

    return (
      <select
        autoFocus
        className={cn(fieldClassName, "w-full min-w-32")}
        value={transaction.category}
        aria-label={`Category for ${transaction.description}`}
        onChange={(event) =>
          onChange(transaction.id, { category: event.target.value })
        }
        onBlur={() => onEdit(null)}
        onKeyDown={blurOnEscape}
      >
        {known ? null : (
          <option value={transaction.category}>{categoryName(transaction)}</option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <button
      type="button"
      className={cn(quietClassName, "text-sm text-foreground")}
      aria-label={`Edit category for ${transaction.description}`}
      onClick={() => onEdit({ id: transaction.id, field: "category" })}
    >
      {categoryName(transaction)}
    </button>
  );
}

function IncludeControl({
  transaction,
  onToggle,
}: {
  transaction: StatementTransaction;
  onToggle: (id: string, included: boolean) => void;
}) {
  return (
    <Checkbox
      checked={!transaction.excluded}
      onCheckedChange={(value) => onToggle(transaction.id, value === true)}
      aria-label={`Include ${transaction.description}`}
    />
  );
}

function rowClassName(transaction: StatementTransaction): string {
  return cn(
    transaction.confidence < 0.7 && !transaction.excluded && "bg-surface-warning/40",
    transaction.excluded && "opacity-70",
  );
}

export function StatementReviewTable({
  rows,
  currency,
  editing,
  pageIncluded,
  onEdit,
  onChange,
  onToggle,
  onTogglePage,
}: StatementReviewTableProps) {
  const desktop = useDesktopLayout();
  const isActive = (id: string, field: NonNullable<ReviewEdit>["field"]) =>
    editing?.id === id && editing.field === field;

  if (!desktop) {
    return (
      <div className="rounded-xl bg-card ring-1 ring-foreground/10">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
          <Checkbox
            checked={pageIncluded}
            disabled={rows.length === 0}
            onCheckedChange={(value) => onTogglePage(value === true)}
            aria-label="Include transactions on this page"
          />
          <span className="text-xs text-muted-foreground">Include</span>
        </div>
        <ul>
          {rows.map((transaction) => (
            <li
              key={transaction.id}
              className={cn(
                "border-b border-border px-3 py-3 last:border-b-0",
                rowClassName(transaction),
              )}
            >
              <div className="flex items-start gap-3">
                <div className="pt-1">
                  <IncludeControl transaction={transaction} onToggle={onToggle} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <DescriptionField
                      transaction={transaction}
                      active={isActive(transaction.id, "description")}
                      onEdit={onEdit}
                      onChange={onChange}
                    />
                    <AmountField
                      transaction={transaction}
                      currency={currency}
                      active={isActive(transaction.id, "amount")}
                      onEdit={onEdit}
                      onChange={onChange}
                    />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <DateField
                      transaction={transaction}
                      active={isActive(transaction.id, "date")}
                      onEdit={onEdit}
                      onChange={onChange}
                    />
                    <TypeField
                      transaction={transaction}
                      active={isActive(transaction.id, "type")}
                      onEdit={onEdit}
                      onChange={onChange}
                    />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <CategoryField
                      transaction={transaction}
                      active={isActive(transaction.id, "category")}
                      onEdit={onEdit}
                      onChange={onChange}
                    />
                    <ConfidenceMark transaction={transaction} />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <Table>
        <caption className="sr-only">Extracted transactions</caption>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-28 pl-3">
              <span className="inline-flex items-center gap-2">
                <Checkbox
                  checked={pageIncluded}
                  disabled={rows.length === 0}
                  onCheckedChange={(value) => onTogglePage(value === true)}
                  aria-label="Include transactions on this page"
                />
                Include
              </span>
            </TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Transaction</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Confidence</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((transaction) => (
            <TableRow key={transaction.id} className={rowClassName(transaction)}>
              <TableCell className="pl-3">
                <IncludeControl transaction={transaction} onToggle={onToggle} />
              </TableCell>
              <TableCell>
                <DateField
                  transaction={transaction}
                  active={isActive(transaction.id, "date")}
                  onEdit={onEdit}
                  onChange={onChange}
                />
              </TableCell>
              <TableCell className="max-w-xs whitespace-normal">
                <DescriptionField
                  transaction={transaction}
                  active={isActive(transaction.id, "description")}
                  onEdit={onEdit}
                  onChange={onChange}
                />
              </TableCell>
              <TableCell className="text-right">
                <AmountField
                  transaction={transaction}
                  currency={currency}
                  active={isActive(transaction.id, "amount")}
                  onEdit={onEdit}
                  onChange={onChange}
                />
              </TableCell>
              <TableCell>
                <TypeField
                  transaction={transaction}
                  active={isActive(transaction.id, "type")}
                  onEdit={onEdit}
                  onChange={onChange}
                />
              </TableCell>
              <TableCell>
                <CategoryField
                  transaction={transaction}
                  active={isActive(transaction.id, "category")}
                  onEdit={onEdit}
                  onChange={onChange}
                />
              </TableCell>
              <TableCell>
                <ConfidenceMark transaction={transaction} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
