"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowLeftRight, Banknote, FileText, Layers, Tag, Wallet } from "lucide-react";
import {
  DashCard,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/dash-card";
import { DashboardEmptyState } from "@/components/dashboard/empty-state";
import { MetricCards } from "@/components/pension/metric-cards";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PensionPage, PensionPageHeader } from "@/components/pension/page-frame";
import { usePensionReady } from "@/components/pension/use-pension-ready";
import { WithdrawalStatusBadge } from "@/components/pension/withdrawal-status";
import {
  formatGhs,
  formatPensionDate,
  formatUnits,
  memberName,
  outstandingUnits,
  potSeries,
  potValue,
} from "@/lib/pension/metrics";
import type { Contribution } from "@/lib/pension/types";
import type { PotPoint } from "@/lib/pension/metrics";
import { usePensionStore } from "@/store/pensionStore";

const NAVY = "var(--brand-primary)";

function ContributionChart({
  contributions,
  pot,
}: {
  contributions: Contribution[];
  pot: PotPoint[];
}) {
  if (contributions.length < 2 || pot.length < 2) return null;

  const windowed =
    contributions.length > 24 ? contributions.slice(-24) : contributions;
  const potWindow = pot.length > windowed.length ? pot.slice(-windowed.length) : pot;

  const width = 640;
  const height = 220;
  const pad = { l: 4, r: 4, t: 12, b: 4 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const maxAmount = Math.max(...windowed.map((row) => row.amount), 1);
  const maxPot = Math.max(...potWindow.map((point) => point.value), 1);
  const slot = innerW / windowed.length;
  const barW = Math.max(3, slot * 0.55);

  const line = potWindow
    .map((point, index) => {
      const x = pad.l + slot * index + slot / 2;
      const y = pad.t + innerH - (point.value / maxPot) * innerH;
      return `${index === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  const first = windowed[0];
  const last = windowed[windowed.length - 1];

  return (
    <figure>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-52 w-full"
        role="img"
        aria-label={`Monthly contributions and pot value from ${formatPensionDate(first.date)} to ${formatPensionDate(last.date)}`}
      >
        {windowed.map((row, index) => {
          const barH = (row.amount / maxAmount) * innerH;
          const x = pad.l + slot * index + (slot - barW) / 2;
          const y = pad.t + innerH - barH;
          return (
            <rect
              key={row.id}
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx={1.5}
              fill={NAVY}
            />
          );
        })}
        <path
          d={line}
          fill="none"
          stroke="#8D95A3"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <figcaption className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-sm bg-[var(--brand-primary)]" />
            Contributions
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-3 bg-[#8D95A3]" />
            Pot
          </span>
        </span>
        <span>
          {formatPensionDate(first.date)} – {formatPensionDate(last.date)}
        </span>
      </figcaption>
    </figure>
  );
}

export function PensionHome() {
  const ready = usePensionReady();
  const member = usePensionStore((state) => state.member);
  const contributions = usePensionStore((state) => state.contributions);
  const withdrawals = usePensionStore((state) => state.withdrawals);

  const summary = useMemo(() => {
    if (!member) return null;
    const units = outstandingUnits(contributions, withdrawals, member.unitPrice);
    const pot = potValue(units, member.unitPrice);
    const contributed = contributions.reduce((sum, row) => sum + row.amount, 0);
    const progress =
      member.targetPot > 0 ? Math.min(100, (pot / member.targetPot) * 100) : 0;
    return {
      units,
      pot,
      contributed,
      progress,
      series: potSeries(contributions, withdrawals, member.unitPrice),
    };
  }, [member, contributions, withdrawals]);

  if (!ready) {
    return (
      <PensionPage>
        <div className="h-64" />
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

  const recent = [...contributions].reverse().slice(0, 5);
  const openWithdrawal = withdrawals.find((row) => row.status !== "paid");

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

      <MetricCards
        label="Pension summary"
        items={[
          {
            label: "Pot value",
            value: formatGhs(summary.pot, 0),
            detail: "Value of units held",
            icon: Wallet,
            tone: "blue",
          },
          {
            label: "Units",
            value: formatUnits(summary.units),
            detail: "Units still held",
            icon: Layers,
            tone: "green",
          },
          {
            label: "Unit price",
            value: formatGhs(member.unitPrice, 4),
            detail: `Set by finance on ${formatPensionDate(member.unitPriceDate)}`,
            icon: Tag,
            tone: "violet",
          },
          {
            label: "Monthly contribution",
            value: formatGhs(member.monthlyContribution, 0),
            detail: "MTN Mobile Money",
            icon: Banknote,
            tone: "gold",
          },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <DashCard className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Contributions and pot</CardTitle>
            <CardDescription>
              Each bar is a Mobile Money payment. The line is the value of your units.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ContributionChart contributions={contributions} pot={summary.series} />
          </CardContent>
        </DashCard>

        <DashCard>
          <CardHeader>
            <CardTitle>Progress to age {member.retirementAge}</CardTitle>
            <CardDescription>
              {formatGhs(summary.pot, 0)} of a {formatGhs(member.targetPot, 0)} target.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            <p className="text-4xl font-medium tabular-nums tracking-tight">
              {summary.progress.toFixed(0)}%
            </p>
            <Progress value={summary.progress} />
            <p className="text-sm text-muted-foreground">
              {formatGhs(summary.contributed, 0)} received from Mobile Money.
            </p>
          </CardContent>
        </DashCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DashCard className="h-full">
          <CardHeader>
            <CardTitle>Recent contributions</CardTitle>
            <CardDescription>Latest payments into My Own Pension.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3">
            {recent.length === 0 ? (
              <DashboardEmptyState
                size="sm"
                icon={<FileText />}
                title="Contributions post from Mobile Money"
                description="Each MTN Mobile Money payment is converted into units and listed here."
                action={{
                  label: "View contributions",
                  href: "/dashboard/contributions",
                }}
              />
            ) : (
              recent.map((row) => (
                <div key={row.id} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">{formatPensionDate(row.date)}</span>
                  <span className="tabular-nums font-medium">{formatGhs(row.amount, 0)}</span>
                </div>
              ))
            )}
            {recent.length > 0 ? (
              <Button variant="outline" asChild className="mt-auto">
                <Link href="/dashboard/contributions">All contributions</Link>
              </Button>
            ) : null}
          </CardContent>
        </DashCard>

        <DashCard className="h-full">
          <CardHeader>
            <CardTitle>Withdrawal</CardTitle>
            <CardDescription>Status updates also go out by SMS and email.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3">
            {openWithdrawal ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{openWithdrawal.reason}</p>
                  <WithdrawalStatusBadge status={openWithdrawal.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatGhs(openWithdrawal.amount, 0)} · submitted{" "}
                  {formatPensionDate(openWithdrawal.submittedAt)}
                </p>
              </>
            ) : (
              <DashboardEmptyState
                size="sm"
                className="border-0 bg-transparent px-0 py-2"
                icon={<ArrowLeftRight />}
                title="Request a payout when you need one"
                description="Request a withdrawal and follow it from received to paid."
                action={{
                  label: "Request a withdrawal",
                  href: "/dashboard/withdrawals",
                }}
              />
            )}
            {openWithdrawal ? (
              <Button variant="outline" asChild className="mt-auto">
                <Link href="/dashboard/withdrawals">View withdrawals</Link>
              </Button>
            ) : null}
          </CardContent>
        </DashCard>
      </div>
    </PensionPage>
  );
}
