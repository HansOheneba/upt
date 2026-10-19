"use client";

import * as React from "react";
import { MoreHorizontal, Pencil, Plus, Trash2, Banknote, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/client-data";
import { useUserCurrency } from "@/hooks/useUserCurrency";
import type { MoneyRow } from "./row-item";

const DEFAULT_VISIBLE = 5;

function sharePct(part: number, total: number): number {
  if (total <= 0) return 0;
  return (part / total) * 100;
}

export function CashFlowEntryList({
  rows,
  total,
  type,
  loading = false,
  initialVisible = DEFAULT_VISIBLE,
  onEdit,
  onDelete,
  onAdd,
}: {
  rows: MoneyRow[];
  total: number;
  type: "income" | "expense";
  loading?: boolean;
  initialVisible?: number;
  onEdit: (row: MoneyRow) => void;
  onDelete: (row: MoneyRow) => void;
  onAdd?: () => void;
}) {
  const currency = useUserCurrency();
  const [expanded, setExpanded] = React.useState(false);
  const barColor = type === "income" ? "bg-emerald-500" : "bg-red-400";
  const visibleRows = expanded ? rows : rows.slice(0, initialVisible);
  const hiddenCount = Math.max(0, rows.length - initialVisible);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        {type === "income" ? (
          <Banknote className="size-7 text-muted-foreground" />
        ) : (
          <CreditCard className="size-7 text-muted-foreground" />
        )}
        <div>
          <p className="text-sm font-medium">
            {type === "income" ? "Add an income source" : "Add an expense"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {type === "income"
              ? "Salary, business income, and other money coming in."
              : "Rent, bills, and the rest of what goes out each month."}
          </p>
        </div>
        {onAdd ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            data-tour={type === "income" ? "primary-action" : undefined}
            onClick={onAdd}
          >
            <Plus className="size-3.5" />
            {type === "income" ? "Add income" : "Add expense"}
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div
        className={
          expanded && rows.length > initialVisible
            ? "max-h-64 space-y-1 overflow-y-auto pr-1"
            : "space-y-1"
        }
      >
        {visibleRows.map((row) => {
          const pct = sharePct(row.amount, total);
          return (
            <div
              key={row.id}
              className="flex items-center gap-1.5 rounded-md px-1 py-1.5 hover:bg-muted/50"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-foreground" title={row.name}>
                    {row.name}
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {pct.toFixed(0)}%
                  </span>
                  <span className="shrink-0 font-medium tabular-nums">
                    {formatCurrency(row.amount, currency)}
                  </span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${barColor}`}
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 rounded-full"
                    aria-label={`Actions for ${row.name}`}
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => onEdit(row)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete(row)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}
      </div>

      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="pt-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {expanded
            ? "Show less"
            : `Show ${hiddenCount} more ${type === "income" ? "source" : "expense"}${hiddenCount === 1 ? "" : "s"}`}
        </button>
      )}
    </div>
  );
}
