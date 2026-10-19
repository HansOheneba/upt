import { formatPensionDate } from "@/lib/pension/metrics";
import type { Withdrawal, WithdrawalDestination, WithdrawalStatus } from "@/lib/pension/types";

/** The only statuses the pension record stores, in workflow order. */
export const WITHDRAWAL_FLOW = ["received", "checking", "approved", "paid"] as const satisfies readonly WithdrawalStatus[];

export const WITHDRAWAL_STAGE_LABEL: Record<WithdrawalStatus, string> = {
  received: "Received",
  checking: "Under review",
  approved: "Approved",
  paid: "Payment completed",
};

/** Shorter label for badges. Payment completed stays on the stepper. */
export const WITHDRAWAL_BADGE_LABEL: Record<WithdrawalStatus, string> = {
  received: "Received",
  checking: "Under review",
  approved: "Approved",
  paid: "Paid",
};

const LOAD_ERROR = "We could not load your withdrawal requests.";

export { LOAD_ERROR as WITHDRAWAL_LOAD_ERROR };

export function isWithdrawalStatus(value: string): value is WithdrawalStatus {
  return (WITHDRAWAL_FLOW as readonly string[]).includes(value);
}

export type WithdrawalStageState = "complete" | "current" | "upcoming";

export function withdrawalStageState(
  status: WithdrawalStatus,
  step: WithdrawalStatus,
): WithdrawalStageState {
  if (status === "paid") return "complete";
  const current = WITHDRAWAL_FLOW.indexOf(status);
  const index = WITHDRAWAL_FLOW.indexOf(step);
  if (index < current) return "complete";
  if (index === current) return "current";
  return "upcoming";
}

export function withdrawalExplanation(status: string): string {
  switch (status) {
    case "received":
      return "We have received your withdrawal request. We will notify you when its status changes.";
    case "checking":
      return "Your withdrawal request is being reviewed. We will notify you when its status changes.";
    case "approved":
      return "Your withdrawal request has been approved. Payment has not been completed yet.";
    case "paid":
      return "Your request has been approved and payment has been made.";
    default:
      return "We do not have a progress update for this request yet.";
  }
}

export type WithdrawalSummary = {
  total: number;
  inProgress: number;
  completed: number;
};

/** Paid is completed. Every earlier known status is still in progress. */
export function summarizeWithdrawals(rows: Withdrawal[]): WithdrawalSummary {
  let inProgress = 0;
  let completed = 0;
  for (const row of rows) {
    if (row.status === "paid") completed += 1;
    else if (isWithdrawalStatus(row.status)) inProgress += 1;
  }
  return { total: rows.length, inProgress, completed };
}

export function withdrawalSubmittedLabel(iso: string | undefined | null): string | null {
  if (!iso) return null;
  const date = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(date.getTime())) return null;
  return formatPensionDate(iso);
}

/** Show a date only for the submission, which is the one timestamp we store. */
export function withdrawalStageTimestamp(
  step: WithdrawalStatus,
  submittedAt: string | undefined | null,
): string | null {
  if (step !== "received") return null;
  return withdrawalSubmittedLabel(submittedAt);
}

export function paymentChannelLabel(type: WithdrawalDestination | string | undefined): string {
  if (type === "momo") return "Mobile Money";
  if (type === "bank") return "Bank account";
  return "Payment account";
}

export function maskPaymentIdentifier(value: string | undefined | null): string | null {
  const compact = (value ?? "").replace(/\s+/g, "");
  if (!compact) return null;
  if (compact.length <= 4) return "••••";
  return `•••• ${compact.slice(-4)}`;
}
