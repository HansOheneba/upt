import * as XLSX from "xlsx";
import type { Contribution, PensionMember, Withdrawal } from "@/lib/pension/types";
import {
  formatGhs,
  formatPensionDate,
  formatUnits,
  memberName,
} from "@/lib/pension/metrics";

export type StatementExportInput = {
  member: PensionMember;
  contributions: Contribution[];
  withdrawals: Withdrawal[];
  pot: number;
  units: number;
  contributed: number;
};

function fileBase(member: PensionMember): string {
  return `my-own-pension-statement-${member.id}`;
}

function summaryRows(input: StatementExportInput): string[][] {
  const { member } = input;
  return [
    ["United Pension Trustees"],
    ["My Own Pension statement"],
    ["Prepared", formatPensionDate(new Date().toISOString())],
    [],
    ["Member", memberName(member)],
    ["Member number", member.id.toUpperCase()],
    ["Mobile", member.mobile],
    ["Profession", member.profession],
    ["Location", member.location],
    ["Next of kin", `${member.nextOfKin} · ${member.nextOfKinContact}`],
    ["Scheme", member.scheme],
    ["Member since", formatPensionDate(member.memberSince)],
    ["Pot value", formatGhs(input.pot, 2)],
    ["Units", formatUnits(input.units)],
    [
      "Unit price",
      `${formatGhs(member.unitPrice, 4)} on ${formatPensionDate(member.unitPriceDate)}`,
    ],
    ["Contributions received", formatGhs(input.contributed, 2)],
  ];
}

function contributionRows(contributions: Contribution[]): string[][] {
  return [
    ["Date", "Amount (GHS)", "Unit price", "Units", "Channel"],
    ...[...contributions]
      .reverse()
      .map((row) => [
        formatPensionDate(row.date),
        formatGhs(row.amount, 2),
        formatGhs(row.unitPrice, 4),
        formatUnits(row.units),
        "MTN Mobile Money",
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
      row.status,
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
  XLSX.writeFile(book, `${fileBase(input.member)}.xlsx`);
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
  link.download = `${fileBase(input.member)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
