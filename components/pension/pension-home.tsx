"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertCircle, Banknote, FileText, Layers, Target, Wallet } from "lucide-react";
import {
  DashCard,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/dash-card";
import { KpiStrip, type KpiItem } from "@/components/dashboard/kpi-strip";
import { DashboardEmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityList } from "@/components/pension/activity-list";
import { ValueHistoryChart } from "@/components/pension/value-history-chart";
import { PensionPage, PensionPageHeader } from "@/components/pension/page-frame";
import { PensionTargetDialog } from "@/components/pension/pension-target";
import { PortfolioAllocation } from "@/components/pension/portfolio-allocation";
import { SchemeCard } from "@/components/pension/scheme-card";
import { usePensionReady } from "@/components/pension/use-pension-ready";
import { formatGhs, formatPensionDate, memberName } from "@/lib/pension/metrics";
import {
  agreedMonthlyContributions,
  canRequestWithdrawal,
  figuresForMembership,
  personalMembership,
  recentActivity,
  summarizePortfolio,
} from "@/lib/pension/portfolio";
import { usePensionStore } from "@/store/pensionStore";

export function PensionHome() {
  const ready = usePensionReady();
  const member = usePensionStore((state) => state.member);
  const memberships = usePensionStore((state) => state.memberships);
  const contributions = usePensionStore((state) => state.contributions);
  const withdrawals = usePensionStore((state) => state.withdrawals);
  const requests = usePensionStore((state) => state.requests);
  const loadError = usePensionStore((state) => state.loadError);
  const reload = usePensionStore((state) => state.reload);
  const [targetOpen, setTargetOpen] = useState(false);

  const view = useMemo(() => {
    const portfolio = summarizePortfolio(memberships, contributions, withdrawals);
    const figures = memberships.map((membership) =>
      figuresForMembership(membership, contributions, withdrawals),
    );
    return {
      portfolio,
      figures,
      activity: recentActivity(memberships, contributions, withdrawals, requests),
      canWithdraw: canRequestWithdrawal(memberships, contributions, withdrawals),
    };
  }, [memberships, contributions, withdrawals, requests]);

  if (!ready) {
    return (
      <PensionPage>
        <OverviewLoading />
      </PensionPage>
    );
  }

  if (loadError) {
    return (
      <PensionPage>
        <PensionPageHeader
          title="Overview"
          description="Your pension savings, all in one place."
        />
        <DashboardEmptyState
          icon={<AlertCircle />}
          title="We could not load your pension"
          description="Try loading your account again."
          action={{ label: "Try again", onClick: reload }}
        />
      </PensionPage>
    );
  }

  if (!member) {
    return (
      <PensionPage>
        <PensionPageHeader
          title="Overview"
          description="Your pension savings, all in one place."
        />
        <DashboardEmptyState
          icon={<FileText />}
          title="Open your pension"
          description="Your schemes, contributions, and statements appear here once a membership is open."
          action={{ label: "Open an account", href: "/onboarding" }}
        />
      </PensionPage>
    );
  }

  const greeting = memberName(member) || "Your pension";
  const personal = personalMembership(memberships);
  const personalValue = personal
    ? (view.figures.find((row) => row.membership.id === personal.id)?.value ?? null)
    : null;
  const monthly = agreedMonthlyContributions(memberships);
  const targetPot = personal?.targetPot ?? 0;
  const hasTarget = targetPot > 0;
  const targetProgress =
    hasTarget && personalValue != null
      ? Math.min(100, Math.round((personalValue / targetPot) * 100))
      : null;
  const summary: KpiItem[] = [
    {
      label: "Total pension value",
      value: view.portfolio.total != null ? formatGhs(view.portfolio.total, 2) : "Unavailable",
      subline:
        view.portfolio.unpricedActiveCount > 0
          ? `${view.portfolio.unpricedActiveCount} active ${view.portfolio.unpricedActiveCount === 1 ? "scheme has" : "schemes have"} no unit price`
          : view.portfolio.updatedAt
            ? `Latest unit price ${formatPensionDate(view.portfolio.updatedAt)}`
            : "Active schemes with a unit price",
      accent: "blue",
      icon: <Wallet aria-hidden className="size-4" />,
    },
  ];
  if (personal) {
    const age = personal.retirementAge ?? 0;
    summary.push({
      label: "Pension target",
      value: hasTarget ? formatGhs(targetPot, 2) : "Not set",
      subline: hasTarget
        ? [age > 0 ? `By age ${age}` : null, targetProgress != null ? `${targetProgress}% saved` : null]
            .filter(Boolean)
            .join(" · ")
        : "Set the amount and the age you plan to retire.",
      accent: "purple",
      progress: targetProgress ?? undefined,
      icon: <Target aria-hidden className="size-4" />,
      action: (
        <button
          type="button"
          className="shrink-0 text-xs font-medium text-[var(--brand-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => setTargetOpen(true)}
        >
          {hasTarget ? "Edit" : "Set target"}
        </button>
      ),
    });
  }
  summary.push({
    label: "Active schemes",
    value: String(view.portfolio.activeCount),
    subline:
      memberships.some((row) => row.status === "closed")
        ? "Closed schemes are not included"
        : "Open on your account",
    accent: "green",
    icon: <Layers aria-hidden className="size-4" />,
  });
  if (monthly.total != null) {
    summary.push({
      label: "Agreed monthly",
      value: formatGhs(monthly.total, 2),
      subline:
        monthly.omitted > 0
          ? `${monthly.omitted} active ${monthly.omitted === 1 ? "scheme has" : "schemes have"} no agreed amount`
          : "Scheduled amounts. Not payments received.",
      accent: "orange",
      icon: <Banknote aria-hidden className="size-4" />,
    });
  }
  const summaryCols = Math.min(4, Math.max(2, summary.length)) as 2 | 3 | 4;
  const showAllocation = view.portfolio.allocations.length > 1 && (view.portfolio.total ?? 0) > 0;

  return (
    <PensionPage>
      <PensionPageHeader
        title={greeting}
        description="Your pension savings, all in one place."
        action={
          <>
            <Button type="button" variant="outline" asChild>
              <Link href="/dashboard/statement">Statements</Link>
            </Button>
            {view.canWithdraw ? (
              <Button type="button" asChild>
                <Link href="/dashboard/withdrawals">Request a withdrawal</Link>
              </Button>
            ) : null}
          </>
        }
      />

      {memberships.length === 0 ? (
        <DashboardEmptyState
          icon={<Layers />}
          title="No scheme memberships"
          description="Your pension schemes appear here once a membership is open on your account."
          action={{ label: "Open an account", href: "/onboarding" }}
        />
      ) : (
        <>
          <KpiStrip cols={summaryCols} items={summary} />
          {showAllocation ? (
            <section className="rounded-xl border border-border bg-card p-4">
              <PortfolioAllocation slices={view.portfolio.allocations} className="mt-0" />
            </section>
          ) : null}
          <PensionTargetDialog open={targetOpen} onOpenChange={setTargetOpen} />

          <section aria-labelledby="schemes-heading" className="space-y-3">
            <h2 id="schemes-heading" className="text-sm font-medium">
              Your schemes
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {view.figures.map((figures) => (
                <SchemeCard key={figures.membership.id} figures={figures} />
              ))}
            </div>
          </section>

          <ValueHistoryChart
            title="Portfolio value over time"
            description="The value of units held in each scheme, month by month."
            memberships={memberships}
            contributions={contributions}
            withdrawals={withdrawals}
          />

          <DashCard>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>
                Contributions, withdrawals, and messages across your schemes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {view.activity.length === 0 ? (
                <DashboardEmptyState
                  size="sm"
                  icon={<FileText />}
                  title="No activity yet"
                  description="Contributions, withdrawal requests, and messages appear here."
                  action={{ label: "View contributions", href: "/dashboard/contributions" }}
                />
              ) : (
                <ActivityList items={view.activity} />
              )}
            </CardContent>
          </DashCard>
        </>
      )}
    </PensionPage>
  );
}

function OverviewLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your pension</span>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}
