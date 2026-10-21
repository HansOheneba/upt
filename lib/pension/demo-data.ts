import type {
  Contribution,
  ContributionChannel,
  Membership,
  PensionMember,
  PensionRequest,
  PensionSnapshot,
  Withdrawal,
} from "@/lib/pension/types";

/** Last price the finance team posted for the personal scheme in the preview. */
export const UNIT_PRICE_DATE = "2026-10-17";

export const PREVIEW_MEMBER_ID = "mop-104482";
export const PERSONAL_MEMBERSHIP_ID = "mem-mop-104482";
export const EMPLOYER_MEMBERSHIP_ID = "mem-abc-104482";

const PERSONAL_PRICE_START = 2.486;
const PERSONAL_PRICE_STEP = 0.0202;

type PricePath = {
  membershipId: string;
  idPrefix: string;
  monthly: number;
  months: number;
  startYear: number;
  startMonth: number;
  priceStart: number;
  priceStep: number;
  /** One source for every month, or a repeating mix. */
  source: ContributionChannel | ContributionChannel[];
};

function buildPricedContributions(path: PricePath): Contribution[] {
  const rows: Contribution[] = [];
  for (let i = 0; i < path.months; i++) {
    const date = new Date(Date.UTC(path.startYear, path.startMonth, 16));
    date.setUTCMonth(date.getUTCMonth() + i);
    const unitPrice =
      Math.round((path.priceStart + path.priceStep * (i + 1)) * 10000) / 10000;
    const units = Math.round((path.monthly / unitPrice) * 100) / 100;
    const iso = date.toISOString().slice(0, 10);
    rows.push({
      id: `${path.idPrefix}-${iso}`,
      membershipId: path.membershipId,
      date: iso,
      amount: path.monthly,
      units,
      unitPrice,
      channel: Array.isArray(path.source) ? path.source[i % path.source.length] : path.source,
    });
  }
  return rows;
}

export const PERSONAL_CONTRIBUTIONS = buildPricedContributions({
  membershipId: PERSONAL_MEMBERSHIP_ID,
  idPrefix: "p",
  monthly: 300,
  months: 46,
  startYear: 2023,
  startMonth: 0,
  priceStart: PERSONAL_PRICE_START,
  priceStep: PERSONAL_PRICE_STEP,
  source: ["momo", "momo", "momo", "cash", "momo", "bank"],
});

export const EMPLOYER_CONTRIBUTIONS = buildPricedContributions({
  membershipId: EMPLOYER_MEMBERSHIP_ID,
  idPrefix: "e",
  monthly: 650,
  months: 34,
  startYear: 2024,
  startMonth: 0,
  priceStart: 4.105,
  priceStep: 0.011,
  source: "bank",
});

export const UNIT_PRICE =
  PERSONAL_CONTRIBUTIONS[PERSONAL_CONTRIBUTIONS.length - 1]?.unitPrice ?? 3.412;

const EMPLOYER_UNIT_PRICE =
  EMPLOYER_CONTRIBUTIONS[EMPLOYER_CONTRIBUTIONS.length - 1]?.unitPrice ?? 4.48;

export const PERSONAL_MEMBERSHIP: Membership = {
  id: PERSONAL_MEMBERSHIP_ID,
  schemeName: "My Own Pension",
  kind: "personal",
  status: "active",
  memberSince: "2023-01-16",
  memberNumber: "MOP-104482",
  channel: "momo",
  monthlyContribution: 300,
  unitPrice: UNIT_PRICE,
  unitPriceDate: UNIT_PRICE_DATE,
  retirementAge: 60,
  targetPot: 120_000,
};

export const EMPLOYER_MEMBERSHIP: Membership = {
  id: EMPLOYER_MEMBERSHIP_ID,
  schemeName: "ABC Company Pension Scheme",
  kind: "employer",
  employerName: "ABC Company",
  status: "active",
  memberSince: "2024-01-16",
  memberNumber: "ABC-104482",
  channel: "bank",
  monthlyContribution: 650,
  unitPrice: EMPLOYER_UNIT_PRICE,
  unitPriceDate: EMPLOYER_CONTRIBUTIONS[EMPLOYER_CONTRIBUTIONS.length - 1]?.date ?? "2026-10-16",
};

export const DEMO_MEMBER: PensionMember = {
  id: PREVIEW_MEMBER_ID,
  firstName: "Akosua",
  lastName: "Boateng",
  email: "akosua.boateng@example.com",
  mobile: "0244119088",
  profession: "Primary school teacher",
  location: "East Legon, Accra",
  dateOfBirth: "1988-06-14",
  nextOfKin: "Yaw Boateng",
  nextOfKinContact: "0201883344",
  bankName: "GCB Bank",
  bankAccount: "0123456789",
};

