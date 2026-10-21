import {
  DEMO_MEMBER,
  EMPLOYER_CONTRIBUTIONS,
  EMPLOYER_MEMBERSHIP,
  EMPLOYER_WITHDRAWALS,
  PREVIEW_CONTRIBUTIONS,
  PREVIEW_MEMBER_ID,
  PERSONAL_MEMBERSHIP_ID,
} from "@/lib/pension/demo-data";
import { parseAmountInput } from "@/lib/pension/metrics";
import type {
  Contribution,
  ContributionChannel,
  Membership,
  MembershipKind,
  MembershipStatus,
  PensionMember,
  PensionRequest,
  PensionSnapshot,
  RequestChannel,
  Withdrawal,
  WithdrawalAuthorization,
  WithdrawalDestination,
  WithdrawalStatus,
  WithdrawalStatusEvent,
} from "@/lib/pension/types";

const EMPTY: PensionSnapshot = {
  member: null,
  memberships: [],
  contributions: [],
  withdrawals: [],
  requests: [],
};

type LegacyMember = PensionMember & {
  scheme?: string;
  channel?: ContributionChannel;
  monthlyContribution?: number;
  retirementAge?: number;
  targetPot?: number;
  unitPrice?: number;
  unitPriceDate?: string;
  memberSince?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** A withdrawal amount may be a number or a cedi string such as GH₵1,250.50. */
function money(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = parseAmountInput(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function personFrom(raw: LegacyMember): PensionMember {
  return {
    id: text(raw.id),
    firstName: text(raw.firstName),
    lastName: text(raw.lastName),
    email: text(raw.email),
    mobile: text(raw.mobile),
    profession: text(raw.profession),
    location: text(raw.location),
    dateOfBirth: text(raw.dateOfBirth),
    nextOfKin: text(raw.nextOfKin),
    nextOfKinContact: text(raw.nextOfKinContact),
    bankName: text(raw.bankName),
    bankAccount: text(raw.bankAccount),
  };
}

function isKind(value: unknown): value is MembershipKind {
  return value === "personal" || value === "employer";
}

function isStatus(value: unknown): value is MembershipStatus {
  return value === "active" || value === "closed";
}

function sourceFrom(value: unknown): ContributionChannel {
  if (value === "momo" || value === "mtn_momo") return "momo";
  if (value === "cash" || value === "bank") return value;
  return "momo";
}

function isWithdrawalStatus(value: unknown): value is WithdrawalStatus {
  return (
    value === "received" ||
    value === "checking" ||
    value === "approved" ||
    value === "paid" ||
    value === "declined"
  );
}

function isDestination(value: unknown): value is WithdrawalDestination {
  return value === "momo" || value === "bank";
}

function isRequestChannel(value: unknown): value is RequestChannel {
  return value === "sms" || value === "email" || value === "app";
}

function membershipFromLegacy(member: LegacyMember): Membership {
  const id = member.id === PREVIEW_MEMBER_ID ? PERSONAL_MEMBERSHIP_ID : `mem-${member.id || "scheme"}`;
  return {
    id,
    schemeName: text(member.scheme) || "My Own Pension",
    kind: "personal",
    status: "active",
    memberSince: text(member.memberSince) || new Date().toISOString().slice(0, 10),
    memberNumber: (member.id || "member").toUpperCase(),
    channel: sourceFrom(member.channel),
    monthlyContribution: num(member.monthlyContribution),
    unitPrice: num(member.unitPrice),
    unitPriceDate: text(member.unitPriceDate),
    retirementAge: num(member.retirementAge) || undefined,
    targetPot: num(member.targetPot) || undefined,
  };
}

function asMembership(value: unknown): Membership | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.schemeName !== "string") {
    return null;
  }
  const kind = isKind(value.kind) ? value.kind : "personal";
  return {
    id: value.id,
    schemeName: value.schemeName,
    kind,
    employerName: kind === "employer" && typeof value.employerName === "string" ? value.employerName : undefined,
    status: isStatus(value.status) ? value.status : "active",
    memberSince: text(value.memberSince),
    memberNumber: text(value.memberNumber),
    channel: sourceFrom(value.channel),
    monthlyContribution: num(value.monthlyContribution),
    unitPrice: num(value.unitPrice),
    unitPriceDate: text(value.unitPriceDate),
    retirementAge: typeof value.retirementAge === "number" ? value.retirementAge : undefined,
    targetPot: typeof value.targetPot === "number" ? value.targetPot : undefined,
  };
}

function asContribution(value: unknown, fallbackMembershipId: string): Contribution | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  return {
    id: value.id,
    membershipId: typeof value.membershipId === "string" && value.membershipId
      ? value.membershipId
      : fallbackMembershipId,
    date: text(value.date),
    amount: num(value.amount),
    units: num(value.units),
    unitPrice: num(value.unitPrice),
    channel: sourceFrom(value.channel),
  };
}

