"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { DashboardEmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PensionPage, PensionPageHeader } from "@/components/pension/page-frame";
import { usePensionReady } from "@/components/pension/use-pension-ready";
import {
  downloadAccountStatementCsv,
  downloadAccountStatementExcel,
  downloadStatementCsv,
  downloadStatementExcel,
} from "@/lib/pension/export-statement";
import {
  formatGhs,
  formatPensionDate,
  formatUnits,
  memberName,
} from "@/lib/pension/metrics";
import {
  figuresForMembership,
  membershipKindLabel,
  rowsForMembership,
  summarizePortfolio,
} from "@/lib/pension/portfolio";
import {
  STATEMENT_PERIODS,
  customPeriodError,
  inStatementRange,
  isStatementPeriod,
  resolveStatementPeriod,
  statementHref,
  type StatementPeriodId,
} from "@/lib/pension/statement-period";
import type { Contribution, Membership, PensionMember, Withdrawal } from "@/lib/pension/types";
import { WITHDRAWAL_BADGE_LABEL, isWithdrawalStatus } from "@/lib/pension/withdrawals";
import { formatUiLabel } from "@/lib/format-ui-label";
import { cn } from "@/lib/utils";
import { usePensionStore } from "@/store/pensionStore";

const CARD_BLUE = "#4C7DFF";
const CARD_GREEN = "#2FA58A";
const CARD_GOLD = "#E0A23A";
const CARD_MUTED = "#8A93A3";

type StatementCardItem = {
  id: string;
  label: string;
  value: string;
  subline: string;
  color: string;
  href?: string;
};

