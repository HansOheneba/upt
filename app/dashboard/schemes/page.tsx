"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Banknote, Layers, Wallet } from "lucide-react";
import { DashboardEmptyState } from "@/components/dashboard/empty-state";
import { KpiStrip, type KpiItem } from "@/components/dashboard/kpi-strip";
import {
  DashCard,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/dash-card";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityList } from "@/components/pension/activity-list";
import { PensionPage, PensionPageHeader } from "@/components/pension/page-frame";
import { PortfolioAllocation } from "@/components/pension/portfolio-allocation";
import { SchemeCard } from "@/components/pension/scheme-card";
import { usePensionReady } from "@/components/pension/use-pension-ready";
import { formatGhs, formatPensionDate } from "@/lib/pension/metrics";
import {
  agreedMonthlyContributions,
  figuresForMembership,
  recentActivity,
  summarizePortfolio,
} from "@/lib/pension/portfolio";
import type { MembershipKind, MembershipStatus } from "@/lib/pension/types";
import { cn } from "@/lib/utils";
import { usePensionStore } from "@/store/pensionStore";

const KINDS: { id: "all" | MembershipKind; label: string }[] = [
  { id: "all", label: "All types" },
  { id: "personal", label: "Personal" },
  { id: "employer", label: "Employer-sponsored" },
];

const STATUSES: { id: "all" | MembershipStatus; label: string }[] = [
  { id: "all", label: "All statuses" },
  { id: "active", label: "Active" },
  { id: "closed", label: "Closed" },
];

export default function SchemesPage() {
  const ready = usePensionReady();
  const member = usePensionStore((state) => state.member);
  const memberships = usePensionStore((state) => state.memberships);
  const contributions = usePensionStore((state) => state.contributions);
  const withdrawals = usePensionStore((state) => state.withdrawals);
  const requests = usePensionStore((state) => state.requests);
  const loadError = usePensionStore((state) => state.loadError);
  const reload = usePensionStore((state) => state.reload);
  const [kind, setKind] = useState<(typeof KINDS)[number]["id"]>("all");
  const [status, setStatus] = useState<(typeof STATUSES)[number]["id"]>("all");

  const figures = useMemo(
    () => memberships.map((membership) => figuresForMembership(membership, contributions, withdrawals)),
    [memberships, contributions, withdrawals],
  );
  const portfolio = useMemo(
    () => summarizePortfolio(memberships, contributions, withdrawals),
    [memberships, contributions, withdrawals],
  );
  const monthly = useMemo(() => agreedMonthlyContributions(memberships), [memberships]);
  const activity = useMemo(
    () => recentActivity(memberships, contributions, withdrawals, requests, 4),
    [memberships, contributions, withdrawals, requests],
  );
  const visible = figures.filter((row) => {
    if (kind !== "all" && row.membership.kind !== kind) return false;
    if (status !== "all" && row.membership.status !== status) return false;
    return true;
  });
  const closedCount = memberships.filter((row) => row.status === "closed").length;
  const showAllocation = portfolio.allocations.length > 1 && (portfolio.total ?? 0) > 0;
  const summary: KpiItem[] = [
    {
      label: "Total pension value",
      value: portfolio.total != null ? formatGhs(portfolio.total, 2) : "Unavailable",
      subline:
        portfolio.unpricedActiveCount > 0
          ? `${portfolio.unpricedActiveCount} active ${portfolio.unpricedActiveCount === 1 ? "membership has" : "memberships have"} no unit price`
          : portfolio.updatedAt
            ? `Latest unit price ${formatPensionDate(portfolio.updatedAt)}`
            : "Active memberships with a unit price",
      accent: "blue",
      icon: <Wallet aria-hidden className="size-4" />,
    },
    {
      label: "Active memberships",
      value: String(portfolio.activeCount),
      subline:
        closedCount > 0
          ? "Closed memberships are not included"
          : "Open on your account",
      accent: "green",
      icon: <Layers aria-hidden className="size-4" />,
    },
  ];
  if (monthly.total != null) {
    summary.push({
      label: "Agreed monthly",
      value: formatGhs(monthly.total, 2),
      subline:
        monthly.omitted > 0
          ? `${monthly.omitted} active ${monthly.omitted === 1 ? "membership has" : "memberships have"} no agreed amount`
          : "Scheduled amounts. Not payments received.",
      accent: "orange",
      icon: <Banknote aria-hidden className="size-4" />,
    });
  }

  return (
    <PensionPage>
      <PensionPageHeader
        title="My Schemes"
        description="Manage your pension memberships and view the value of each account."
      />

      {!ready ? (
        <SchemesLoading />
      ) : loadError ? (
        <DashboardEmptyState
          icon={<AlertCircle />}
          title="We could not load your schemes"
          description="Try loading your memberships again."
          action={{ label: "Try again", onClick: reload }}
        />
      ) : !member || memberships.length === 0 ? (
        <DashboardEmptyState
          icon={<Layers />}
          title="No scheme memberships"
          description="Your pension schemes appear here once a membership is open on your account."
          action={{ label: "Open an account", href: "/onboarding" }}
        />
      ) : (
        <>
          <KpiStrip
            cols={summary.length === 3 ? 3 : 2}
            items={summary}
          />
          {showAllocation ? (
            <section className="rounded-xl border border-border bg-card p-4">
              <PortfolioAllocation slices={portfolio.allocations} className="mt-0" />
            </section>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <FilterGroup label="Membership type" value={kind} options={KINDS} onChange={setKind} />
            <FilterGroup label="Status" value={status} options={STATUSES} onChange={setStatus} />
          </div>

          {visible.length === 0 ? (
            <DashboardEmptyState
              icon={<Layers />}
              title="No schemes match"
              description="No memberships match the type and status you selected."
              action={{
                label: "Show all schemes",
                onClick: () => {
                  setKind("all");
                  setStatus("all");
                },
              }}
            />
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {visible.map((row) => (
                <li key={row.membership.id} className="h-full">
                  <SchemeCard figures={row} />
                </li>
              ))}
            </ul>
          )}

          {activity.length > 0 ? (
            <DashCard>
              <CardHeader>
                <CardTitle>Recent activity</CardTitle>
                <CardDescription>
                  Contributions received, withdrawal requests, and messages, with the scheme and date.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ActivityList items={activity} />
              </CardContent>
            </DashCard>
          ) : null}
        </>
      )}
    </PensionPage>
  );
}

function SchemesLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your schemes</span>
      <div className="grid gap-3 md:grid-cols-3">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <Skeleton className="h-9 w-72 rounded-lg" />
      <div className="grid gap-3 md:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

function FilterGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex w-fit max-w-full flex-wrap gap-1 rounded-lg bg-muted/70 p-1"
    >
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected
                ? "bg-card font-medium text-foreground ring-1 ring-foreground/10"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
