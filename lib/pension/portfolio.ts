import { formatGhs, outstandingUnits, potValue } from "@/lib/pension/metrics";
import type {
  Contribution,
  Membership,
  PensionRequest,
  Withdrawal,
} from "@/lib/pension/types";
import { WITHDRAWAL_BADGE_LABEL, isWithdrawalStatus, withdrawalReservesValue } from "@/lib/pension/withdrawals";

export function hasUnitPrice(membership: Membership): boolean {
  return Number.isFinite(membership.unitPrice) && membership.unitPrice > 0;
}

export function personalMembership(memberships: Membership[]): Membership | null {
  return (
    memberships.find((row) => row.kind === "personal" && row.status === "active") ??
    memberships.find((row) => row.kind === "personal") ??
    null
  );
}

export function membershipKindLabel(membership: Membership): string {
  return membership.kind === "employer" ? "Employer-sponsored" : "Personal";
}

export function rowsForMembership<T extends { membershipId: string }>(
  rows: T[],
  membershipId: string,
): T[] {
  return rows.filter((row) => row.membershipId === membershipId);
}

export type MembershipFigures = {
  membership: Membership;
  units: number | null;
  value: number | null;
  /** Active memberships with a unit price are included in the portfolio total. */
  included: boolean;
};

export function figuresForMembership(
  membership: Membership,
  contributions: Contribution[],
  withdrawals: Withdrawal[],
): MembershipFigures {
  const priced = hasUnitPrice(membership);
  if (!priced) {
    return { membership, units: null, value: null, included: false };
  }
  const units = outstandingUnits(
    rowsForMembership(contributions, membership.id),
    rowsForMembership(withdrawals, membership.id),
    membership.unitPrice,
  );
  const value = potValue(units, membership.unitPrice);
  return {
    membership,
    units,
    value,
    included: membership.status === "active",
  };
}

export type AllocationSlice = {
  membership: Membership;
  value: number;
  percent: number;
};

export type PortfolioSummary = {
  /** Null when no active membership has a unit price. */
  total: number | null;
  activeCount: number;
  /** Latest unit price date among memberships included in the total. */
  updatedAt: string | null;
  pricedActiveCount: number;
  unpricedActiveCount: number;
  allocations: AllocationSlice[];
};

function shares(values: number[]): number[] {
  if (values.length === 0) return [];
  const total = values.reduce((sum, value) => sum + value, 0);
  // A zero total has no share to assign. An even split would invent one.
  if (total <= 0) return values.map(() => 0);
  const raw = values.map((value) => (value / total) * 100);
  const out = raw.map((value) => Math.floor(value * 10) / 10);
  let remainder = Math.max(
    0,
    Math.round((100 - out.reduce((sum, value) => sum + value, 0)) * 10),
  );
  const order = raw
    .map((value, index) => ({ index, frac: value * 10 - Math.floor(value * 10) }))
    .sort((a, b) => b.frac - a.frac || a.index - b.index);
  for (let step = 0; step < remainder; step += 1) {
    const target = order[step % order.length];
    out[target.index] = Math.round((out[target.index] + 0.1) * 10) / 10;
  }
  return out;
}

export function summarizePortfolio(
  memberships: Membership[],
  contributions: Contribution[],
  withdrawals: Withdrawal[],
): PortfolioSummary {
  const figures = memberships.map((membership) =>
    figuresForMembership(membership, contributions, withdrawals),
  );
  const active = figures.filter((row) => row.membership.status === "active");
  const included = active.filter((row) => row.included && row.value != null);
  const percents = shares(included.map((row) => row.value ?? 0));
  const updated = included
    .map((row) => row.membership.unitPriceDate)
    .filter((date) => /^\d{4}-\d{2}-\d{2}/.test(date))
    .sort();

  return {
    total: included.length > 0
      ? Math.round(included.reduce((sum, row) => sum + (row.value ?? 0), 0) * 100) / 100
      : null,
    activeCount: active.length,
    pricedActiveCount: included.length,
    unpricedActiveCount: active.length - included.length,
    updatedAt: updated.length > 0 ? updated[updated.length - 1] : null,
    allocations: included.map((row, index) => ({
      membership: row.membership,
      value: row.value ?? 0,
      percent: percents[index] ?? 0,
    })),
  };
}

export type AgreedMonthly = {
  /** Sum of agreed amounts on active memberships that have one. Null when none do. */
  total: number | null;
  counted: number;
  /** Active memberships with no agreed amount, so they are left out of the sum. */
  omitted: number;
};

/** Scheduled contribution on the membership. This is not money received. */
export function hasAgreedMonthly(membership: Membership): boolean {
  return Number.isFinite(membership.monthlyContribution) && membership.monthlyContribution > 0;
}

