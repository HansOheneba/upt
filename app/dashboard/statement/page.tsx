"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Download, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { DashboardEmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PensionPage, PensionPageHeader } from "@/components/pension/page-frame";
import { usePensionReady } from "@/components/pension/use-pension-ready";
import {
  downloadStatementCsv,
  downloadStatementExcel,
} from "@/lib/pension/export-statement";
import {
  formatGhs,
  formatPensionDate,
  formatUnits,
  memberName,
  outstandingUnits,
  potValue,
} from "@/lib/pension/metrics";
import { usePensionStore } from "@/store/pensionStore";

export default function StatementPage() {
  const ready = usePensionReady();
  const member = usePensionStore((state) => state.member);
  const contributions = usePensionStore((state) => state.contributions);
  const withdrawals = usePensionStore((state) => state.withdrawals);

  const summary = useMemo(() => {
    if (!member) return null;
    const units = outstandingUnits(contributions, withdrawals, member.unitPrice);
    return {
      units,
      pot: potValue(units, member.unitPrice),
      contributed: contributions.reduce((sum, row) => sum + row.amount, 0),
    };
  }, [member, contributions, withdrawals]);

  if (!ready) {
    return (
      <PensionPage>
        <div className="h-40" />
      </PensionPage>
    );
  }

  if (!member || !summary) {
    return (
      <PensionPage>
        <PensionPageHeader
          title="Statement"
          description="Your pot, units, and every contribution, ready to print or download."
        />
        <DashboardEmptyState
          icon={<FileText />}
          title="Your statement opens with your account"
          description="Once your membership is active, this page holds your pot, units, and every contribution you can print or download."
          action={{
            label: "Open an account",
            href: "/onboarding",
          }}
        />
      </PensionPage>
    );
  }

  const rows = [...contributions].reverse();
  const exportInput = {
    member,
    contributions,
    withdrawals,
    pot: summary.pot,
    units: summary.units,
    contributed: summary.contributed,
  };

  return (
    <PensionPage>
      <PensionPageHeader
        className="print:hidden"
        title="Statement"
        description={`Prepared ${formatPensionDate(new Date().toISOString())} for ${memberName(member)}.`}
        action={
          <div className="flex flex-wrap gap-2 print:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline">
                  <Download />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => downloadStatementExcel(exportInput)}>
                  <FileSpreadsheet />
                  Excel workbook
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadStatementCsv(exportInput)}>
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
        }
      />
      <article
        id="pension-statement"
        className="rounded-xl bg-white p-6 text-black ring-1 ring-foreground/10 sm:p-8 print:ring-0"
      >
        <header className="flex flex-col gap-1 border-b border-black/10 pb-4">
          <p className="text-sm text-neutral-600">United Pension Trustees</p>
          <h1 className="text-2xl font-semibold">My Own Pension statement</h1>
          <p className="text-sm text-neutral-600">
            Prepared {formatPensionDate(new Date().toISOString())}
          </p>
        </header>

        <section className="grid gap-3 py-5 text-sm sm:grid-cols-2">
          <Row label="Member" value={memberName(member)} />
          <Row label="Member number" value={member.id.toUpperCase()} />
          <Row label="Mobile" value={member.mobile} />
          <Row label="Profession" value={member.profession} />
          <Row label="Location" value={member.location} />
          <Row label="Date of birth" value={formatPensionDate(member.dateOfBirth)} />
          <Row label="Next of kin" value={`${member.nextOfKin} · ${member.nextOfKinContact}`} />
          <Row label="Scheme" value={member.scheme} />
          <Row label="Member since" value={formatPensionDate(member.memberSince)} />
        </section>

        <section className="grid gap-3 border-t border-black/10 py-5 sm:grid-cols-3">
          <Figure label="Pot value" value={formatGhs(summary.pot, 2)} />
          <Figure label="Units" value={formatUnits(summary.units)} />
          <Figure
            label="Unit price"
            value={`${formatGhs(member.unitPrice, 4)} on ${formatPensionDate(member.unitPriceDate)}`}
          />
        </section>

        <section className="border-t border-black/10 pt-5">
          <h2 className="text-sm font-medium">Contributions</h2>
          <p className="mb-3 text-sm text-neutral-600">
            {formatGhs(summary.contributed, 0)} received by Mobile Money.
          </p>
          {rows.length === 0 ? (
            <p className="text-sm text-neutral-600">
              Your confirmed pension contributions will appear here.{" "}
              <Link href="/dashboard/contributions" className="font-medium text-black underline print:hidden">
                View contributions
              </Link>
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
                    <td className="py-2 pr-3 tabular-nums">{formatGhs(row.amount, 0)}</td>
                    <td className="py-2 tabular-nums">{formatUnits(row.units)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {withdrawals.length > 0 ? (
          <section className="border-t border-black/10 pt-5">
            <h2 className="text-sm font-medium">Withdrawals</h2>
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
                {withdrawals.map((row) => (
                  <tr key={row.id} className="border-b border-black/5">
                    <td className="py-2 pr-3">{formatPensionDate(row.submittedAt)}</td>
                    <td className="py-2 pr-3 tabular-nums">{formatGhs(row.amount, 0)}</td>
                    <td className="py-2 pr-3">{row.reason}</td>
                    <td className="py-2 capitalize">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}
      </article>
    </PensionPage>
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
