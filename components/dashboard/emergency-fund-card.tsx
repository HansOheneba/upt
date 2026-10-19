"use client";

import * as React from "react";
import { ShieldCheck, ShieldAlert, Shield, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/client-data";

const STORAGE_LABELS: Record<string, string> = {
  savings_account: "Savings Account",
  checking_account: "Checking Account",
  money_market: "Money Market Account",
  fixed_deposit: "Fixed Deposit / CD",
  physical_cash: "Physical Cash",
  other: "Other",
};

interface StorageTip {
  tone: "good" | "warning" | "info";
  text: string;
}

const STORAGE_TIPS: Record<string, StorageTip> = {
  savings_account: {
    tone: "good",
    text: "Good choice. Easy to access and earns interest. Keep it separate from your everyday account so you are not tempted to dip in.",
  },
  money_market: {
    tone: "good",
    text: "Good. Money market accounts typically offer higher yields than savings while staying liquid. Good fit for emergency funds.",
  },
  fixed_deposit: {
    tone: "info",
    text: "Decent for building a target, but early withdrawal penalties can reduce your balance in a real emergency. Keep at least 1 month in a more liquid account.",
  },
  physical_cash: {
    tone: "warning",
    text: "Physical cash earns nothing and is vulnerable to theft or loss. Moving it to a high-yield savings account keeps it just as accessible but safer and growing.",
  },
  checking_account: {
    tone: "warning",
    text: "Checking accounts earn very little interest. A dedicated savings account keeps your emergency fund separate and earns more without giving up accessibility.",
  },
  other: {
    tone: "info",
    text: "Make sure your emergency fund is somewhere you can access within 24-48 hours without penalties. Liquidity matters most here.",
  },
};

interface EmergencyFundCardProps {
  currentBalance: number;
  targetBalance: number;
  runwayMonths: number;
  targetMonths: number;
  monthlyExpenses: number;
  funded: boolean;
  shortfallOrSurplus: number;
  storageLocation?: string | null;
}

export function EmergencyFundCard({
  currentBalance,
  targetBalance,
  runwayMonths,
  targetMonths,
  monthlyExpenses,
  funded,
  shortfallOrSurplus,
  storageLocation,
}: EmergencyFundCardProps) {
  const pct =
    targetBalance > 0
      ? Math.min(100, (currentBalance / targetBalance) * 100)
      : 0;

  const level: "good" | "warning" | "danger" =
    currentBalance === 0
      ? "danger"
      : funded
        ? "good"
        : runwayMonths >= 3
          ? "warning"
          : "danger";

  const colors = {
    good: "text-emerald-500",
    warning: "text-amber-500",
    danger: "text-red-500",
  };
  const bgColors = {
    good: "bg-emerald-50",
    warning: "bg-amber-50",
    danger: "bg-red-50",
  };
  const borderColors = {
    good: "border-emerald-100",
    warning: "border-amber-100",
    danger: "border-red-100",
  };
  const progressColors = {
    good: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-red-500",
  };

  const storageTipToneColors = {
    good: {
      bg: "bg-emerald-50",
      border: "border-emerald-100",
      text: "text-emerald-800",
      sub: "text-emerald-700",
    },
    warning: {
      bg: "bg-amber-50",
      border: "border-amber-100",
      text: "text-amber-800",
      sub: "text-amber-700",
    },
    info: {
      bg: "bg-blue-50",
      border: "border-blue-100",
      text: "text-blue-800",
      sub: "text-blue-700",
    },
  };

  const Icon =
    level === "good" ? ShieldCheck : level === "warning" ? Shield : ShieldAlert;

  function getInsight(): { title: string; body: string } {
    if (currentBalance === 0) {
      return {
        title: "Start an emergency fund",
        body:
          monthlyExpenses > 0
            ? `You are spending ${formatCurrency(monthlyExpenses)}/month. Building just one month of coverage (${formatCurrency(monthlyExpenses)}) is a meaningful first step.`
            : "Add your expenses to see how much runway you need.",
      };
    }
    if (runwayMonths < 1) {
      return {
        title: "Less than a month of coverage.",
        body:
          monthlyExpenses > 0
            ? `You spend ${formatCurrency(monthlyExpenses)}/month. Getting to ${formatCurrency(monthlyExpenses)} gives you a full month of runway.`
            : "Your balance covers less than a month of expenses.",
      };
    }
    if (runwayMonths < 3) {
      return {
        title: `About ${runwayMonths.toFixed(1)} months of runway.`,
        body:
          monthlyExpenses > 0
            ? `You spend ${formatCurrency(monthlyExpenses)}/month. Aim for 3 months (${formatCurrency(monthlyExpenses * 3)}) before investing aggressively.`
            : `${Math.round(pct)}% toward your ${targetMonths}-month target.`,
      };
    }
    if (!funded) {
      return {
        title: `${runwayMonths.toFixed(1)} months covered - ${Math.round(pct)}% of your goal.`,
        body:
          monthlyExpenses > 0
            ? `You spend ${formatCurrency(monthlyExpenses)}/month. You need ${formatCurrency(Math.abs(shortfallOrSurplus))} more to reach your ${targetMonths}-month target.`
            : `${formatCurrency(Math.abs(shortfallOrSurplus))} away from your ${targetMonths}-month target.`,
      };
    }
    return {
      title: `Fully funded - ${runwayMonths.toFixed(1)} months of runway.`,
      body:
        shortfallOrSurplus > 0
          ? `You have ${formatCurrency(shortfallOrSurplus)} above your ${targetMonths}-month target. Any excess could be working harder in investments.`
          : `Your ${formatCurrency(currentBalance)} covers your ${targetMonths}-month target. Keep it liquid and accessible.`,
    };
  }

  const insight = getInsight();
  const storageTip = storageLocation ? STORAGE_TIPS[storageLocation] : null;

  return (
    <Card>
      <CardContent className="pt-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`p-1.5 rounded-md shrink-0 ${bgColors[level]}`}>
              <Icon className={`h-4 w-4 ${colors[level]}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground leading-tight">
                Emergency Fund
              </p>
              <p className="text-xs text-muted-foreground">
                {monthlyExpenses > 0
                  ? `${formatCurrency(monthlyExpenses)}/mo baseline`
                  : "Add expenses to calculate runway"}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className={`text-2xl font-bold tabular-nums ${colors[level]}`}>
              {currentBalance === 0
                ? "None"
                : runwayMonths > 9
                  ? "9+ mo"
                  : `${runwayMonths.toFixed(1)}mo`}
            </p>
            <p className="text-xs text-muted-foreground">runway</p>
          </div>
        </div>

        {/* Progress */}
        {currentBalance > 0 && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatCurrency(currentBalance)} saved</span>
              <span>
                Target: {formatCurrency(targetBalance)} ({targetMonths}mo)
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={`h-full rounded-full ${progressColors[level]}`}
              />
            </div>
            <p className="text-xs text-muted-foreground text-right">
              {Math.round(pct)}% of goal
            </p>
          </div>
        )}

        {/* Storage location */}
        <div className="flex items-center gap-2 text-xs">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">Stored in:</span>
          <span className="font-medium text-foreground">
            {storageLocation
              ? (STORAGE_LABELS[storageLocation] ?? storageLocation)
              : "Not specified"}
          </span>
        </div>

        <Separator />

        {/* Runway insight */}
        <div
          className={`rounded-lg px-3 py-2.5 ${bgColors[level]} border ${borderColors[level]}`}
        >
          <p className={`text-xs font-semibold ${colors[level]}`}>
            {insight.title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{insight.body}</p>
        </div>

        {/* Storage tip */}
        {storageTip && (
          <div
            className={`rounded-lg px-3 py-2.5 border ${storageTipToneColors[storageTip.tone].bg} ${storageTipToneColors[storageTip.tone].border}`}
          >
            <p
              className={`text-xs font-semibold ${storageTipToneColors[storageTip.tone].text}`}
            >
              {storageLocation === "physical_cash"
                ? "Physical cash has risk."
                : storageLocation === "checking_account"
                  ? "Checking accounts are low-yield."
                  : storageLocation === "fixed_deposit"
                    ? "Watch for early withdrawal penalties."
                    : storageLocation === "savings_account"
                      ? "Good storage choice."
                      : storageLocation === "money_market"
                        ? "Solid choice for liquidity."
                        : "Storage location note."}
            </p>
            <p
              className={`text-xs mt-0.5 ${storageTipToneColors[storageTip.tone].sub}`}
            >
              {storageTip.text}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
