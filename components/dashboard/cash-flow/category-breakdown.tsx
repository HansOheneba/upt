"use client";

import * as React from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { motion } from "framer-motion";
import { formatCurrency, type MoneyRow } from "@/lib/client-data";

// ─── Trend Pill ────────────────────────────────────────────────────────────

export function TrendPill({ value }: { value: number | null }) {
  if (value === null)
    return <span className="text-xs text-muted-foreground">-</span>;
  const up = value > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${up ? "text-emerald-600" : "text-red-500"}`}
    >
      {up ? (
        <ArrowUpRight className="h-3 w-3" />
      ) : (
        <ArrowDownRight className="h-3 w-3" />
      )}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

// ─── Category Breakdown ────────────────────────────────────────────────────

export function CategoryBreakdown({
  rows,
  total,
  type,
}: {
  rows: MoneyRow[];
  total: number;
  type: "income" | "expense";
}) {
  const [expanded, setExpanded] = React.useState(false);
  const visible = expanded ? rows : rows.slice(0, 4);

  return (
    <div className="space-y-2.5">
      {visible.map((r) => {
        const pct = total > 0 ? (r.amount / total) * 100 : 0;
        return (
          <div key={r.id} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground truncate max-w-40">
                {r.name}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-muted-foreground">{pct.toFixed(0)}%</span>
                <span className="font-medium tabular-nums">
                  {formatCurrency(r.amount)}
                </span>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className={`h-full rounded-full ${type === "income" ? "bg-emerald-500" : "bg-red-400"}`}
              />
            </div>
          </div>
        );
      })}
      {rows.length > 4 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" /> Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" /> +{rows.length - 4} more
            </>
          )}
        </button>
      )}
    </div>
  );
}
