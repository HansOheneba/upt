import { formatGhs, formatPensionDate } from "@/lib/pension/metrics";
import type {
  Membership,
  PensionMember,
  PensionSnapshot,
  Withdrawal,
  WithdrawalDestination,
  WithdrawalStatus,
  WithdrawalStatusEvent,
} from "@/lib/pension/types";

/**
 * Happy-path stages, in order. Declined is not one of these steps.
 * Payment processing and payment failed are not statuses on the member record.
 */
export const WITHDRAWAL_FLOW = ["received", "checking", "approved", "paid"] as const satisfies readonly WithdrawalStatus[];

const WITHDRAWAL_STATUSES = [...WITHDRAWAL_FLOW, "declined"] as const satisfies readonly WithdrawalStatus[];

export const WITHDRAWAL_STAGE_LABEL: Record<WithdrawalStatus, string> = {
  received: "Received",
  checking: "Under review",
  approved: "Approved",
  paid: "Payment completed",
  declined: "Declined",
};

/** Shorter label for badges. Payment completed stays on the stepper. */
export const WITHDRAWAL_BADGE_LABEL: Record<WithdrawalStatus, string> = {
  received: "Received",
  checking: "Under review",
  approved: "Approved",
  paid: "Paid",
  declined: "Declined",
};

/** Reasons the staff procedure records. Other requires an explanation. */
export const WITHDRAWAL_REASONS = [
  "School fees",
  "Medical",
  "Rent",
  "Partial withdrawal",
  "Other",
] as const;

export type WithdrawalReason = (typeof WITHDRAWAL_REASONS)[number];

/** Bump when the confirmed request shape changes. */
export const WITHDRAWAL_REQUEST_VERSION = 1;

export const WITHDRAWAL_AUTHORIZATION_STATEMENT =
  "I confirm that the withdrawal details are accurate and authorize United Pension Trustees to process this request, subject to the applicable scheme rules and approval process.";

const GHANA_MOBILE = /^0\d{9}$/;
const SAVE_ERROR = "We could not save this request. Try again.";

export { SAVE_ERROR as WITHDRAWAL_SAVE_ERROR };

const LOAD_ERROR = "We could not load your withdrawal requests.";

export { LOAD_ERROR as WITHDRAWAL_LOAD_ERROR };

export const WITHDRAWAL_PAGE_SIZE = 6;

export function isWithdrawalReason(value: string): value is WithdrawalReason {
  return (WITHDRAWAL_REASONS as readonly string[]).includes(value);
}

export function isGhanaMobile(value: string): boolean {
  return GHANA_MOBILE.test(value.trim());
}

/** Open requests still reserve value. Paid and declined do not. */
export function withdrawalReservesValue(status: WithdrawalStatus): boolean {
  return status === "received" || status === "checking" || status === "approved";
}

/** Fields that must already be on the account before a withdrawal can be sent. */
export function registeredDetailGaps(member: PensionMember): string[] {
  const gaps: string[] = [];
  if (!`${member.firstName} ${member.lastName}`.trim()) gaps.push("Full name");
  if (!isGhanaMobile(member.mobile)) gaps.push("Registered mobile number");
  if (!member.profession.trim()) gaps.push("Profession");
  if (!member.location.trim()) gaps.push("Location");
  if (!member.nextOfKin.trim()) gaps.push("Next of kin");
  if (!isGhanaMobile(member.nextOfKinContact)) gaps.push("Next of kin contact");
  return gaps;
}

export function registeredMomoNumber(member: PensionMember): string | null {
  const mobile = member.mobile.trim();
  return isGhanaMobile(mobile) ? mobile : null;
}

/** Bank name and account already on the member. Null when either is missing. */
export function registeredBank(member: PensionMember): { name: string; account: string } | null {
  const name = (member.bankName ?? "").trim();
  const account = normalizeBankAccount(member.bankAccount ?? "");
  if (!name || !account) return null;
  return { name, account };
}

export function isWithdrawalStatus(value: string): value is WithdrawalStatus {
  return (WITHDRAWAL_STATUSES as readonly string[]).includes(value);
}

function isFlowStatus(status: WithdrawalStatus): status is (typeof WITHDRAWAL_FLOW)[number] {
  return (WITHDRAWAL_FLOW as readonly string[]).includes(status);
}

