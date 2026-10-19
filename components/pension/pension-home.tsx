"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AlertCircle, ArrowLeftRight, Banknote, FileText, Layers, Tag, Wallet } from "lucide-react";
import {
  DashCard,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/dash-card";
import { DashboardEmptyState } from "@/components/dashboard/empty-state";
import { KpiStrip } from "@/components/dashboard/kpi-strip";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ContributionHistoryChart } from "@/components/pension/contribution-history-chart";
import { PensionTarget } from "@/components/pension/pension-target";
import { PensionPage, PensionPageHeader } from "@/components/pension/page-frame";
import { usePensionReady } from "@/components/pension/use-pension-ready";
import { WithdrawalStatusBadge } from "@/components/pension/withdrawal-status";
import {
  contributionsInYear,
  sortContributionsDesc,
  summarizeContributions,
} from "@/lib/pension/contributions";
import {
  formatGhs,
  formatPensionDate,
  formatUnits,
  memberName,
  outstandingUnits,
  potValue,
} from "@/lib/pension/metrics";
import type { Withdrawal } from "@/lib/pension/types";
import { withdrawalExplanation, withdrawalSubmittedLabel } from "@/lib/pension/withdrawals";
import { usePensionStore } from "@/store/pensionStore";

/**
 * Historical pension valuations are not stored, so this page charts recorded
 * contributions only. The target is the amount and retirement age the member
 * set. Progress compares the current unit value with that amount. It is not
 * a projection.
 */