export default function StatementPage() {
  const ready = usePensionReady();
  const router = useRouter();
  const member = usePensionStore((state) => state.member);
  const memberships = usePensionStore((state) => state.memberships);
  const contributions = usePensionStore((state) => state.contributions);
  const withdrawals = usePensionStore((state) => state.withdrawals);
  const searchParams = useSearchParams();
  const requestedId = searchParams.get("membership");
  const periodParam = searchParams.get("period");
  const fromParam = searchParams.get("from") ?? "";
  const toParam = searchParams.get("to") ?? "";
  const urlPeriod: StatementPeriodId = isStatementPeriod(periodParam)
    ? periodParam
    : requestedId
      ? "all"
      : "this-year";

  const [scheme, setScheme] = useState(requestedId || "all");
  const [period, setPeriod] = useState<StatementPeriodId>(urlPeriod);
  const [from, setFrom] = useState(fromParam);
  const [to, setTo] = useState(toParam);
  const [formError, setFormError] = useState<string | null>(null);

  const urlKey = `${requestedId ?? ""}|${urlPeriod}|${fromParam}|${toParam}`;
  useEffect(() => {
    setScheme(requestedId || "all");
    setPeriod(urlPeriod);
    setFrom(fromParam);
    setTo(toParam);
    setFormError(null);
  }, [urlKey, requestedId, urlPeriod, fromParam, toParam]);

  if (!ready) {
    return (
      <PensionPage>
        <div className="h-40" aria-busy="true" />
      </PensionPage>
    );
  }

  if (!member) {
    return (
      <PensionPage>
        <PensionPageHeader
          title="Statements"
          description="A statement for each scheme membership, ready to print or download."
        />
        <DashboardEmptyState
          icon={<FileText />}
          title="Your statement opens with your account"
          description="Once a membership is open, this page holds the pot, units, and contributions you can print or download."
          action={{ label: "Open an account", href: "/onboarding" }}
        />
      </PensionPage>
    );
  }

  if (memberships.length === 0) {
    return (
      <PensionPage>
        <PensionPageHeader
          title="Statements"
          description="A statement for each scheme membership, ready to print or download."
        />
        <DashboardEmptyState
          icon={<FileText />}
          title="No statements yet"
          description="Statements appear here once a scheme membership is open on your account."
          action={{ label: "View schemes", href: "/dashboard/schemes" }}
        />
      </PensionPage>
    );
  }

  const schemeValue = scheme === "all" || memberships.some((row) => row.id === scheme) ? scheme : "all";
  const resolved = resolveStatementPeriod(urlPeriod, fromParam, toParam);
  const selectedMembership = memberships.find((row) => row.id === requestedId) ?? null;
  const unknownMembership = Boolean(requestedId) && requestedId !== "all" && !selectedMembership;
  const openMemberships =
    requestedId === "all" ? memberships : selectedMembership ? [selectedMembership] : [];
  const statementOpen = Boolean(requestedId) && resolved.valid && openMemberships.length > 0 && !unknownMembership;
  const urlError =
    requestedId && urlPeriod === "custom" && !resolved.valid
      ? customPeriodError(fromParam, toParam)
      : null;
  const formMatchesUrl =
    schemeValue === (requestedId || "all") &&
    period === urlPeriod &&
    from === fromParam &&
    to === toParam;
  const error = formError ?? (formMatchesUrl ? urlError : null);
  const portfolio = summarizePortfolio(memberships, contributions, withdrawals);
  const sections = openMemberships.map((membership) => {
    const scopedContributions = rowsForMembership(contributions, membership.id).filter((row) =>
      inStatementRange(row.date, resolved.range),
    );
    const scopedWithdrawals = rowsForMembership(withdrawals, membership.id).filter((row) =>
      inStatementRange(row.submittedAt, resolved.range),
    );
    const figures = figuresForMembership(membership, contributions, withdrawals);
    return {
      membership,
      contributions: scopedContributions,
      withdrawals: scopedWithdrawals,
      pot: figures.value,
      units: figures.units,
      contributed: sumAmounts(scopedContributions),
    };
  });
  const received = sumAmounts(sections.flatMap((section) => section.contributions));
  const paymentCount = sections.reduce((sum, section) => sum + section.contributions.length, 0);
  const name = memberName(member);

  function openStatement(event: React.FormEvent) {
    event.preventDefault();
    if (period === "custom") {
      const next = resolveStatementPeriod("custom", from, to);
      if (!next.valid) {
        setFormError(customPeriodError(from, to));
        return;
      }
    }
    setFormError(null);
    router.push(statementHref(schemeValue, period, from, to));
  }

  const choiceCards: StatementCardItem[] = [
    {
      id: "all",
      label: "All schemes",
      value: portfolio.total != null ? formatGhs(portfolio.total, 2) : "Unavailable",
      subline: portfolio.updatedAt
        ? `Latest unit price ${formatPensionDate(portfolio.updatedAt)}`
        : "Every membership on your account",
      color: CARD_BLUE,
      href: statementHref("all", period, from, to),
    },
    ...memberships.map((membership) => {
      const figures = figuresForMembership(membership, contributions, withdrawals);
      const priced = figures.value != null && Boolean(membership.unitPriceDate);
      return {
        id: membership.id,
        label: membership.schemeName,
        value: figures.value != null ? formatGhs(figures.value, 2) : "Unavailable",
        subline: schemeCardSubline(membership, priced),
        color: schemeCardColor(membership),
        href: statementHref(membership.id, period, from, to),
      };
    }),
  ];

  const summaryCards: StatementCardItem[] = statementOpen
    ? [
        {
          id: "pot",
          label: requestedId === "all" ? "Total pension value" : "Pot value",
          value:
            requestedId === "all"
              ? portfolio.total != null
                ? formatGhs(portfolio.total, 2)
                : "Unavailable"
              : sections[0]?.pot != null
                ? formatGhs(sections[0].pot, 2)
                : "Unavailable",
          subline:
            requestedId === "all"
              ? portfolio.updatedAt
                ? `Latest unit price ${formatPensionDate(portfolio.updatedAt)}`
                : "Current value of units held"
              : selectedMembership
                ? membershipKindLabel(selectedMembership)
                : "Current value of units held",
          color: CARD_BLUE,
        },
        requestedId === "all"
          ? {
              id: "schemes",
              label: "Schemes",
              value: String(sections.length),
              subline: "Included in this statement",
              color: CARD_GREEN,
            }
          : {
              id: "units",
              label: "Units held",
              value: sections[0]?.units != null ? formatUnits(sections[0].units) : "Unavailable",
              subline:
                selectedMembership && sections[0]?.pot != null
                  ? `Unit price ${formatPensionDate(selectedMembership.unitPriceDate)}`
                  : "Units currently held",
              color: CARD_GREEN,
            },
        {
          id: "received",
          label: resolved.range ? "Received in this period" : "Contributions received",
          value: formatGhs(received, 2),
          subline: resolved.range
            ? `${paymentCount} ${paymentCount === 1 ? "payment" : "payments"} in this period`
            : "Money paid in. Not the current pot value.",
          color: CARD_GOLD,
        },
      ]
    : [];

  const exportSections = sections.map((section) => ({
    membership: section.membership,
    contributions: section.contributions,
    withdrawals: section.withdrawals,
    pot: section.pot,
    units: section.units,
    contributed: section.contributed,
  }));

  return (
    <PensionPage>
      <PensionPageHeader
        className="print:hidden"
        title={statementOpen ? (requestedId === "all" ? "Account statement" : selectedMembership?.schemeName ?? "Statement") : "Statements"}
        description={
          statementOpen
            ? `${resolved.label}. Prepared ${formatPensionDate(new Date().toISOString())} for ${name}.`
            : "Request a statement for every scheme, or for one membership, and choose the period it covers."
        }
        action={
          statementOpen ? (
            <div className="flex flex-wrap gap-2 print:hidden">
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/statement">All statements</Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline">
                    <Download />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      if (requestedId === "all") {
                        downloadAccountStatementExcel({
                          member,
                          periodLabel: resolved.label,
                          sections: exportSections,
                        });
                        return;
                      }
                      const section = exportSections[0];
                      if (!section) return;
                      downloadStatementExcel({
                        member,
                        membership: section.membership,
                        contributions: section.contributions,
                        withdrawals: section.withdrawals,
                        pot: section.pot,
                        units: section.units,
                        contributed: section.contributed,
                        periodLabel: resolved.label,
                      });
                    }}
                  >
                    <FileSpreadsheet />
                    Excel workbook
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      if (requestedId === "all") {
                        downloadAccountStatementCsv({
                          member,
                          periodLabel: resolved.label,
                          sections: exportSections,
                        });
                        return;
                      }
                      const section = exportSections[0];
                      if (!section) return;
                      downloadStatementCsv({
                        member,
                        membership: section.membership,
                        contributions: section.contributions,
                        withdrawals: section.withdrawals,
                        pot: section.pot,
                        units: section.units,
                        contributed: section.contributed,
                        periodLabel: resolved.label,
                      });
                    }}
                  >
                    <FileText />
                    CSV file
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button type="button" onClick={() => window.print()}>
                <Printer />
                Print statement
              </Button>
            </div>
          ) : null
        }
      />

      <StatementRequest
        memberships={memberships}
        scheme={schemeValue}
        period={period}
        from={from}
        to={to}
        error={error}
        submitLabel={statementOpen ? "Update statement" : "Open statement"}
        onScheme={(value) => {
          setScheme(value);
          setFormError(null);
        }}
        onPeriod={(value) => {
          setPeriod(value);
          setFormError(null);
        }}
        onFrom={(value) => {
          setFrom(value);
          setFormError(null);
        }}
        onTo={(value) => {
          setTo(value);
          setFormError(null);
        }}
        onSubmit={openStatement}
      />

      {unknownMembership ? (
        <DashboardEmptyState
          icon={<FileText />}
          title="Statement not found"
          description="This membership is not on your account."
          action={{ label: "View statements", href: "/dashboard/statement" }}
        />
      ) : statementOpen ? (
        <>
          <div className="print:hidden">
            <StatementCards items={summaryCards} />
          </div>
          <StatementDocument
            member={member}
            name={name}
            periodLabel={resolved.label}
            bounded={resolved.range != null}
            sections={sections}
          />
        </>
      ) : (
        <section aria-label="Statements">
          <StatementCards items={choiceCards} />
        </section>
      )}
    </PensionPage>
  );
}

