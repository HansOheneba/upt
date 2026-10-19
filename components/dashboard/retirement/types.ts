export type ProjectionInputs = {
  currentAge: number;
  retirementAge: number;
  /** How many years the user expects to live. Drives the PV-of-annuity
   *  calculation: nest egg must sustain income for (lifeExpectancy − retirementAge) years. */
  lifeExpectancy: number;
  currentInvested: number;
  monthlySavings: number;
  expectedReturnPct: number;
  inflationPct: number;
  safeWithdrawalRatePct: number;
  desiredMonthlyIncome: number;
  /** Existing pension / retirement account balance */
  existingPensionBalance: number;
  /** Monthly pension or retirement account contribution */
  monthlyPensionContribution: number;
};

export type StatusTone = {
  tone: "good" | "warn";
  title: string;
};

export type AdjustmentRecommendations = {
  monthlySavingsIncrease: number;
  retirementAgeDelay: number;
  monthlyIncomeReduction: number;
  currentInvestmentBoost: number;
};
