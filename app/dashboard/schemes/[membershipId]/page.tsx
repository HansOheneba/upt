"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeftRight, FileText } from "lucide-react";
import {
  DashCard,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/dash-card";
import { DashboardEmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import { ValueHistoryChart } from "@/components/pension/value-history-chart";
import { PensionPage, PensionPageHeader } from "@/components/pension/page-frame";
import { PensionTarget } from "@/components/pension/pension-target";
import { usePensionReady } from "@/components/pension/use-pension-ready";
import { WithdrawalStatusBadge } from "@/components/pension/withdrawal-status";
import { formatGhs, formatPensionDate, formatUnits } from "@/lib/pension/metrics";
import {
  figuresForMembership,
  membershipKindLabel,
  rowsForMembership,
  withdrawalPot,
} from "@/lib/pension/portfolio";
import { sortContributionsDesc } from "@/lib/pension/contributions";
import { WITHDRAWAL_BADGE_LABEL, isWithdrawalStatus } from "@/lib/pension/withdrawals";
import { usePensionStore } from "@/store/pensionStore";

export default function SchemeDetailPage() {
  const ready = usePensionReady();
  const params = useParams<{ membershipId: string }>();
  const membershipId = typeof params.membershipId === "string" ? params.membershipId : "";
  const memberships = usePensionStore((state) => state.memberships);
  const contributions = usePensionStore((state) => state.contributions);
  const withdrawals = usePensionStore((state) => state.withdrawals);
  const membership = memberships.find((row) => row.id === membershipId) ?? null;

  if (!ready) {
    return (
      <PensionPage>
        <div className="h-40" aria-busy="true" />
      </PensionPage>
    );
  }

  if (!membership) {
    return (
      <PensionPage>
        <PensionPageHeader
          title="Scheme"
          description="Open a membership from your scheme list."
        />
        <DashboardEmptyState
          icon={<FileText />}
          title="Scheme not found"
          description="This membership is not on your account."
          action={{ label: "View schemes", href: "/dashboard/schemes" }}
        />
      </PensionPage>
    );
  }

  const figures = figuresForMembership(membership, contributions, withdrawals);
  const schemeContributions = sortContributionsDesc(
    rowsForMembership(contributions, membership.id),
  );
  const schemeWithdrawals = rowsForMembership(withdrawals, membership.id).sort((a, b) =>
    (b.submittedAt || "").localeCompare(a.submittedAt || ""),
  );
  const available = withdrawalPot(membership, contributions, withdrawals);
  const transactions = [
    ...schemeContributions.map((row) => ({
      id: row.id,
      at: row.date,
      label: "Contribution received",
      amount: row.amount,
      status: "Completed",
    })),
    ...schemeWithdrawals.map((row) => ({
      id: row.id,
      at: row.submittedAt,
      label: row.reason?.trim() || "Withdrawal",
      amount: row.amount,
      status: isWithdrawalStatus(row.status) ? WITHDRAWAL_BADGE_LABEL[row.status] : "Status unavailable",
    })),
  ].sort((a, b) => (b.at || "").localeCompare(a.at || ""));

  return (
    <PensionPage>
      <PensionPageHeader
        title={membership.schemeName}
        description={[
          membershipKindLabel(membership),
          membership.kind === "employer" && membership.employerName ? membership.employerName : null,
          membership.status === "closed" ? "Closed" : "Active",
          membership.memberNumber,
        ]
          .filter(Boolean)
          .join(" · ")}
        action={
          <>
            <Button type="button" variant="outline" asChild>
              <Link href={`/dashboard/statement?membership=${encodeURIComponent(membership.id)}`}>
                Statement
              </Link>
            </Button>
            {available != null ? (
              <Button type="button" asChild>
                <Link href={`/dashboard/withdrawals?membership=${encodeURIComponent(membership.id)}`}>
                  Request a withdrawal
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
        <h2 className="text-sm font-medium text-muted-foreground">Current value</h2>
        <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">
          {figures.value != null ? formatGhs(figures.value, 2) : "Value unavailable"}
        </p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Units held</dt>
            <dd className="mt-1 font-medium tabular-nums">
              {figures.units != null ? formatUnits(figures.units) : "Unavailable"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Unit price</dt>
            <dd className="mt-1 font-medium tabular-nums">
              {figures.value != null ? formatGhs(membership.unitPrice, 4) : "Unavailable"}
            </dd>
            {figures.value != null && membership.unitPriceDate ? (
              <dd className="text-xs text-muted-foreground">
                {formatPensionDate(membership.unitPriceDate)}
              </dd>
            ) : null}
          </div>
          <div>
            <dt className="text-muted-foreground">Member since</dt>
            <dd className="mt-1 font-medium">
              {membership.memberSince ? formatPensionDate(membership.memberSince) : "Unavailable"}
            </dd>
          </div>
          {membership.monthlyContribution > 0 ? (
            <div>
              <dt className="text-muted-foreground">Agreed monthly contribution</dt>
              <dd className="mt-1 font-medium tabular-nums">
                {formatGhs(membership.monthlyContribution, 2)}
              </dd>
              <dd className="text-xs text-muted-foreground">
                Scheduled amount. Posted contributions are listed with transactions.
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      {membership.kind === "personal" ? (
        <article className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
          <PensionTarget
            targetPot={membership.targetPot ?? 0}
            retirementAge={membership.retirementAge ?? 60}
            currentValue={figures.value}
          />
        </article>
      ) : null}

      <ValueHistoryChart
        title="Scheme value"
        description="The value of units held in this scheme, month by month."
        memberships={[membership]}
        contributions={schemeContributions}
        withdrawals={schemeWithdrawals}
        emptyHref={`/dashboard/contributions?membership=${encodeURIComponent(membership.id)}`}
      />

      <DashCard>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>Contributions and withdrawals recorded on this membership.</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <DashboardEmptyState
              size="sm"
              icon={<FileText />}
              title="No transactions yet"
              description="Contributions and withdrawal requests for this scheme appear here."
              action={{
                label: "View contributions",
                href: `/dashboard/contributions?membership=${encodeURIComponent(membership.id)}`,
              }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-sm">
                <caption className="sr-only">Transactions for {membership.schemeName}</caption>
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th scope="col" className="py-2 pr-4 font-medium">Date</th>
                    <th scope="col" className="py-2 pr-4 font-medium">Transaction</th>
                    <th scope="col" className="py-2 pr-4 text-right font-medium">Amount</th>
                    <th scope="col" className="py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 12).map((row) => (
                    <tr key={row.id} className="border-b border-foreground/5 last:border-0">
                      <td className="py-3 pr-4">
                        {row.at ? formatPensionDate(row.at) : "Date unavailable"}
                      </td>
                      <td className="py-3 pr-4">{row.label}</td>
                      <td className="py-3 pr-4 text-right tabular-nums">
                        {Number.isFinite(row.amount) ? formatGhs(row.amount, 2) : "Unavailable"}
                      </td>
                      <td className="py-3">{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {schemeContributions.length > 0 ? (
            <Button type="button" variant="outline" asChild className="mt-4">
              <Link href={`/dashboard/contributions?membership=${encodeURIComponent(membership.id)}`}>
                View contribution history
              </Link>
            </Button>
          ) : null}
        </CardContent>
      </DashCard>

      <DashCard>
        <CardHeader>
          <CardTitle>Withdrawal requests</CardTitle>
          <CardDescription>
            Requests stay separate from payments. Only a paid request is a completed withdrawal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {schemeWithdrawals.length === 0 ? (
            <DashboardEmptyState
              size="sm"
              icon={<ArrowLeftRight />}
              title="No withdrawal requests"
              description={
                available != null
                  ? "Start a request when you need a payout from this scheme."
                  : "A request can be started when this scheme has a value available to withdraw."
              }
              action={
                available != null
                  ? {
                      label: "Request a withdrawal",
                      href: `/dashboard/withdrawals?membership=${encodeURIComponent(membership.id)}`,
                    }
                  : {
                      label: "View withdrawals",
                      href: "/dashboard/withdrawals",
                    }
              }
            />
          ) : (
            <ul className="divide-y divide-foreground/5">
              {schemeWithdrawals.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{row.reason || "Withdrawal"}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {row.submittedAt ? formatPensionDate(row.submittedAt) : "Date unavailable"}
                      {" · "}
                      {Number.isFinite(row.amount) ? formatGhs(row.amount, 2) : "Amount unavailable"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <WithdrawalStatusBadge status={row.status} />
                    <Link
                      href={`/dashboard/withdrawals?request=${encodeURIComponent(row.id)}`}
                      className="text-sm font-medium text-[var(--brand-primary)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      View
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </DashCard>
    </PensionPage>
  );
}