function schemeCardColor(membership: Membership): string {
  if (membership.status === "closed") return CARD_MUTED;
  return membership.kind === "employer" ? CARD_GOLD : CARD_GREEN;
}

function schemeCardSubline(membership: Membership, priced: boolean): string {
  if (membership.status === "closed") return "Closed";
  const kind = membershipKindLabel(membership);
  if (membership.kind === "employer" && membership.employerName) {
    return priced ? `${kind} · ${membership.employerName}` : kind;
  }
  return priced ? `${kind} · Open on your account` : kind;
}

function sumAmounts(rows: { amount: number }[]): number {
  return Math.round(
    rows.reduce((sum, row) => sum + (Number.isFinite(row.amount) ? row.amount : 0), 0) * 100,
  ) / 100;
}

function StatementCards({ items }: { items: StatementCardItem[] }) {
  return (
    <div
      className={cn(
        "grid gap-3",
        items.length >= 3 ? "grid-cols-1 @xl/dash:grid-cols-3" : "grid-cols-1 @xl/dash:grid-cols-2",
      )}
    >
      {items.map((item) => {
        const className =
          "flex h-full flex-col rounded-xl border border-border p-4 text-left";
        const style = {
          background: `linear-gradient(165deg, color-mix(in srgb, ${item.color} 14%, white) 0%, #ffffff 58%)`,
        };
        const body = (
          <>
            <p className="text-xs leading-5 text-muted-foreground">{formatUiLabel(item.label)}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{item.value}</p>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">{item.subline}</p>
          </>
        );
        if (item.href) {
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                className,
                "transition-[border-color] duration-150 hover:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
              style={style}
            >
              {body}
            </Link>
          );
        }
        return (
          <article key={item.id} className={className} style={style}>
            {body}
          </article>
        );
      })}
    </div>
  );
}

