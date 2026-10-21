import * as XLSX from "xlsx";
import { contributionSourceLabel } from "@/lib/pension/contributions";
import type { Contribution, Membership, PensionMember, Withdrawal } from "@/lib/pension/types";
import {
  formatGhs,
  formatPensionDate,
  formatUnits,
  memberName,
} from "@/lib/pension/metrics";
import { WITHDRAWAL_BADGE_LABEL, isWithdrawalStatus } from "@/lib/pension/withdrawals";

export type StatementExportInput = {
  member: PensionMember;
  membership: Membership;
  contributions: Contribution[];
  withdrawals: Withdrawal[];
  pot: number | null;
  units: number | null;
  contributed: number;
  periodLabel?: string;
};

function fileBase(membership: Membership): string {
  const slug = membership.schemeName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${slug || "pension"}-statement-${membership.memberNumber}`;
}

function summaryRows(input: StatementExportInput): string[][] {
  const { member, membership } = input;
  const price = Number.isFinite(membership.unitPrice) && membership.unitPrice > 0
    ? `${formatGhs(membership.unitPrice, 4)} on ${formatPensionDate(membership.unitPriceDate)}`
    : "Unavailable";
  const rows: string[][] = [
    ["United Pension Trustees"],
    [`${membership.schemeName} statement`],
    ["Prepared", formatPensionDate(new Date().toISOString())],
  ];
  if (input.periodLabel) rows.push(["Period", input.periodLabel]);
  rows.push(
    [],
    ["Member", memberName(member)],
    ["Member number", membership.memberNumber],
    ["Mobile", member.mobile],
    ["Profession", member.profession],
    ["Location", member.location],
    ["Date of birth", member.dateOfBirth ? formatPensionDate(member.dateOfBirth) : ""],
    ["Next of kin", `${member.nextOfKin} · ${member.nextOfKinContact}`],
    ["Scheme", membership.schemeName],
    ["Member since", membership.memberSince ? formatPensionDate(membership.memberSince) : ""],
    ["Pot value", input.pot != null ? formatGhs(input.pot, 2) : "Unavailable"],
    ["Units", input.units != null ? formatUnits(input.units) : "Unavailable"],
    ["Unit price", price],
    ["Contributions received", formatGhs(input.contributed, 2)],
  );
  return rows;
}

function contributionRows(contributions: Contribution[]): string[][] {
  return [
    ["Date", "Amount (GHS)", "Unit price", "Units", "Source"],
    ...[...contributions]
      .reverse()
      .map((row) => [
        formatPensionDate(row.date),
        formatGhs(row.amount, 2),
        formatGhs(row.unitPrice, 4),
        formatUnits(row.units),
        contributionSourceLabel(row.channel),
      ]),
  ];
}

function withdrawalRows(withdrawals: Withdrawal[]): string[][] {
  return [
    ["Submitted", "Amount (GHS)", "Reason", "Status", "Destination"],
    ...withdrawals.map((row) => [
      formatPensionDate(row.submittedAt),
      formatGhs(row.amount, 2),
      row.reason,
      isWithdrawalStatus(row.status) ? WITHDRAWAL_BADGE_LABEL[row.status] : row.status,
      `${row.destinationType === "momo" ? "Mobile Money" : "Bank"} ${row.destination}`,
    ]),
  ];
}

export function downloadStatementExcel(input: StatementExportInput): void {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    book,
    XLSX.utils.aoa_to_sheet(summaryRows(input)),
    "Summary",
  );
  XLSX.utils.book_append_sheet(
    book,
    XLSX.utils.aoa_to_sheet(contributionRows(input.contributions)),
    "Contributions",
  );
  XLSX.utils.book_append_sheet(
    book,
    XLSX.utils.aoa_to_sheet(withdrawalRows(input.withdrawals)),
    "Withdrawals",
  );
  XLSX.writeFile(book, `${fileBase(input.membership)}.xlsx`);
}

export function downloadStatementCsv(input: StatementExportInput): void {
  const rows = [
    ...summaryRows(input),
    [],
    ["Contributions"],
    ...contributionRows(input.contributions),
    [],
    ["Withdrawals"],
    ...withdrawalRows(input.withdrawals),
  ];
  const csv = XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet(rows));
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileBase(input.membership)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export type AccountStatementSection = {
  membership: Membership;
  contributions: Contribution[];
  withdrawals: Withdrawal[];
  pot: number | null;
  units: number | null;
  contributed: number;
};

export type AccountStatementExportInput = {
  member: PensionMember;
  periodLabel: string;
  sections: AccountStatementSection[];
};

function accountSummaryRows(input: AccountStatementExportInput): string[][] {
  const { member } = input;
  const rows: string[][] = [
    ["United Pension Trustees"],
    ["Account statement"],
    ["Prepared", formatPensionDate(new Date().toISOString())],
    ["Period", input.periodLabel],
    [],
    ["Member", memberName(member)],
    ["Mobile", member.mobile],
    ["Profession", member.profession],
    ["Location", member.location],
    ["Date of birth", member.dateOfBirth ? formatPensionDate(member.dateOfBirth) : ""],
    ["Next of kin", `${member.nextOfKin} · ${member.nextOfKinContact}`],
    [],
    ["Scheme", "Member number", "Pot value", "Units", "Unit price", "Contributions in period"],
  ];
  for (const section of input.sections) {
    const price = Number.isFinite(section.membership.unitPrice) && section.membership.unitPrice > 0
      ? `${formatGhs(section.membership.unitPrice, 4)} on ${formatPensionDate(section.membership.unitPriceDate)}`
      : "Unavailable";
    rows.push([
      section.membership.schemeName,
      section.membership.memberNumber,
      section.pot != null ? formatGhs(section.pot, 2) : "Unavailable",
      section.units != null ? formatUnits(section.units) : "Unavailable",
      price,
      formatGhs(section.contributed, 2),
    ]);
  }
  return rows;
}

function accountContributionRows(sections: AccountStatementSection[]): string[][] {
  const rows: string[][] = [["Scheme", "Date", "Amount (GHS)", "Unit price", "Units", "Source"]];
  for (const section of sections) {
    for (const row of [...section.contributions].reverse()) {
      rows.push([
        section.membership.schemeName,
        formatPensionDate(row.date),
        formatGhs(row.amount, 2),
        formatGhs(row.unitPrice, 4),
        formatUnits(row.units),
        contributionSourceLabel(row.channel),
      ]);
    }
  }
  return rows;
}

function accountWithdrawalRows(sections: AccountStatementSection[]): string[][] {
  const rows: string[][] = [["Scheme", "Submitted", "Amount (GHS)", "Reason", "Status", "Destination"]];
  for (const section of sections) {
    for (const row of section.withdrawals) {
      rows.push([
        section.membership.schemeName,
        formatPensionDate(row.submittedAt),
        formatGhs(row.amount, 2),
        row.reason,
        isWithdrawalStatus(row.status) ? WITHDRAWAL_BADGE_LABEL[row.status] : row.status,
        `${row.destinationType === "momo" ? "Mobile Money" : "Bank"} ${row.destination}`,
      ]);
    }
  }
  return rows;
}

function saveCsv(filename: string, rows: string[][]): void {
  const csv = XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet(rows));
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadAccountStatementExcel(input: AccountStatementExportInput): void {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(accountSummaryRows(input)), "Summary");
  XLSX.utils.book_append_sheet(
    book,
    XLSX.utils.aoa_to_sheet(accountContributionRows(input.sections)),
    "Contributions",
  );
  XLSX.utils.book_append_sheet(
    book,
    XLSX.utils.aoa_to_sheet(accountWithdrawalRows(input.sections)),
    "Withdrawals",
  );
  XLSX.writeFile(book, "pension-account-statement.xlsx");
}

export function downloadAccountStatementCsv(input: AccountStatementExportInput): void {
  saveCsv("pension-account-statement.csv", [
    ...accountSummaryRows(input),
    [],
    ["Contributions"],
    ...accountContributionRows(input.sections),
    [],
    ["Withdrawals"],
    ...accountWithdrawalRows(input.sections),
  ]);
}