export const PERSONAL_WITHDRAWALS: Withdrawal[] = [
  {
    id: "wd-paid-2026-05",
    membershipId: PERSONAL_MEMBERSHIP_ID,
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
    membershipId: PERSONAL_MEMBERSHIP_ID,
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

export const EMPLOYER_WITHDRAWALS: Withdrawal[] = [
  {
    id: "wd-abc-paid-2026-03",
    membershipId: EMPLOYER_MEMBERSHIP_ID,
    submittedAt: "2026-03-12T10:05:00.000Z",
    amount: 2000,
    reason: "Partial withdrawal",
    destinationType: "bank",
    destination: "0123456789",
    bankName: "GCB Bank",
    signatureDataUrl: "",
    status: "paid",
    name: "Akosua Boateng",
    mobile: "0244119088",
    profession: "Primary school teacher",
    location: "East Legon, Accra",
    nextOfKin: "Yaw Boateng",
    nextOfKinContact: "0201883344",
  },
];

export const PREVIEW_MEMBERSHIPS: Membership[] = [PERSONAL_MEMBERSHIP, EMPLOYER_MEMBERSHIP];

export const PREVIEW_CONTRIBUTIONS: Contribution[] = [
  ...PERSONAL_CONTRIBUTIONS,
  ...EMPLOYER_CONTRIBUTIONS,
];

export const PREVIEW_WITHDRAWALS: Withdrawal[] = [
  ...PERSONAL_WITHDRAWALS,
  ...EMPLOYER_WITHDRAWALS,
];

export const PREVIEW_REQUESTS: PensionRequest[] = [
  {
    id: "req-statement",
    membershipId: PERSONAL_MEMBERSHIP_ID,
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
    membershipId: PERSONAL_MEMBERSHIP_ID,
    subject: "Next of kin",
    body: "I want to confirm the next of kin on my account is still Yaw Boateng.",
    createdAt: "2026-10-11T16:20:00.000Z",
    channel: "app",
    status: "open",
  },
];

export function previewSnapshot(): PensionSnapshot {
  return {
    member: DEMO_MEMBER,
    memberships: PREVIEW_MEMBERSHIPS,
    contributions: PREVIEW_CONTRIBUTIONS,
    withdrawals: PREVIEW_WITHDRAWALS,
    requests: PREVIEW_REQUESTS,
  };
}

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

/** A signed-in person with no scheme membership yet. */
export function emptyMember(email: string): PensionMember {
  const slug = email.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12);
  return {
    id: `mop-${slug || "new"}`,
    firstName: "",
    lastName: "",
    email: email.trim(),
    mobile: "",
    profession: "",
    location: "",
    dateOfBirth: "",
    nextOfKin: "",
    nextOfKinContact: "",
    bankName: "",
    bankAccount: "",
  };
}

export function emptySnapshot(email: string): PensionSnapshot {
  return {
    member: emptyMember(email),
    memberships: [],
    contributions: [],
    withdrawals: [],
    requests: [],
  };
}

export function joinedSnapshot(input: JoinInput): PensionSnapshot {
  const first = input.firstName.trim();
  const last = input.lastName.trim();
  const slug = `${first}.${last}`.toLowerCase().replace(/[^a-z.]+/g, "");
  const today = new Date().toISOString().slice(0, 10);
  const memberId = `mop-${input.mobile.replace(/\D/g, "").slice(-6) || "new"}`;
  const membershipId = `mem-${memberId}`;
  const member: PensionMember = {
    id: memberId,
    firstName: first,
    lastName: last,
    email: `${slug || "member"}@example.com`,
    mobile: input.mobile.trim(),
    profession: input.profession.trim(),
    location: input.location.trim(),
    dateOfBirth: input.dateOfBirth,
    nextOfKin: input.nextOfKin.trim(),
    nextOfKinContact: input.nextOfKinContact.trim(),
    bankName: "",
    bankAccount: "",
  };
  const membership: Membership = {
    id: membershipId,
    schemeName: "My Own Pension",
    kind: "personal",
    status: "active",
    memberSince: today,
    memberNumber: memberId.toUpperCase(),
    channel: "momo",
    monthlyContribution: input.monthlyContribution,
    unitPrice: UNIT_PRICE,
    unitPriceDate: UNIT_PRICE_DATE,
    retirementAge: input.retirementAge,
    targetPot: input.targetPot,
  };
  return {
    member,
    memberships: [membership],
    contributions: [],
    withdrawals: [],
    requests: [],
  };
}