function StatementRequest({
  memberships,
  scheme,
  period,
  from,
  to,
  error,
  submitLabel,
  onScheme,
  onPeriod,
  onFrom,
  onTo,
  onSubmit,
}: {
  memberships: Membership[];
  scheme: string;
  period: StatementPeriodId;
  from: string;
  to: string;
  error: string | null;
  submitLabel: string;
  onScheme: (value: string) => void;
  onPeriod: (value: StatementPeriodId) => void;
  onFrom: (value: string) => void;
  onTo: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-border bg-card p-4 print:hidden">
      <h2 className="text-sm font-medium">Request a statement</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose every scheme, or one membership, and the period the statement should cover.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="grid w-full gap-1.5 sm:w-64">
          <Label htmlFor="statement-scheme">Scheme</Label>
          <Select value={scheme} onValueChange={onScheme}>
            <SelectTrigger id="statement-scheme" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All schemes</SelectItem>
              {memberships.map((membership) => (
                <SelectItem key={membership.id} value={membership.id}>
                  {membership.schemeName}
                  {membership.status === "closed" ? " (Closed)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid w-full gap-1.5 sm:w-52">
          <Label htmlFor="statement-period">Time frame</Label>
          <Select value={period} onValueChange={(value) => onPeriod(value as StatementPeriodId)}>
            <SelectTrigger id="statement-period" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATEMENT_PERIODS.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {period === "custom" ? (
          <>
            <div className="grid w-full gap-1.5 sm:w-40">
              <Label htmlFor="statement-from">From</Label>
              <Input
                id="statement-from"
                type="date"
                value={from}
                aria-invalid={error ? true : undefined}
                onChange={(event) => onFrom(event.target.value)}
              />
            </div>
            <div className="grid w-full gap-1.5 sm:w-40">
              <Label htmlFor="statement-to">To</Label>
              <Input
                id="statement-to"
                type="date"
                value={to}
                aria-invalid={error ? true : undefined}
                onChange={(event) => onTo(event.target.value)}
              />
            </div>
          </>
        ) : null}
        <Button type="submit">{submitLabel}</Button>
      </div>
      {error ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}

type StatementSection = {
  membership: Membership;
  contributions: Contribution[];
  withdrawals: Withdrawal[];
  pot: number | null;
  units: number | null;
  contributed: number;
};

function StatementDocument({
  member,
  name,
  periodLabel,
  bounded,
  sections,
}: {
  member: PensionMember;
  name: string;
  periodLabel: string;
  bounded: boolean;
  sections: StatementSection[];
}) {
  const single = sections.length === 1 ? sections[0] : null;

  return (
    <article
      id="pension-statement"
      className="rounded-xl bg-white p-6 text-black ring-1 ring-foreground/10 sm:p-8 print:ring-0"
    >
      <header className="flex flex-col gap-1 border-b border-black/10 pb-4">
        <p className="text-sm text-neutral-600">United Pension Trustees</p>
        <h1 className="text-2xl font-semibold">
          {single ? `${single.membership.schemeName} statement` : "Account statement"}
        </h1>
        <p className="text-sm text-neutral-600">{periodLabel}</p>
        <p className="text-sm text-neutral-600">
          Prepared {formatPensionDate(new Date().toISOString())}
        </p>
      </header>

      <section className="grid gap-3 py-5 text-sm sm:grid-cols-2">
        <Row label="Member" value={name} />
        <Row label="Mobile" value={member.mobile} />
        <Row label="Profession" value={member.profession} />
        <Row label="Location" value={member.location} />
        <Row label="Date of birth" value={member.dateOfBirth ? formatPensionDate(member.dateOfBirth) : "Unavailable"} />
        <Row label="Next of kin" value={`${member.nextOfKin} · ${member.nextOfKinContact}`} />
        {single ? (
          <>
            <Row label="Member number" value={single.membership.memberNumber} />
            <Row label="Scheme" value={single.membership.schemeName} />
            <Row label="Membership" value={membershipKindLabel(single.membership)} />
            {single.membership.kind === "employer" && single.membership.employerName ? (
              <Row label="Employer" value={single.membership.employerName} />
            ) : null}
            <Row
              label="Member since"
              value={single.membership.memberSince ? formatPensionDate(single.membership.memberSince) : "Unavailable"}
            />
          </>
        ) : (
          <Row label="Schemes" value={String(sections.length)} />
        )}
      </section>

      {sections.map((section) => (
        <SchemeBlock key={section.membership.id} section={section} bounded={bounded} showHeading={!single} />
      ))}
    </article>
  );
}

function SchemeBlock({
  section,
  bounded,
  showHeading,
}: {
  section: StatementSection;
  bounded: boolean;
  showHeading: boolean;
}) {
  const { membership } = section;
  const priced = section.pot != null && section.units != null;
  const rows = [...section.contributions].reverse();

  return (
    <section className="border-t border-black/10 py-5">
      {showHeading ? (
        <header className="mb-4">
          <h2 className="text-lg font-semibold">{membership.schemeName}</h2>
          <p className="text-sm text-neutral-600">
            {membershipKindLabel(membership)}
            {membership.kind === "employer" && membership.employerName ? ` · ${membership.employerName}` : ""}
            {` · ${membership.memberNumber}`}
          </p>
        </header>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Figure label="Pot value" value={section.pot != null ? formatGhs(section.pot, 2) : "Unavailable"} />
        <Figure label="Units" value={section.units != null ? formatUnits(section.units) : "Unavailable"} />
        <Figure
          label="Unit price"
          value={
            priced
              ? `${formatGhs(membership.unitPrice, 4)} on ${formatPensionDate(membership.unitPriceDate)}`
              : "Unavailable"
          }
        />
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-medium">Contributions</h3>
        <p className="mb-3 text-sm text-neutral-600">
          {formatGhs(section.contributed, 2)} received{bounded ? " in this period" : ""}. This is money paid in, not the current pot value.
        </p>
        {rows.length === 0 ? (
          <p className="text-sm text-neutral-600">
            {bounded ? "No contributions in this period." : "No contributions recorded for this scheme."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left text-neutral-600">
                <th className="py-2 pr-3 font-medium">Date</th>
                <th className="py-2 pr-3 font-medium">Amount</th>
                <th className="py-2 font-medium">Units</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-black/5">
                  <td className="py-2 pr-3">{formatPensionDate(row.date)}</td>
                  <td className="py-2 pr-3 tabular-nums">{formatGhs(row.amount, 2)}</td>
                  <td className="py-2 tabular-nums">{formatUnits(row.units)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {section.withdrawals.length > 0 ? (
        <div className="mt-5">
          <h3 className="text-sm font-medium">Withdrawals</h3>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left text-neutral-600">
                <th className="py-2 pr-3 font-medium">Date</th>
                <th className="py-2 pr-3 font-medium">Amount</th>
                <th className="py-2 pr-3 font-medium">Reason</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {section.withdrawals.map((row) => (
                <tr key={row.id} className="border-b border-black/5">
                  <td className="py-2 pr-3">{formatPensionDate(row.submittedAt)}</td>
                  <td className="py-2 pr-3 tabular-nums">{formatGhs(row.amount, 2)}</td>
                  <td className="py-2 pr-3">{row.reason}</td>
                  <td className="py-2">
                    {isWithdrawalStatus(row.status) ? WITHDRAWAL_BADGE_LABEL[row.status] : row.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-neutral-600">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-neutral-600">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