function optionalText(value: unknown): string | undefined {
  const next = text(value).trim();
  return next ? next : undefined;
}

function asEvents(value: unknown): WithdrawalStatusEvent[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const events: WithdrawalStatusEvent[] = [];
  for (const row of value) {
    if (!isRecord(row) || !isWithdrawalStatus(row.status)) continue;
    const at = text(row.at).trim();
    if (!at) continue;
    const note = optionalText(row.note);
    events.push(note ? { status: row.status, at, note } : { status: row.status, at });
  }
  return events.length > 0 ? events : undefined;
}

function asAuthorization(value: unknown): WithdrawalAuthorization | undefined {
  if (!isRecord(value)) return undefined;
  const statement = text(value.statement).trim();
  const confirmedAt = text(value.confirmedAt).trim();
  const requestVersion = value.requestVersion;
  if (!statement || !confirmedAt || typeof requestVersion !== "number" || !Number.isFinite(requestVersion)) {
    return undefined;
  }
  return { statement, confirmedAt, requestVersion };
}

function asWithdrawal(value: unknown, fallbackMembershipId: string): Withdrawal | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  if (!isWithdrawalStatus(value.status)) return null;
  const reasonDetail = optionalText(value.reasonDetail);
  const bankName = optionalText(value.bankName);
  const idempotencyKey = optionalText(value.idempotencyKey);
  const declineReason = optionalText(value.declineReason);
  const events = asEvents(value.events);
  const authorization = asAuthorization(value.authorization);
  return {
    id: value.id,
    membershipId: typeof value.membershipId === "string" && value.membershipId
      ? value.membershipId
      : fallbackMembershipId,
    submittedAt: text(value.submittedAt),
    amount: money(value.amount),
    reason: text(value.reason),
    ...(reasonDetail ? { reasonDetail } : {}),
    destinationType: isDestination(value.destinationType) ? value.destinationType : "momo",
    destination: text(value.destination),
    ...(bankName ? { bankName } : {}),
    signatureDataUrl: text(value.signatureDataUrl),
    status: value.status,
    name: text(value.name),
    mobile: text(value.mobile),
    profession: text(value.profession),
    location: text(value.location),
    nextOfKin: text(value.nextOfKin),
    nextOfKinContact: text(value.nextOfKinContact),
    ...(idempotencyKey ? { idempotencyKey } : {}),
    ...(authorization ? { authorization } : {}),
    ...(events ? { events } : {}),
    ...(declineReason ? { declineReason } : {}),
  };
}

function asRequest(value: unknown, fallbackMembershipId: string): PensionRequest | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  const status = value.status === "replied" ? "replied" : value.status === "open" ? "open" : null;
  if (!status) return null;
  return {
    id: value.id,
    membershipId: typeof value.membershipId === "string" ? value.membershipId : fallbackMembershipId,
    subject: text(value.subject),
    body: text(value.body),
    createdAt: text(value.createdAt),
    channel: isRequestChannel(value.channel) ? value.channel : "app",
    status,
    reply: typeof value.reply === "string" ? value.reply : undefined,
    repliedAt: typeof value.repliedAt === "string" ? value.repliedAt : undefined,
  };
}