/** Agreed monthly amounts on active memberships only. Closed memberships are omitted. */
export function agreedMonthlyContributions(memberships: Membership[]): AgreedMonthly {
  const active = memberships.filter((row) => row.status === "active");
  let total = 0;
  let counted = 0;
  for (const row of active) {
    if (!hasAgreedMonthly(row)) continue;
    total += row.monthlyContribution;
    counted += 1;
  }
  return {
    total: counted > 0 ? Math.round(total * 100) / 100 : null,
    counted,
    omitted: active.length - counted,
  };
}

export function canRequestWithdrawal(
  memberships: Membership[],
  contributions: Contribution[],
  withdrawals: Withdrawal[],
): boolean {
  return memberships.some(
    (membership) => withdrawalPot(membership, contributions, withdrawals) != null,
  );
}

export function withdrawalPot(
  membership: Membership,
  contributions: Contribution[],
  withdrawals: Withdrawal[],
): number | null {
  const figures = figuresForMembership(membership, contributions, withdrawals);
  if (!figures.included || figures.value == null || figures.value <= 0) return null;
  const reserved = rowsForMembership(withdrawals, membership.id)
    .filter((row) => isWithdrawalStatus(row.status) && withdrawalReservesValue(row.status))
    .reduce((sum, row) => sum + (Number.isFinite(row.amount) ? row.amount : 0), 0);
  const available = Math.round((figures.value - reserved) * 100) / 100;
  return available > 0 ? available : null;
}

/** Why a membership cannot take a new withdrawal request. Null when one can be started. */
export function withdrawalHoldReason(
  membership: Membership,
  contributions: Contribution[],
  withdrawals: Withdrawal[],
): string | null {
  if (membership.status !== "active") return "This membership is closed.";
  const figures = figuresForMembership(membership, contributions, withdrawals);
  if (!figures.included || figures.value == null) {
    return "A unit price is not available, so a value cannot be withdrawn.";
  }
  if (figures.value <= 0) return "This membership has no value to withdraw.";
  if (withdrawalPot(membership, contributions, withdrawals) == null) {
    return "Withdrawal requests already cover the value in this membership.";
  }
  return null;
}

export type ActivityTone = "complete" | "pending";

export type ActivityItem = {
  id: string;
  at: string;
  schemeName: string;
  title: string;
  detail: string;
  href: string;
  tone: ActivityTone;
};

function schemeName(memberships: Membership[], membershipId: string): string {
  return memberships.find((row) => row.id === membershipId)?.schemeName ?? "Scheme";
}

/** Recent events from stored rows. Paid is the only completed withdrawal. */
export function recentActivity(
  memberships: Membership[],
  contributions: Contribution[],
  withdrawals: Withdrawal[],
  requests: PensionRequest[],
  limit = 8,
): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const row of contributions) {
    if (!row.date) continue;
    items.push({
      id: `contrib-${row.id}`,
      at: row.date,
      schemeName: schemeName(memberships, row.membershipId),
      title: "Contribution received",
      detail: Number.isFinite(row.amount) ? formatGhs(row.amount, 2) : "Amount unavailable",
      href: `/dashboard/contributions?membership=${encodeURIComponent(row.membershipId)}`,
      tone: "complete",
    });
  }

  for (const row of withdrawals) {
    if (!row.submittedAt) continue;
    const known = isWithdrawalStatus(row.status);
    const paid = row.status === "paid";
    const declined = row.status === "declined";
    const amount = Number.isFinite(row.amount) ? formatGhs(row.amount, 2) : "Amount unavailable";
    const status = known ? WITHDRAWAL_BADGE_LABEL[row.status] : "Status unavailable";
    items.push({
      id: `wd-${row.id}`,
      at: row.submittedAt,
      schemeName: schemeName(memberships, row.membershipId),
      title: paid ? "Withdrawal paid" : declined ? "Withdrawal declined" : "Withdrawal request",
      detail: `${amount} · ${status}`,
      href: `/dashboard/withdrawals?request=${encodeURIComponent(row.id)}`,
      tone: paid || declined ? "complete" : "pending",
    });
  }

  for (const row of requests) {
    if (!row.createdAt) continue;
    items.push({
      id: `req-${row.id}`,
      at: row.createdAt,
      schemeName: schemeName(memberships, row.membershipId),
      title: row.status === "replied" ? "Message replied" : "Message sent",
      detail: row.subject.trim() || "Request",
      href: `/dashboard/requests?request=${encodeURIComponent(row.id)}`,
      tone: row.status === "replied" ? "complete" : "pending",
    });
  }

  items.sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id));
  return items.slice(0, limit);
}

export function formatShare(percent: number): string {
  const rounded = Math.round(percent * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
}
