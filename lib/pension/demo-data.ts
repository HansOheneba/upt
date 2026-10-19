import type {
  Contribution,
  PensionMember,
  PensionRequest,
  Withdrawal,
} from "@/lib/pension/types";

/** Last price the finance team posted for the demo. */
export const UNIT_PRICE_DATE = "2026-10-17";

const PRICE_START = 2.486;
const PRICE_STEP = 0.0202;

/**
 * Monthly Mobile Money contributions from January 2023.
 * Prices rise a little each month, the way a manually updated unit price would.
 */
export function buildContributions(
  monthly: number,
  months: number,
): Contribution[] {
  const rows: Contribution[] = [];
  for (let i = 0; i < months; i++) {
    const date = new Date(Date.UTC(2023, 0, 16));
    date.setUTCMonth(date.getUTCMonth() + i);
    const unitPrice = Math.round((PRICE_START + PRICE_STEP * (i + 1)) * 10000) / 10000;
    const units = Math.round((monthly / unitPrice) * 100) / 100;
    const iso = date.toISOString().slice(0, 10);
    rows.push({
      id: `contrib-${iso}`,
      date: iso,
      amount: monthly,
      units,
      unitPrice,
      channel: "mtn_momo",
    });
  }
  return rows;
}

export const PREVIEW_CONTRIBUTIONS = buildContributions(300, 46);

export const UNIT_PRICE =
  PREVIEW_CONTRIBUTIONS[PREVIEW_CONTRIBUTIONS.length - 1]?.unitPrice ?? 3.412;

/** Contributions ending October 2026, using the same price path as the preview. */
export function buildRecentContributions(
  monthly: number,
  months: number,
): Contribution[] {
  const end = new Date(Date.UTC(2026, 9, 16));
  const rows: Contribution[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(end);
    date.setUTCMonth(end.getUTCMonth() - i);
    const monthIndex = (date.getUTCFullYear() - 2023) * 12 + date.getUTCMonth();
    const unitPrice =
      Math.round((PRICE_START + PRICE_STEP * (monthIndex + 1)) * 10000) / 10000;
    const units = Math.round((monthly / unitPrice) * 100) / 100;
    const iso = date.toISOString().slice(0, 10);
    rows.push({
      id: `contrib-${iso}`,
      date: iso,
      amount: monthly,
      units,
      unitPrice,
      channel: "mtn_momo",
    });
  }
  return rows;
}

export const DEMO_MEMBER: PensionMember = {
  id: "mop-104482",
  firstName: "Akosua",
  lastName: "Boateng",
  email: "akosua.boateng@example.com",
  mobile: "0244119088",
  profession: "Primary school teacher",
  location: "East Legon, Accra",
  dateOfBirth: "1988-06-14",
  nextOfKin: "Yaw Boateng",
  nextOfKinContact: "0201883344",
  scheme: "My Own Pension",
  channel: "mtn_momo",
  monthlyContribution: 300,
  retirementAge: 60,
  targetPot: 120_000,
  unitPrice: UNIT_PRICE,
  unitPriceDate: UNIT_PRICE_DATE,
  memberSince: "2023-01-16",
};

export const PREVIEW_WITHDRAWALS: Withdrawal[] = [
  {
    id: "wd-paid-2026-05",
    submittedAt: "2026-05-08T09:14:00.000Z",
    amount: 1200,
    reason: "School fees",
    destinationType: "momo",
    destination: "0244119088",
    signatureDataUrl: "",
    status: "paid",
    name: "Akosua Boateng",
    mobile: "0244119088",
    profession: "Primary school teacher",
    location: "East Legon, Accra",
    nextOfKin: "Yaw Boateng",
    nextOfKinContact: "0201883344",
  },
  {
    id: "wd-check-2026-10",
    submittedAt: "2026-10-09T08:30:00.000Z",
    amount: 800,
    reason: "Medical",
    destinationType: "momo",
    destination: "0244119088",
    signatureDataUrl: "",
    status: "checking",
    name: "Akosua Boateng",
    mobile: "0244119088",
    profession: "Primary school teacher",
    location: "East Legon, Accra",
    nextOfKin: "Yaw Boateng",
    nextOfKinContact: "0201883344",
  },
];

export const PREVIEW_REQUESTS: PensionRequest[] = [
  {
    id: "req-statement",
    subject: "Contribution statement",
    body: "Please send the statement for this year. I need it for a school form.",
    createdAt: "2026-09-02T11:05:00.000Z",
    channel: "sms",
    status: "replied",
    reply:
      "Your 2026 statement is ready in the app. We also sent a copy by email and a short SMS.",
    repliedAt: "2026-09-02T15:40:00.000Z",
  },
  {
    id: "req-kin",
    subject: "Next of kin",
    body: "I want to confirm the next of kin on my account is still Yaw Boateng.",
    createdAt: "2026-10-11T16:20:00.000Z",
    channel: "app",
    status: "open",
  },
];

export type JoinInput = {
  firstName: string;
  lastName: string;
  mobile: string;
  profession: string;
  location: string;
  dateOfBirth: string;
  nextOfKin: string;
  nextOfKinContact: string;
  monthlyContribution: number;
  targetPot: number;
  retirementAge: number;
};

export function memberFromJoin(input: JoinInput): PensionMember {
  const first = input.firstName.trim();
  const last = input.lastName.trim();
  const slug = `${first}.${last}`.toLowerCase().replace(/[^a-z.]+/g, "");
  const contributions = buildRecentContributions(input.monthlyContribution, 12);
  const unitPrice = contributions[contributions.length - 1]?.unitPrice ?? UNIT_PRICE;
  return {
    id: `mop-${input.mobile.replace(/\D/g, "").slice(-6)}`,
    firstName: first,
    lastName: last,
    email: `${slug || "member"}@example.com`,
    mobile: input.mobile.trim(),
    profession: input.profession.trim(),
    location: input.location.trim(),
    dateOfBirth: input.dateOfBirth,
    nextOfKin: input.nextOfKin.trim(),
    nextOfKinContact: input.nextOfKinContact.trim(),
    scheme: "My Own Pension",
    channel: "mtn_momo",
    monthlyContribution: input.monthlyContribution,
    retirementAge: input.retirementAge,
    targetPot: input.targetPot,
    unitPrice,
    unitPriceDate: UNIT_PRICE_DATE,
    memberSince: contributions[0]?.date ?? UNIT_PRICE_DATE,
  };
}

export function contributionsForMember(member: PensionMember): Contribution[] {
  if (member.id === DEMO_MEMBER.id) return PREVIEW_CONTRIBUTIONS;
  return buildRecentContributions(member.monthlyContribution, 12);
}
