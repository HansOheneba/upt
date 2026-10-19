export type ContributionChannel = "mtn_momo";

export type WithdrawalStatus = "received" | "checking" | "approved" | "paid";

export type WithdrawalDestination = "momo" | "bank";

export type RequestChannel = "sms" | "email" | "app";

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
  scheme: "My Own Pension";
  channel: ContributionChannel;
  monthlyContribution: number;
  retirementAge: number;
  targetPot: number;
  unitPrice: number;
  /** Date finance last typed this price. ISO date. */
  unitPriceDate: string;
  memberSince: string;
};

export type Contribution = {
  id: string;
  date: string;
  amount: number;
  units: number;
  unitPrice: number;
  channel: ContributionChannel;
};

export type Withdrawal = {
  id: string;
  submittedAt: string;
  amount: number;
  reason: string;
  destinationType: WithdrawalDestination;
  destination: string;
  signatureDataUrl: string;
  status: WithdrawalStatus;
  name: string;
  mobile: string;
  profession: string;
  location: string;
  nextOfKin: string;
  nextOfKinContact: string;
};

export type PensionRequest = {
  id: string;
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
  contributions: Contribution[];
  withdrawals: Withdrawal[];
  requests: PensionRequest[];
};