export type WithdrawalStageState = "complete" | "current" | "upcoming";

export function withdrawalStageState(
  status: WithdrawalStatus,
  step: WithdrawalStatus,
): WithdrawalStageState {
  if (status === "declined") {
    if (step === "declined") return "current";
    if (step === "received") return "complete";
    return "upcoming";
  }
  if (status === "paid") return "complete";
  if (!isFlowStatus(status) || !isFlowStatus(step)) return "upcoming";
  const current = WITHDRAWAL_FLOW.indexOf(status);
  const index = WITHDRAWAL_FLOW.indexOf(step);
  if (index < current) return "complete";
  if (index === current) return "current";
  return "upcoming";
}

/** Steps to render. A decline does not mark approval or payment as done. */
export function withdrawalTimelineSteps(
  status: WithdrawalStatus,
  events: WithdrawalStatusEvent[] | undefined,
): WithdrawalStatus[] {
  if (status !== "declined") return [...WITHDRAWAL_FLOW];
  const seen = new Set((events ?? []).map((event) => event.status));
  const steps: WithdrawalStatus[] = ["received"];
  if (seen.has("checking")) steps.push("checking");
  steps.push("declined");
  return steps;
}

export function withdrawalExplanation(status: string): string {
  switch (status) {
    case "received":
      return "Received. We'll update you when the status changes.";
    case "checking":
      return "In review.";
    case "approved":
      return "Approved. Not paid yet.";
    case "paid":
      return "Paid.";
    case "declined":
      return "Declined. No payment was made.";
    default:
      return "No progress update yet.";
  }
}

/** Rejection reason, or a note recorded on the current status. */
export function withdrawalFollowUp(row: Withdrawal): string | null {
  if (row.status === "declined") {
    const reason = row.declineReason?.trim();
    if (reason) return reason;
  }
  const events = row.events ?? [];
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event?.status === row.status && event.note?.trim()) return event.note.trim();
  }
  return null;
}

export type WithdrawalSummary = {
  total: number;
  inProgress: number;
  completed: number;
};

/** Paid is completed. Declined is closed. Every earlier known status is still in progress. */
export function summarizeWithdrawals(rows: Withdrawal[]): WithdrawalSummary {
  let inProgress = 0;
  let completed = 0;
  for (const row of rows) {
    if (row.status === "paid") completed += 1;
    else if (withdrawalReservesValue(row.status)) inProgress += 1;
  }
  return { total: rows.length, inProgress, completed };
}

export function withdrawalSubmittedLabel(iso: string | undefined | null): string | null {
  if (!iso) return null;
  const date = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(date.getTime())) return null;
  return formatPensionDate(iso);
}

/** Date for a stage only when an event records it. Submission dates the received stage. */
export function withdrawalStageTimestamp(
  step: WithdrawalStatus,
  submittedAt: string | undefined | null,
  events?: WithdrawalStatusEvent[],
): string | null {
  const dated = (events ?? []).filter((event) => event.status === step && event.at);
  const at = dated.length > 0 ? dated[dated.length - 1]?.at : step === "received" ? submittedAt : null;
  return withdrawalSubmittedLabel(at);
}

