"use client";

import * as React from "react";
import { Flame, Droplets } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/client-data";

export function BurnRateCard({
  burn,
  income,
  expenses,
}: {
  burn: number;
  income: number;
  expenses: number;
}) {
  const level = burn > 90 ? "danger" : burn > 75 ? "warning" : "good";
  const colors = {
    good: "text-emerald-500",
    warning: "text-amber-500",
    danger: "text-red-500",
  };
  const labels = {
    good: "Healthy burn rate",
    warning: "Moderate pressure",
    danger: "High burn rate",
  };
  const progressColors = {
    good: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-red-500",
  };
  const bgColors = {
    good: "bg-emerald-50",
    warning: "bg-amber-50",
    danger: "bg-red-50",
  };

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`p-1.5 rounded-md shrink-0 ${bgColors[level]}`}>
              {level === "good" ? (
                <Droplets className={`h-4 w-4 ${colors[level]}`} />
              ) : (
                <Flame className={`h-4 w-4 ${colors[level]}`} />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground leading-tight">
                {labels[level]}
              </p>
              <p className="text-xs text-muted-foreground">
                Expense-to-income ratio
              </p>
            </div>
          </div>
          <span
            className={`text-2xl font-bold tabular-nums shrink-0 ${colors[level]}`}
          >
            {burn.toFixed(0)}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(burn, 100)}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`h-full rounded-full ${progressColors[level]}`}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
          <span>{formatCurrency(expenses)} expenses</span>
          <span>{formatCurrency(income)} income</span>
        </div>
      </CardContent>
    </Card>
  );
}