export function PensionHome() {
  const ready = usePensionReady();
  const member = usePensionStore((state) => state.member);
  const contributions = usePensionStore((state) => state.contributions);
  const withdrawals = usePensionStore((state) => state.withdrawals);
  const loadError = usePensionStore((state) => state.loadError);
  const reload = usePensionStore((state) => state.reload);

  const summary = useMemo(() => {
    if (!member) return null;
    const priceReady = Number.isFinite(member.unitPrice) && member.unitPrice > 0;
    const units = priceReady
      ? outstandingUnits(contributions, withdrawals, member.unitPrice)
      : null;
    const pot = units != null ? potValue(units, member.unitPrice) : null;
    const activity = summarizeContributions(contributions);
    const year = new Date().getFullYear();
    return {
      units,
      pot,
      priceReady,
      activity,
      contributedThisYear: contributionsInYear(contributions, year),
      year,
    };
  }, [member, contributions, withdrawals]);

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
          description="Your pension value, contributions, and withdrawal requests."
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

  if (!member || !summary) {
    return (
      <PensionPage>
        <PensionPageHeader
          title="My Own Pension"
          description="Your pot, contributions, and withdrawals."
        />
        <DashboardEmptyState
          icon={<FileText />}
          title="Open your pension"
          description="Your pot, contributions, withdrawals, and statement live here once your My Own Pension account is open."
          action={{
            label: "Open an account",
            href: "/onboarding",
          }}
        />
      </PensionPage>
    );
  }

  const recent = sortContributionsDesc(contributions).slice(0, 5);
  const openWithdrawal = activeWithdrawal(withdrawals);
  const monthlyReady = Number.isFinite(member.monthlyContribution);
  const latest = summary.activity.latest;

  return (
    <PensionPage>
      <PensionPageHeader
        title={memberName(member)}
        description={`${member.scheme} · Member since ${formatPensionDate(member.memberSince)} · ${member.id.toUpperCase()}`}
        action={
          <Button asChild>
            <Link href="/dashboard/withdrawals">Request a withdrawal</Link>
          </Button>
        }
      />

      <section aria-label="Pension summary" className="flex flex-col gap-3">
        <article className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-sm font-medium text-muted-foreground">Current pension value</h2>
              {summary.pot != null ? (
                <p className="mt-2 text-4xl font-semibold tabular-nums tracking-tight">
                  {formatGhs(summary.pot, 2)}
                </p>
              ) : (
                <p className="mt-2 text-2xl font-semibold tracking-tight">Unavailable</p>
              )}
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                {summary.pot != null && summary.units != null
                  ? "Value of the units you hold at the latest unit price."
                  : "Your pension value appears here when a unit price is available for the units you hold."}
              </p>
            </div>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--brand-primary)_8%,white)] text-[var(--brand-primary)]">
              <Wallet aria-hidden className="size-4" />
            </span>
          </div>
        </article>

        <KpiStrip
          cols={3}
          items={[
            {
              label: "Units held",
              value: summary.units != null ? formatUnits(summary.units) : "Unavailable",
              subline: "After paid withdrawals",
              accent: "green",
              icon: <Layers aria-hidden className="size-4" />,
            },
            {
              label: "Latest unit price",
              value: summary.priceReady ? formatGhs(member.unitPrice, 4) : "Unavailable",
              subline: member.unitPriceDate
                ? `Set by finance on ${formatPensionDate(member.unitPriceDate)}`
                : "No unit price date on file",
              accent: "purple",
              icon: <Tag aria-hidden className="size-4" />,
            },
            {
              label: "Monthly contribution",
              value: monthlyReady ? formatGhs(member.monthlyContribution, 2) : "Unavailable",
              subline: "Agreed amount, paid by Mobile Money",
              accent: "orange",
              icon: <Banknote aria-hidden className="size-4" />,
            },
          ]}
        />
      </section>

      <article className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
        <PensionTarget
          targetPot={member.targetPot}
          retirementAge={member.retirementAge}
          currentValue={summary.pot}
        />
      </article>

      <div className="grid gap-4 lg:grid-cols-2">
        <DashCard className="h-full">
          <CardHeader>
            <CardTitle>Contributions over time</CardTitle>
            <CardDescription>
              Monthly totals of money paid in. Amounts are in Ghana cedis.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ContributionHistoryChart contributions={contributions} />
          </CardContent>
        </DashCard>

        <DashCard className="h-full">
          <CardHeader>
            <CardTitle>Contribution activity</CardTitle>
            <CardDescription>
              Totals from recorded payments. This is money paid in, not the current pension value.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            <dl className="flex flex-col">
              <ActivityRow
                label="Total paid in"
                value={formatGhs(summary.activity.totalAmount, 2)}
              />
              <ActivityRow
                label="Payments recorded"
                value={String(summary.activity.count)}
              />
              <ActivityRow
                label={`Paid in ${summary.year}`}
                value={formatGhs(summary.contributedThisYear, 2)}
              />
              <ActivityRow
                label="Latest payment"
                value={
                  latest && Number.isFinite(latest.amount)
                    ? `${formatGhs(latest.amount, 2)} · ${formatPensionDate(latest.date)}`
                    : "None recorded"
                }
              />
            </dl>
          </CardContent>
        </DashCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DashCard className="h-full">
          <CardHeader>
            <CardTitle>Recent contributions</CardTitle>
            <CardDescription>Latest payments into My Own Pension.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            {recent.length === 0 ? (
              <DashboardEmptyState
                size="sm"
                icon={<FileText />}
                title="No contributions yet"
                description="Recorded payments are listed here."
                action={{
                  label: "View contributions",
                  href: "/dashboard/contributions",
                }}
              />
            ) : (
              <ul className="divide-y divide-foreground/5">
                {recent.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-baseline justify-between gap-3 py-2.5 text-sm"
                  >
                    <time dateTime={row.date?.slice(0, 10)} className="text-muted-foreground">
                      {row.date ? formatPensionDate(row.date) : "Date unavailable"}
                    </time>
                    <span className="tabular-nums font-medium">
                      {Number.isFinite(row.amount) ? formatGhs(row.amount, 2) : "Unavailable"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {recent.length > 0 ? (
              <Button variant="outline" asChild className="mt-4">
                <Link href="/dashboard/contributions">View contributions</Link>
              </Button>
            ) : null}
          </CardContent>
        </DashCard>

        <DashCard className="h-full">
          <CardHeader>
            <CardTitle>Withdrawal</CardTitle>
            <CardDescription>
              {openWithdrawal ? "Your request in progress." : "Requests you have open."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            {openWithdrawal ? (
              <WithdrawalSummaryCard withdrawal={openWithdrawal} />
            ) : (
              <DashboardEmptyState
                size="sm"
                className="border-0 bg-transparent px-0 py-2"
                icon={<ArrowLeftRight />}
                title={
                  withdrawals.length > 0
                    ? "No withdrawal in progress"
                    : "No withdrawal requests yet"
                }
                description={
                  withdrawals.length > 0
                    ? "Your earlier requests are complete. Start another when you need a payout."
                    : "When you need a payout, start a request and follow it here."
                }
                action={{
                  label: "Request a withdrawal",
                  href: "/dashboard/withdrawals",
                }}
              />
            )}
          </CardContent>
        </DashCard>
      </div>
    </PensionPage>
  );
}

function ActivityRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-foreground/5 py-3 last:border-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function WithdrawalSummaryCard({ withdrawal }: { withdrawal: Withdrawal }) {
  const submitted = withdrawalSubmittedLabel(withdrawal.submittedAt);
  const amount = Number.isFinite(withdrawal.amount)
    ? formatGhs(withdrawal.amount, 2)
    : "Amount unavailable";
  const reason = withdrawal.reason?.trim() || "Withdrawal";

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-medium tracking-tight">{reason}</h3>
          <p className="mt-1 text-xl font-medium tabular-nums tracking-tight">
            {amount} requested
          </p>
          {submitted ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Submitted <time dateTime={withdrawal.submittedAt}>{submitted}</time>
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">Submission date unavailable</p>
          )}
        </div>
        <WithdrawalStatusBadge status={withdrawal.status} />
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {withdrawalExplanation(withdrawal.status)}
      </p>
      <Button variant="outline" asChild className="mt-auto self-start">
        <Link href={`/dashboard/withdrawals?request=${encodeURIComponent(withdrawal.id)}`}>
          View request
        </Link>
      </Button>
    </div>
  );
}

function activeWithdrawal(rows: Withdrawal[]): Withdrawal | null {
  const open = rows.filter((row) => row.status !== "paid");
  open.sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""));
  return open[0] ?? null;
}

function OverviewLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your pension</span>
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <div className="grid grid-cols-1 gap-3 @xl/dash:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}