function mapRows<T>(
  value: unknown,
  map: (row: unknown) => T | null,
): T[] | null {
  if (value == null) return [];
  if (!Array.isArray(value)) return null;
  const rows: T[] = [];
  for (const row of value) {
    const next = map(row);
    if (next) rows.push(next);
  }
  return rows;
}

/**
 * Reads a current snapshot, or a saved single-scheme snapshot from before
 * memberships existed. The preview member also receives the employer scheme
 * from the fixture. Other saved accounts keep the one membership they had.
 */
export function normalizeSnapshot(parsed: unknown): PensionSnapshot | null {
  if (!isRecord(parsed)) return null;
  if ("withdrawals" in parsed && parsed.withdrawals != null && !Array.isArray(parsed.withdrawals)) {
    return null;
  }
  if (!isRecord(parsed.member)) return { ...EMPTY };

  const legacy = parsed.member as LegacyMember;
  const parsedMember = personFrom(legacy);
  const member =
    parsedMember.id === PREVIEW_MEMBER_ID && !parsedMember.bankAccount.trim()
      ? { ...parsedMember, bankName: DEMO_MEMBER.bankName, bankAccount: DEMO_MEMBER.bankAccount }
      : parsedMember;
  const hasMemberships = "memberships" in parsed && Array.isArray(parsed.memberships);

  let memberships: Membership[] = [];
  if (hasMemberships) {
    memberships = (parsed.memberships as unknown[]).map(asMembership).filter((row): row is Membership => row != null);
  } else if (text(legacy.scheme) || text(legacy.memberSince)) {
    memberships = [membershipFromLegacy(legacy)];
    if (member.id === PREVIEW_MEMBER_ID) {
      memberships = [memberships[0], EMPLOYER_MEMBERSHIP];
    }
  }

  const fallbackId = memberships[0]?.id ?? "";
  const contributions = mapRows(parsed.contributions, (row) => asContribution(row, fallbackId));
  const withdrawals = mapRows(parsed.withdrawals, (row) => asWithdrawal(row, fallbackId));
  const requests = mapRows(parsed.requests, (row) => asRequest(row, fallbackId));
  if (!contributions || !withdrawals || !requests) return null;

  let nextContributions = contributions;
  let nextWithdrawals = withdrawals;
  if (member.id === PREVIEW_MEMBER_ID) {
    nextWithdrawals = nextWithdrawals.map((row) =>
      row.destinationType === "bank" && !row.bankName ? { ...row, bankName: DEMO_MEMBER.bankName } : row,
    );
    const sources = new Map(PREVIEW_CONTRIBUTIONS.map((row) => [row.id, row.channel]));
    nextContributions = nextContributions.map((row) => {
      const source = sources.get(row.id);
      return source && source !== row.channel ? { ...row, channel: source } : row;
    });
  }
  if (!hasMemberships && member.id === PREVIEW_MEMBER_ID) {
    const seenContributions = new Set(nextContributions.map((row) => row.id));
    const seenWithdrawals = new Set(nextWithdrawals.map((row) => row.id));
    nextContributions = [
      ...nextContributions,
      ...EMPLOYER_CONTRIBUTIONS.filter((row) => !seenContributions.has(row.id)),
    ];
    nextWithdrawals = [
      ...nextWithdrawals,
      ...EMPLOYER_WITHDRAWALS.filter((row) => !seenWithdrawals.has(row.id)),
    ];
  }

  return {
    member,
    memberships,
    contributions: nextContributions,
    withdrawals: nextWithdrawals,
    requests,
  };
}