/** Latest date recorded for the current status. Missing dates stay missing. */
export function withdrawalStatusUpdatedAt(row: Withdrawal): string | null {
  return withdrawalStageTimestamp(row.status, row.submittedAt, row.events);
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

export function filterWithdrawals(
  rows: Withdrawal[],
  query: { membershipId: string; status: string },
): Withdrawal[] {
  return rows.filter((row) => {
    if (query.membershipId !== "all" && row.membershipId !== query.membershipId) return false;
    if (query.status !== "all" && row.status !== query.status) return false;
    return true;
  });
}

export type WithdrawalDraft = {
  membershipId: string;
  amount: number;
  reason: string;
  reasonDetail: string;
  destinationType: WithdrawalDestination;
  destination: string;
  authorized: boolean;
  idempotencyKey: string;
};

export type WithdrawalSubmitResult =
  | { ok: true; withdrawal: Withdrawal; duplicate: boolean }
  | { ok: false; error: string };

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function normalizeBankAccount(value: string): string | null {
  const compact = value.replace(/\s+/g, "");
  if (compact.length < 4 || compact.length > 32) return null;
  if (!/^[0-9A-Za-z-]+$/.test(compact)) return null;
  return compact;
}

function cleanIdempotencyKey(value: string): string | null {
  const key = value.trim();
  if (!key || key.length > 80 || !/^[A-Za-z0-9_-]+$/.test(key)) return null;
  return key;
}

/**
 * Checks the draft against the member's own snapshot.
 * Does not change units, value, or profile fields.
 */
export function submitWithdrawal(
  snapshot: Pick<PensionSnapshot, "member" | "memberships" | "contributions" | "withdrawals">,
  draft: WithdrawalDraft,
  now: Date,
  availableFor: (membership: Membership) => number | null,
): WithdrawalSubmitResult {
  const member = snapshot.member;
  if (!member) return { ok: false, error: "Choose a scheme with an amount available." };

  const key = cleanIdempotencyKey(draft.idempotencyKey);
  if (!key) return { ok: false, error: SAVE_ERROR };

  const existing = snapshot.withdrawals.find((row) => row.idempotencyKey === key || row.id === key);
  if (existing) return { ok: true, withdrawal: existing, duplicate: true };

  const membership = snapshot.memberships.find((row) => row.id === draft.membershipId);
  const available = membership ? availableFor(membership) : null;
  if (!membership || available == null) {
    return { ok: false, error: "Choose a scheme with an amount available." };
  }

  const gaps = registeredDetailGaps(member);
  if (gaps.length > 0) {
    return {
      ok: false,
      error: `Update ${gaps.join(", ")} before you can send this request.`,
    };
  }

  const amount = roundMoney(draft.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Enter an amount greater than zero." };
  }
  if (Math.round(amount * 100) > Math.round(available * 100)) {
    return {
      ok: false,
      error: `You can request up to ${formatGhs(available, 2)}.`,
    };
  }

  if (!isWithdrawalReason(draft.reason)) {
    return { ok: false, error: "Choose a reason." };
  }
  const reasonDetail = draft.reasonDetail.trim();
  if (draft.reason === "Other" && !reasonDetail) {
    return { ok: false, error: "Add an explanation." };
  }
  if (reasonDetail.length > 500) {
    return { ok: false, error: "Use 500 characters or fewer." };
  }

  const registered = registeredMomoNumber(member);
  const bank = registeredBank(member);
  let destinationType: WithdrawalDestination;
  let destination: string;
  let bankName: string | undefined;
  if (draft.destinationType === "bank") {
    const account = normalizeBankAccount(draft.destination);
    if (!bank || !account || account !== bank.account) {
      return { ok: false, error: "Use your registered bank account." };
    }
    destinationType = "bank";
    destination = bank.account;
    bankName = bank.name;
  } else if (draft.destinationType === "momo") {
    if (!registered || draft.destination.trim() !== registered) {
      return { ok: false, error: "Use your registered Mobile Money number." };
    }
    destinationType = "momo";
    destination = registered;
  } else {
    return { ok: false, error: "Choose a payment destination." };
  }

  if (!draft.authorized) {
    return {
      ok: false,
      error: "Confirm the statement before you send this request.",
    };
  }

  const submittedAt = now.toISOString();
  const withdrawal: Withdrawal = {
    id: key,
    idempotencyKey: key,
    membershipId: membership.id,
    submittedAt,
    amount,
    reason: draft.reason,
    reasonDetail: draft.reason === "Other" ? reasonDetail : undefined,
    destinationType,
    destination,
    ...(bankName ? { bankName } : {}),
    signatureDataUrl: "",
    status: "received",
    name: `${member.firstName} ${member.lastName}`.trim(),
    mobile: member.mobile.trim(),
    profession: member.profession.trim(),
    location: member.location.trim(),
    nextOfKin: member.nextOfKin.trim(),
    nextOfKinContact: member.nextOfKinContact.trim(),
    authorization: {
      statement: WITHDRAWAL_AUTHORIZATION_STATEMENT,
      confirmedAt: submittedAt,
      requestVersion: WITHDRAWAL_REQUEST_VERSION,
    },
    events: [{ status: "received", at: submittedAt }],
  };

  return { ok: true, withdrawal, duplicate: false };
}
