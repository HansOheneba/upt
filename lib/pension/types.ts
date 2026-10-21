export type ContributionChannel = "momo" | "cash" | "bank";

/** Received, under review, approved, and paid move in that order. Declined is a terminal outcome from review. */
export type WithdrawalStatus = "received" | "checking" | "approved" | "paid" | "declined";

export type WithdrawalDestination = "momo" | "bank";

export type RequestChannel = "sms" | "email" | "app";

export type MembershipKind = "personal" | "employer";

export type MembershipStatus = "active" | "closed";

/** One person. Scheme balances live on memberships, not on this record. */
export type PensionMember = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  profession: string;
  location: string;
  dateOfBirth: string;
  nextOfKin: string;
  nextOfKinContact: string;
  /** Registered payout bank. Empty when none is on the account. */
  bankName: string;
  bankAccount: string;
};

export type Membership = {
  id: string;
  schemeName: string;
  kind: MembershipKind;
  /** Set for employer-sponsored memberships. */
  employerName?: string;
  status: MembershipStatus;
  memberSince: string;
  memberNumber: string;
  channel: ContributionChannel;
  monthlyContribution: number;
  unitPrice: number;
  /** Date finance last typed this price. ISO date. */
  unitPriceDate: string;
  retirementAge?: number;
  targetPot?: number;
};

export type Contribution = {
  id: string;
  membershipId: string;
  date: string;
  amount: number;
  units: number;
  unitPrice: number;
  channel: ContributionChannel;
};

export type WithdrawalStatusEvent = {
  status: WithdrawalStatus;
  at: string;
  /** Member-facing note recorded with this status, when one exists. */
  note?: string;
};

/** Captured when the member confirms the review step. */
export type WithdrawalAuthorization = {
  statement: string;
  confirmedAt: string;
  requestVersion: number;
};

export type Withdrawal = {
  id: string;
  membershipId: string;
  submittedAt: string;
  amount: number;
  reason: string;
  /** Required when the reason is Other. Stored with the request, not on the profile. */
  reasonDetail?: string;
  destinationType: WithdrawalDestination;
  destination: string;
  /** Bank on the account when this request was paid to a bank. */
  bankName?: string;
  /**
   * The staff procedure records a signature image. No capture method is defined
   * on the member record, so new requests leave this empty and store authorization instead.
   */
  signatureDataUrl: string;
  status: WithdrawalStatus;
  /** Copied from the member record at submission. The form does not edit these. */
  name: string;
  mobile: string;
  profession: string;
  location: string;
  nextOfKin: string;
  nextOfKinContact: string;
  idempotencyKey?: string;
  authorization?: WithdrawalAuthorization;
  events?: WithdrawalStatusEvent[];
  /** Present when a declined request has a reason the member can be told. */
  declineReason?: string;
};

export type PensionRequest = {
  id: string;
  membershipId: string;
  subject: string;
  body: string;
  createdAt: string;
  channel: RequestChannel;
  status: "open" | "replied";
  reply?: string;
  repliedAt?: string;
};

export type PensionSnapshot = {
  member: PensionMember | null;
  memberships: Membership[];
  contributions: Contribution[];
  withdrawals: Withdrawal[];
  requests: PensionRequest[];
};
