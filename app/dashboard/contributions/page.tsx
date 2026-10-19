"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, Banknote, CalendarDays, Coins, Layers, Tag } from "lucide-react";
import {
  DashCard,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/dash-card";
import { DashboardEmptyState } from "@/components/dashboard/empty-state";
import { MetricCards } from "@/components/pension/metric-cards";
import { PensionPage, PensionPageHeader } from "@/components/pension/page-frame";
import { usePensionReady } from "@/components/pension/use-pension-ready";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CONTRIBUTION_PAGE_SIZE,
  contributionYears,
  sortContributionsDesc,
  summarizeContributions,
} from "@/lib/pension/contributions";
import {
  formatGhs,
  formatPensionDate,
  formatUnits,
  outstandingUnits,
  potValue,
} from "@/lib/pension/metrics";
import type { Contribution } from "@/lib/pension/types";
import { usePensionStore } from "@/store/pensionStore";

export default function ContributionsPage() {
  const ready = usePensionReady();
  const member = usePensionStore((state) => state.member);
  const contributions = usePensionStore((state) => state.contributions);
  const withdrawals = usePensionStore((state) => state.withdrawals);
  const loadError = usePensionStore((state) => state.loadError);
  const reload = usePensionStore((state) => state.reload);
  const [year, setYear] = useState("all");
  const [page, setPage] = useState(0);

  const summary = useMemo(() => summarizeContributions(contributions), [contributions]);
  const rows = useMemo(() => sortContributionsDesc(contributions), [contributions]);
  const years = useMemo(() => contributionYears(contributions), [contributions]);
  const filtered = useMemo(
    () => (year === "all" ? rows : rows.filter((row) => row.date.startsWith(year))),
    [rows, year],
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / CONTRIBUTION_PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(
    safePage * CONTRIBUTION_PAGE_SIZE,
    safePage * CONTRIBUTION_PAGE_SIZE + CONTRIBUTION_PAGE_SIZE,
  );

  const priceReady =
    member != null && Number.isFinite(member.unitPrice) && member.unitPrice > 0;
  const unitsHeld =
    member && priceReady
      ? outstandingUnits(contributions, withdrawals, member.unitPrice)
      : null;
  const pensionValue =
    unitsHeld != null && member ? potValue(unitsHeld, member.unitPrice) : null;

  return (
    <PensionPage>
      <PensionPageHeader
        title="Contributions"
        description="Track your pension contributions and see how each payment adds to your pension savings."
        action={
          ready && member && !loadError ? (
            <Button type="button" variant="outline" asChild>
              <Link href="/dashboard/statement">View statement</Link>
            </Button>
          ) : null
        }
      />

      {!ready ? (
        <ContributionsLoading />
      ) : loadError ? (
        <DashboardEmptyState
          icon={<AlertCircle />}
          title="We could not load your contributions"
          description="Try loading your contribution history again."
          action={{ label: "Try again", onClick: reload }}
        />
      ) : !member ? (
        <DashboardEmptyState
          icon={<Coins />}
          title="Open your pension"
          description="Your confirmed pension contributions will appear here once your My Own Pension account is open."
          action={{ label: "Open an account", href: "/onboarding" }}
        />
      ) : contributions.length === 0 ? (
        <DashboardEmptyState
          icon={<Coins />}
          title="No contributions yet"
          description="Your confirmed pension contributions will appear here."
          action={{ label: "View statement", href: "/dashboard/statement" }}
        />
      ) : (
        <>
          <ContributionSummary
            received={formatGhs(summary.totalAmount, 2)}
            paymentCount={summary.count}
            units={formatUnits(summary.totalUnits)}
            latestAmount={summary.latest ? formatGhs(summary.latest.amount, 2) : "Unavailable"}
            latestDate={summary.latest ? formatPensionDate(summary.latest.date) : "Date unavailable"}
            unitPrice={priceReady && member ? formatGhs(member.unitPrice, 4) : "Unavailable"}
            unitPriceDate={
              priceReady && member?.unitPriceDate
                ? `Effective ${formatPensionDate(member.unitPriceDate)}`
                : "No unit price on file"
            }
          />

          <PensionValueNote
            value={pensionValue}
            unitsHeld={unitsHeld}
            unitPrice={priceReady && member ? formatGhs(member.unitPrice, 4) : null}
          />

          <DashCard>
            <CardHeader>
              <CardTitle>Contribution history</CardTitle>
              <CardDescription>
                Date, amount, unit price, and units for each contribution.
              </CardDescription>
              {years.length > 1 ? (
                <CardAction>
                  <Select
                    value={year}
                    onValueChange={(value) => {
                      setYear(value);
                      setPage(0);
                    }}
                  >
                    <SelectTrigger size="sm" aria-label="Filter contributions by year">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All years</SelectItem>
                      {years.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardAction>
              ) : null}
            </CardHeader>
            <CardContent>
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground">No contributions in {year}.</p>
              ) : (
                <ContributionTable rows={pageRows} />
              )}
              {pageCount > 1 ? (
                <nav
                  aria-label="Contribution history pages"
                  className="mt-4 flex items-center justify-between gap-3"
                >
                  <p className="text-xs text-muted-foreground">
                    {safePage * CONTRIBUTION_PAGE_SIZE + 1}–
                    {Math.min((safePage + 1) * CONTRIBUTION_PAGE_SIZE, filtered.length)} of{" "}
                    {filtered.length}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={safePage === 0}
                      onClick={() => setPage(safePage - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={safePage >= pageCount - 1}
                      onClick={() => setPage(safePage + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </nav>
              ) : null}
            </CardContent>
          </DashCard>
        </>
      )}
    </PensionPage>
  );
}

function ContributionSummary({
  received,
  paymentCount,
  units,
  latestAmount,
  latestDate,
  unitPrice,
  unitPriceDate,
}: {
  received: string;
  paymentCount: number;
  units: string;
  latestAmount: string;
  latestDate: string;
  unitPrice: string;
  unitPriceDate: string;
}) {
  return (
    <MetricCards
      label="Contribution summary"
      items={[
        {
          label: "Total contributions received",
          value: received,
          detail: `${paymentCount} ${paymentCount === 1 ? "payment" : "payments"}`,
          icon: Banknote,
          tone: "blue",
        },
        {
          label: "Total units allocated",
          value: units,
          detail: "Allocated on each contribution",
          icon: Layers,
          tone: "green",
        },
        {
          label: "Latest contribution",
          value: latestAmount,
          detail: latestDate,
          icon: CalendarDays,
          tone: "gold",
        },
        {
          label: "Latest unit price",
          value: unitPrice,
          detail: unitPriceDate,
          icon: Tag,
          tone: "violet",
        },
      ]}
    />
  );
}

function PensionValueNote({
  value,
  unitsHeld,
  unitPrice,
}: {
  value: number | null;
  unitsHeld: number | null;
  unitPrice: string | null;
}) {
  return (
    <section
      aria-labelledby="pension-value-heading"
      className="rounded-xl bg-card px-4 py-4 ring-1 ring-foreground/10 sm:px-5"
    >
      <div className="border-l-2 border-[var(--brand-primary)] pl-4">
        <h2 id="pension-value-heading" className="text-xs font-medium text-muted-foreground">
          Current pension value
        </h2>
        {value != null && unitsHeld != null && unitPrice ? (
          <>
            <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight">
              {formatGhs(value, 2)}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {formatUnits(unitsHeld)} units held at {unitPrice}.
            </p>
          </>
        ) : (
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            Your pension value appears here when a unit price is available for the units you hold.
          </p>
        )}
      </div>
    </section>
  );
}

function ContributionTable({ rows }: { rows: Contribution[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] text-sm">
        <caption className="sr-only">Confirmed pension contributions, newest first</caption>
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th scope="col" className="py-2 pr-4 font-medium">
              Date
            </th>
            <th scope="col" className="py-2 pr-4 text-right font-medium">
              Contribution
            </th>
            <th scope="col" className="py-2 pr-4 text-right font-medium">
              Unit price
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              Units allocated
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-foreground/5 last:border-0">
              <td className="py-3 pr-4">
                <time dateTime={row.date.slice(0, 10)}>{formatPensionDate(row.date)}</time>
              </td>
              <td className="py-3 pr-4 text-right font-medium tabular-nums">
                {Number.isFinite(row.amount) ? formatGhs(row.amount, 2) : "Unavailable"}
              </td>
              <td className="py-3 pr-4 text-right tabular-nums text-muted-foreground">
                {Number.isFinite(row.unitPrice) ? formatGhs(row.unitPrice, 4) : "Unavailable"}
              </td>
              <td className="py-3 text-right tabular-nums">
                {Number.isFinite(row.units) ? formatUnits(row.units) : "Unavailable"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ContributionsLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading contributions</span>
      <div className="grid grid-cols-1 gap-3 @xl/dash:grid-cols-2 @4xl/dash:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-[8.25rem] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}
