import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import {
  DashCard,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/dash-card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/client-data";
import type { ApiCashFlowSummary } from "@/lib/dashboard-api";

type InsightEntry = {
  key: string;
  title: string;
  body: string;
  colorClass: string;
  icon: React.ElementType;
};

function deriveCards(summary: ApiCashFlowSummary): InsightEntry[] {
  const cards: InsightEntry[] = [];
  const inputs = summary.insights_inputs;
  const averages = summary.averages;
  const ef = summary.emergency_fund;
  const mom = summary.month_over_month;

  if (!inputs) return cards;

  if (inputs.savingsRate >= 30) {
    cards.push({
      key: "sr",
      title: "Saving hard",
      body: `You are saving ${inputs.savingsRate.toFixed(0)}% of income. That is well above the 20% benchmark. ${formatCurrency(inputs.surplus)} surplus each month adds up fast.`,
      colorClass: "border-emerald-200/60 bg-emerald-50/60",
      icon: TrendingUp,
    });
  } else if (inputs.savingsRate >= 20) {
    cards.push({
      key: "sr",
      title: "Solid savings rate",
      body: `${inputs.savingsRate.toFixed(0)}% of income saved. Above the 20% line. Push toward 30% if you want to move faster.`,
      colorClass: "border-sky-200/60 bg-sky-50/60",
      icon: TrendingUp,
    });
  } else if (inputs.savingsRate > 0) {
    cards.push({
      key: "sr",
      title: "Savings rate is low",
      body: `${inputs.savingsRate.toFixed(0)}% saved, below the 20% benchmark. Cut spending by about ${formatCurrency(inputs.totalIncome * 0.2 - inputs.surplus)}/mo to hit it.`,
      colorClass: "border-amber-200/60 bg-amber-50/60",
      icon: AlertCircle,
    });
  }

  if (inputs.burnRate <= 30) {
    cards.push({
      key: "burn",
      title: "Spending is under control",
      body: `You spend ${inputs.burnRate.toFixed(0)}% of income. Plenty of room for goals or investing.`,
      colorClass: "border-emerald-200/60 bg-emerald-50/60",
      icon: ShieldCheck,
    });
  } else if (inputs.burnRate >= 80) {
    cards.push({
      key: "burn",
      title: "Most of your income goes out",
      body: `${inputs.burnRate.toFixed(0)}% of income spent. One bad month and there is no cushion. Trim discretionary costs first.`,
      colorClass: "border-red-200/60 bg-red-50/60",
      icon: AlertCircle,
    });
  }

  if (mom && mom.incomeChange_pct > 5) {
    cards.push({
      key: "mom-inc",
      title: "Income jumped this month",
      body: `Up ${mom.incomeChange_pct.toFixed(1)}% vs last month. Send some of the extra to savings before it becomes normal spending.`,
      colorClass: "border-emerald-200/60 bg-emerald-50/60",
      icon: TrendingUp,
    });
  } else if (mom && mom.expenseChange_pct > 10) {
    cards.push({
      key: "mom-exp",
      title: "Spending spiked",
      body: `Expenses up ${mom.expenseChange_pct.toFixed(1)}% vs last month. Check whether it was a one-off or something recurring.`,
      colorClass: "border-amber-200/60 bg-amber-50/60",
      icon: TrendingDown,
    });
  }

  if (ef) {
    if (ef.funded_pct >= 100) {
      cards.push({
        key: "ef",
        title: "Emergency fund is full",
        body: `${formatCurrency(ef.current_cash_balance)} covers ${ef.runway_months.toFixed(1)} months of expenses. Target was ${ef.target_months} months.`,
        colorClass: "border-emerald-200/60 bg-emerald-50/60",
        icon: ShieldCheck,
      });
    } else if (ef.shortfall > 0) {
      cards.push({
        key: "ef",
        title: "Emergency fund is short",
        body: `${formatCurrency(ef.shortfall)} below your ${ef.target_months}-month target. Current balance covers ${ef.runway_months.toFixed(1)} months.`,
        colorClass: "border-amber-200/60 bg-amber-50/60",
        icon: AlertCircle,
      });
    }
  }

  if (averages && averages.based_on_months >= 2) {
    const diff = inputs.surplus - averages.avgMonthlySurplus;
    if (Math.abs(diff) > 100) {
      cards.push({
        key: "avg",
        title:
          diff >= 0
            ? "Better month than usual"
            : "Worse month than usual",
        body: `Surplus is ${formatCurrency(inputs.surplus)} this month, ${formatCurrency(Math.abs(diff))} ${diff >= 0 ? "above" : "below"} your ${averages.based_on_months}-month average of ${formatCurrency(averages.avgMonthlySurplus)}.`,
        colorClass:
          diff >= 0
            ? "border-sky-200/60 bg-sky-50/60"
            : "border-amber-200/60 bg-amber-50/60",
        icon: diff >= 0 ? TrendingUp : TrendingDown,
      });
    }
  }

  return cards;
}

export function CelereyInsights({
  summary,
}: {
  summary: ApiCashFlowSummary | null;
}) {
  const cards = summary ? deriveCards(summary) : [];

  if (!summary) return null;

  return (
    <DashCard className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Celerey Cash Flow Insights</CardTitle>
        <Badge variant="secondary" className="gap-1">
          <Lightbulb className="h-3.5 w-3.5" />
          Insights
        </Badge>
      </CardHeader>

      <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {cards.length === 0 ? (
          <p className="text-sm text-muted-foreground col-span-full">
            Add income and expenses to see analysis here.
          </p>
        ) : (
          cards.map((card) => (
            <div
              key={card.key}
              className={`rounded-xl border p-4 ${card.colorClass}`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <card.icon className="h-3.5 w-3.5 opacity-70" />
                <div className="text-sm font-semibold capitalize">{card.title}</div>
              </div>
              <div className="text-sm text-muted-foreground">{card.body}</div>
            </div>
          ))
        )}
      </CardContent>
    </DashCard>
  );
}
