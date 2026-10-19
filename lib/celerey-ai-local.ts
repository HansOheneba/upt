import type {
  AssetHolding,
  CashFlowPoint,
  CashFlowRow,
  EmergencyFundConfig,
  ExpenseCategory,
  Goal,
  InsurancePolicy,
  Liability,
  Property,
  RetirementConfig,
  TaxProfile,
  User,
  Account,
} from "@/lib/client-data";
import { brand } from "@/lib/tenant";
import {
  calculateNetWorth,
  currentValue,
  formatCurrency,
  getInvestmentCurrency,
  getNetWorthFx,
} from "@/lib/client-data";
import type { ApiCashFlowSummary } from "@/lib/dashboard-api";
import {
  derivePortfolioInsights,
  formatPortfolioInsightsMarkdown,
} from "@/lib/portfolio-insights";

// ── Snapshot ─────────────────────────────────────────────────────────────────

export type AiStoreSnapshot = {
  user: User | null;
  incomeRows: CashFlowRow[];
  expenseCategories: ExpenseCategory[];
  goals: Goal[];
  retirement: RetirementConfig;
  liabilities: Liability[];
  emergencyFund: EmergencyFundConfig;
  holdings: AssetHolding[];
  insurancePolicies: InsurancePolicy[];
  propertyAssets: Property[];
  taxProfile: TaxProfile;
  profileCompletionScore: number;
  cashFlowHistory?: CashFlowPoint[];
  cashFlowSummary?: ApiCashFlowSummary | null;
  accounts?: Account[];
};

export type CashFlowHistoryPoint = {
  month: string;
  income: number;
  expenses: number;
  surplus: number;
};

export type FinancialSnapshot = {
  firstName: string;
  /** Used only to redact chat text. Never sent to Celerey or an external model. */
  lastName?: string | null;
  currency: string;
  investmentCurrency: string;
  country: string | null;
  occupation: string | null;
  maritalStatus: string | null;
  dependents: number | null;
  netWorth: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  surplus: number;
  savingsRatePct: number;
  portfolioValue: number;
  propertyEquity: number;
  propertyCount: number;
  totalDebt: number;
  standaloneDebt: number;
  creditCardBalance: number;
  creditCardRate: number;
  topDebt: Liability | null;
  emergencyBalance: number;
  emergencyRunwayMonths: number;
  emergencyTargetMonths: number;
  currentAge: number;
  retirementAge: number;
  currentInvested: number;
  monthlySavings: number;
  desiredMonthlyIncome: number;
  projectedRetirement: number;
  retirementOnTrack: boolean;
  insurancePolicies: number;
  monthlyInsurancePremium: number;
  uninsuredProperties: Property[];
  activeGoals: Goal[];
  topGoal: Goal | null;
  effectiveTaxRate: number;
  riskProfile: string | null;
  profileCompletionScore: number;
  holdingsCount: number;
  largestHolding: AssetHolding | null;
  liabilities: Liability[];
  /** Full month-by-month cash flow (not just current month). */
  cashFlowHistory: CashFlowHistoryPoint[];
  /** Server averages / MoM when available. */
  cashFlowSummary: {
    currentMonth: ApiCashFlowSummary["current_month"] | null;
    monthOverMonth: ApiCashFlowSummary["month_over_month"] | null;
    averages: ApiCashFlowSummary["averages"] | null;
  } | null;
  incomeSources: { name: string; amount: number; recurring: boolean }[];
  expenseBreakdown: {
    name: string;
    amount: number;
    essential: boolean;
    recurring: boolean;
  }[];
  holdings: {
    name: string;
    symbol?: string;
    assetType: string;
    value: number;
    costBasis: number;
    gainPct: number | null;
  }[];
  properties: {
    name: string;
    type: string;
    marketValue: number;
    mortgageBalance: number;
    equity: number;
    country: string;
    city: string;
    insured: boolean;
  }[];
  insurance: {
    name: string;
    category: string;
    provider: string;
    coverageAmount: number;
    premiumMonthly: number;
  }[];
  accounts: { name: string; type: string; balance: number; institution: string }[];
  retirementDetails: {
    lifeExpectancy: number;
    existingPensionBalance: number;
    monthlyPensionContribution: number;
    expectedReturnPct: number;
    inflationPct: number;
    safeWithdrawalRatePct: number;
  };
  goalsDetail: {
    title: string;
    category: string;
    target: number;
    current: number;
    completed: boolean;
    yearsRemaining: number;
    monthlyContributionNeeded: number;
    probability: number;
  }[];
};

function projectRetirement(
  invested: number,
  monthly: number,
  years: number,
  rate = 0.07,
): number {
  if (years <= 0) return invested;
  return (
    invested * Math.pow(1 + rate, years) +
    monthly * 12 * ((Math.pow(1 + rate, years) - 1) / rate)
  );
}

function isRecurringRow(row: {
  isRecurring?: boolean;
  recurringType?: string | null;
}): boolean {
  if (row.recurringType === "one-time") return false;
  return row.isRecurring !== false;
}

export function buildFinancialSnapshot(store: AiStoreSnapshot): FinancialSnapshot {
  const activeProperties = store.propertyAssets.filter((p) => p.is_active);
  const activeHoldings = store.holdings.filter((h) => h.is_active);
  // Prefer recurring rows so one-off bonuses/spikes do not distort "monthly" AI maths.
  const recurringIncome = store.incomeRows
    .filter(isRecurringRow)
    .reduce((s, i) => s + i.amount, 0);
  const recurringExpenses = store.expenseCategories
    .filter(isRecurringRow)
    .reduce((s, e) => s + e.amount, 0);
  const summaryIncome = store.cashFlowSummary?.monthly_income;
  const summaryExpenses = store.cashFlowSummary?.monthly_expenses;
  const monthlyIncome =
    typeof summaryIncome === "number" && summaryIncome > 0
      ? summaryIncome
      : recurringIncome > 0
        ? recurringIncome
        : store.incomeRows.reduce((s, i) => s + i.amount, 0);
  const monthlyExpenses =
    typeof summaryExpenses === "number" && summaryExpenses > 0
      ? summaryExpenses
      : recurringExpenses > 0
        ? recurringExpenses
        : store.expenseCategories.reduce((s, e) => s + e.amount, 0);
  const surplus =
    typeof store.cashFlowSummary?.monthly_surplus === "number"
      ? store.cashFlowSummary.monthly_surplus
      : monthlyIncome - monthlyExpenses;
  const fx = getNetWorthFx(store.user);
  const nw = calculateNetWorth(
    store.holdings,
    [],
    activeProperties,
    store.incomeRows,
    store.expenseCategories,
    [],
    fx,
  );
  const portfolioValue = activeHoldings.reduce(
    (s, h) => s + currentValue(h, []),
    0,
  );
  const propertyEquity = activeProperties.reduce(
    (s, p) => s + (p.market_value - (p.mortgage?.balance ?? 0)),
    0,
  );
  const mortgageDebt = activeProperties.reduce(
    (s, p) => s + (p.mortgage?.balance ?? 0),
    0,
  );
  const mortgageDebtBase = fx
    ? mortgageDebt * fx.basePerInvestment
    : mortgageDebt;
  const standaloneDebt = store.liabilities.reduce((s, l) => s + l.balance, 0);
  const totalDebt = standaloneDebt + mortgageDebtBase;

  const creditCards = store.liabilities
    .filter((l) => l.type === "credit_card")
    .sort((a, b) => b.interestRatePct - a.interestRatePct);
  const topDebt =
    [...store.liabilities].sort(
      (a, b) => b.interestRatePct - a.interestRatePct,
    )[0] ?? null;

  const emergencyBalance = store.emergencyFund.currentCashBalance;
  const emergencyTargetMonths = store.emergencyFund.targetMonths || 6;
  const emergencyRunwayMonths =
    store.emergencyFund.computed?.runwayMonths ??
    (monthlyExpenses > 0 ? emergencyBalance / monthlyExpenses : 0);

  const currentAge = store.retirement.currentAge || 0;
  const retirementAge = store.retirement.retirementAge || 0;
  const currentInvested =
    store.retirement.currentInvested +
    store.retirement.existingPensionBalance;
  const monthlySavings = store.retirement.monthlySavings || Math.max(surplus, 0);
  const yrs = retirementAge > currentAge ? retirementAge - currentAge : 0;
  const projectedRetirement = projectRetirement(
    currentInvested,
    monthlySavings,
    yrs,
    (store.retirement.expectedReturnPct || 7) / 100,
  );
  const desiredMonthlyIncome = store.retirement.desiredMonthlyIncome || 0;
  const swr = (store.retirement.safeWithdrawalRatePct || 4) / 100;
  const retirementOnTrack =
    desiredMonthlyIncome > 0
      ? (projectedRetirement * swr) / 12 >= desiredMonthlyIncome
      : projectedRetirement > 0;

  const activeInsurance = store.insurancePolicies.filter((p) => p.is_active);
  const uninsuredProperties = activeProperties.filter(
    (p) => p.insurance.length === 0,
  );
  const activeGoals = store.goals.filter((g) => !g.completed && g.target > 0);
  const topGoal = [...activeGoals].sort((a, b) => a.priority - b.priority)[0] ?? null;
  const largestHolding =
    [...activeHoldings].sort(
      (a, b) => currentValue(b, []) - currentValue(a, []),
    )[0] ?? null;

  const firstName =
    store.user?.first_name ??
    store.user?.display_name?.split(" ")[0] ??
    "there";

  const history = [...(store.cashFlowHistory ?? [])]
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-24)
    .map((p) => ({
      month: p.month,
      income: p.income,
      expenses: p.expenses,
      surplus: p.surplus ?? p.income - p.expenses,
    }));

  const summary = store.cashFlowSummary ?? null;

  return {
    firstName,
    lastName: store.user?.last_name ?? null,
    currency: store.user?.currency ?? "USD",
    investmentCurrency: getInvestmentCurrency(store.user),
    country: store.user?.resident_country ?? null,
    occupation: store.user?.occupation ?? null,
    maritalStatus: store.user?.marital_status ?? null,
    dependents: store.user?.dependents ?? null,
    netWorth: nw.netWorth,
    monthlyIncome,
    monthlyExpenses,
    surplus,
    savingsRatePct:
      monthlyIncome > 0 ? Math.round((surplus / monthlyIncome) * 100) : 0,
    portfolioValue,
    propertyEquity,
    propertyCount: activeProperties.length,
    totalDebt,
    standaloneDebt,
    creditCardBalance: creditCards[0]?.balance ?? 0,
    creditCardRate: creditCards[0]?.interestRatePct ?? 0,
    topDebt,
    emergencyBalance,
    emergencyRunwayMonths,
    emergencyTargetMonths,
    currentAge,
    retirementAge,
    currentInvested,
    monthlySavings,
    desiredMonthlyIncome,
    projectedRetirement,
    retirementOnTrack,
    insurancePolicies: activeInsurance.length,
    monthlyInsurancePremium: activeInsurance.reduce(
      (s, p) => s + p.premium_monthly,
      0,
    ),
    uninsuredProperties,
    activeGoals,
    topGoal,
    effectiveTaxRate: store.taxProfile.effectiveTaxRatePct,
    riskProfile: store.user?.risk_profile ?? null,
    profileCompletionScore: store.profileCompletionScore,
    holdingsCount: activeHoldings.length,
    largestHolding,
    liabilities: store.liabilities,
    cashFlowHistory: history,
    cashFlowSummary: summary
      ? {
          currentMonth: summary.current_month ?? null,
          monthOverMonth: summary.month_over_month ?? null,
          averages: summary.averages ?? null,
        }
      : null,
    incomeSources: store.incomeRows.map((r) => ({
      name: r.name,
      amount: r.amount,
      recurring: r.isRecurring !== false && r.recurringType !== "one-time",
    })),
    expenseBreakdown: store.expenseCategories.map((e) => ({
      name: e.name,
      amount: e.amount,
      essential: e.essential,
      recurring: e.isRecurring !== false && e.recurringType !== "one-time",
    })),
    holdings: activeHoldings.map((h) => {
      const value = currentValue(h, []);
      const costBasis = h.cost_basis ?? h.initial_value ?? 0;
      const gainPct =
        costBasis > 0
          ? Math.round(((value - costBasis) / costBasis) * 1000) / 10
          : null;
      return {
        name: h.name,
        symbol: h.symbol ?? undefined,
        assetType: h.asset_type,
        value,
        costBasis,
        gainPct,
      };
    }),
    properties: activeProperties.map((p) => ({
      name: p.name,
      type: p.property_type,
      marketValue: p.market_value,
      mortgageBalance: p.mortgage?.balance ?? p.mortgage_balance ?? 0,
      equity: p.market_value - (p.mortgage?.balance ?? p.mortgage_balance ?? 0),
      country: p.country,
      city: p.city,
      insured: p.insurance.length > 0,
    })),
    insurance: activeInsurance.map((p) => ({
      name: p.name,
      category: p.category,
      provider: p.provider,
      coverageAmount: p.coverage_amount,
      premiumMonthly: p.premium_monthly,
    })),
    accounts: (store.accounts ?? []).map((a) => ({
      name: a.name,
      type: a.type,
      balance: a.balance,
      institution: a.institution,
    })),
    retirementDetails: {
      lifeExpectancy: store.retirement.lifeExpectancy,
      existingPensionBalance: store.retirement.existingPensionBalance,
      monthlyPensionContribution: store.retirement.monthlyPensionContribution,
      expectedReturnPct: store.retirement.expectedReturnPct,
      inflationPct: store.retirement.inflationPct,
      safeWithdrawalRatePct: store.retirement.safeWithdrawalRatePct,
    },
    goalsDetail: store.goals.map((g) => ({
      title: g.title,
      category: g.category,
      target: g.target,
      current: g.current ?? 0,
      completed: g.completed,
      yearsRemaining: g.yearsRemaining,
      monthlyContributionNeeded: g.monthlyContributionNeeded,
      probability: g.probability,
    })),
  };
}

// ── Suggested prompts ────────────────────────────────────────────────────────

export function buildSuggestedPrompts(s: FinancialSnapshot): string[] {
  const extra =
    s.surplus > 500 ? Math.min(Math.round(s.surplus / 2), 2000) : 500;
  return [
    s.retirementAge > 0
      ? `How can I retire before age ${s.retirementAge}?`
      : "How should I plan for retirement?",
    s.surplus > 0
      ? `What if I invest an extra ${formatCurrency(extra)}/month?`
      : "How can I improve my monthly surplus?",
    s.holdingsCount >= 5
      ? "Which of my holdings are doing best, and am I too concentrated?"
      : s.portfolioValue > 0
        ? "How should I rebalance my portfolio?"
        : "Where should I start investing?",
    s.cashFlowHistory.length >= 6
      ? "What does my cash flow history say about my progress?"
      : s.insurancePolicies > 0 || s.uninsuredProperties.length > 0
        ? "Am I adequately insured?"
        : "What insurance should I prioritise?",
    s.totalDebt > 0
      ? "What's the fastest way to eliminate my debt?"
      : "How do I stay debt-free while building wealth?",
    s.effectiveTaxRate > 0
      ? "How do I optimise my tax position?"
      : "What tax-efficient moves should I consider?",
  ];
}

// ── Intent matching ──────────────────────────────────────────────────────────

function matches(q: string, ...phrases: string[]): boolean {
  return phrases.some((p) => q.includes(p));
}

type Handler = (s: FinancialSnapshot) => string;

function overview(s: FinancialSnapshot): string {
  const priorities: string[] = [];

  if (s.profileCompletionScore < 100) {
    priorities.push(
      `**Finish your profile (${s.profileCompletionScore}%)** so projections use real numbers, not guesses.`,
    );
  }
  if (s.emergencyRunwayMonths < s.emergencyTargetMonths && s.monthlyExpenses > 0) {
    priorities.push(
      `**Build the emergency fund** - ${s.emergencyRunwayMonths.toFixed(1)} months saved, target ${s.emergencyTargetMonths}. Need ${formatCurrency(s.monthlyExpenses * s.emergencyTargetMonths)} in accessible cash.`,
    );
  }
  if (s.creditCardBalance > 0) {
    priorities.push(
      `**Pay off ${formatCurrency(s.creditCardBalance)} on the credit card** at ${s.creditCardRate}% APR before investing more.`,
    );
  }
  if (s.uninsuredProperties.length > 0) {
    priorities.push(
      `**Insure ${s.uninsuredProperties.map((p) => p.name).join(", ")}** - ${s.uninsuredProperties.length} propert${s.uninsuredProperties.length === 1 ? "y" : "ies"} without coverage.`,
    );
  }
  if (!s.retirementOnTrack && s.desiredMonthlyIncome > 0) {
    priorities.push(
      `**Boost retirement savings** - current path projects ~${formatCurrency(Math.round((s.projectedRetirement * 0.04) / 12))}/month vs your ${formatCurrency(s.desiredMonthlyIncome)} target.`,
    );
  }
  if (s.surplus > 0 && s.savingsRatePct < 15 && s.monthlyIncome > 0) {
    priorities.push(
      `**Raise your savings rate** - ${s.savingsRatePct}% of income saved. Target 15-20% if your goals allow.`,
    );
  }
  if (priorities.length === 0) {
    priorities.push(
      "**Looks healthy** - rebalance when any asset class drifts more than 5% from target.",
    );
  }

  return `Here is your financial health snapshot, ${s.firstName}:\n\n**Net worth**: ${formatCurrency(s.netWorth, s.currency)}${s.portfolioValue > 0 ? `\n**Investments**: ${formatCurrency(s.portfolioValue, s.investmentCurrency)}` : ""}${s.propertyCount > 0 ? `\n**Property equity**: ${formatCurrency(s.propertyEquity, s.investmentCurrency)} (${s.propertyCount} ${s.propertyCount === 1 ? "property" : "properties"})` : ""}${s.totalDebt > 0 ? `\n**Total debt**: ${formatCurrency(s.totalDebt, s.currency)}` : ""}\n**Monthly surplus**: ${formatCurrency(s.surplus, s.currency)} (${s.savingsRatePct}% savings rate)\n\n**Top priorities right now:**\n${priorities.map((p, i) => `${i + 1}. ${p}`).join("\n")}`;
}

function goals(s: FinancialSnapshot): string {
  if (s.activeGoals.length === 0) {
    return "You have no active goals yet. Set at least one goal with a target amount and date so I can track progress and suggest monthly contributions.\n\nA good first goal: **3-6 months of expenses** in an emergency fund, or a specific milestone like a home deposit.";
  }
  const lines = s.activeGoals.slice(0, 4).map((g) => {
    const pct = Math.round(((g.current ?? 0) / g.target) * 100);
    const remaining = g.target - (g.current ?? 0);
    const monthsLeft = g.targetDate
      ? Math.max(
          1,
          Math.ceil(
            (new Date(g.targetDate).getTime() - Date.now()) /
              (30 * 86_400_000),
          ),
        )
      : null;
    const monthlyNeeded =
      monthsLeft && remaining > 0 ? Math.ceil(remaining / monthsLeft) : null;
    return `• **${g.title}** - ${pct}% funded (${formatCurrency(g.current ?? 0)} of ${formatCurrency(g.target)})${monthlyNeeded ? `. Need ~${formatCurrency(monthlyNeeded)}/month to stay on track` : ""}`;
  });
  const afford =
    s.surplus > 0 && s.topGoal
      ? `\n\nWith ${formatCurrency(s.surplus)}/month surplus, ${s.surplus >= (s.topGoal.target - (s.topGoal.current ?? 0)) / 12 ? "you can fund your top goal comfortably alongside other priorities." : "prioritise your highest-priority goal first, then allocate the remainder."}`
      : "";
  return `You have **${s.activeGoals.length} active goal${s.activeGoals.length === 1 ? "" : "s"}**:\n\n${lines.join("\n")}${afford}`;
}

function assets(s: FinancialSnapshot): string {
  if (s.portfolioValue === 0 && s.propertyCount === 0) {
    return "No investment holdings on file yet. Once you add assets, I can analyse concentration, suggest rebalancing, and align allocation with your risk profile.\n\n**Starting point**: build 3-6 months of expenses in cash, then diversify across low-cost index funds matching your risk tolerance.";
  }

  const insights = derivePortfolioInsights({
    holdings: s.holdings.map((h, i) => ({
      id: `ai-h-${i}`,
      name: h.name,
      symbol: h.symbol,
      assetType: h.assetType,
      value: h.value,
      costBasis: h.costBasis,
    })),
    properties: s.properties.map((p) => ({
      name: p.name,
      marketValue: p.marketValue,
      mortgageBalance: p.mortgageBalance,
      country: p.country,
      city: p.city,
    })),
    riskProfile: s.riskProfile,
    currency: s.currency,
  });
  const propertyMarketValue = s.properties.reduce(
    (sum, p) => sum + p.marketValue,
    0,
  );
  const analysis = formatPortfolioInsightsMarkdown(insights, {
    portfolioValue: s.portfolioValue,
    propertyMarketValue,
    currency: s.currency,
  });

  const ranked = [...s.holdings].sort((a, b) => b.value - a.value);
  const topLines = ranked
    .slice(0, 5)
    .map((h, i) => {
      const share =
        s.portfolioValue > 0
          ? Math.round((h.value / s.portfolioValue) * 100)
          : 0;
      const gain =
        h.gainPct == null
          ? ""
          : ` · ${h.gainPct >= 0 ? "+" : ""}${h.gainPct}% vs cost`;
      return `${i + 1}. **${h.name}**${h.symbol ? ` (${h.symbol})` : ""} - ${formatCurrency(h.value, s.investmentCurrency)} (${share}%)${gain}`;
    })
    .join("\n");

  const holdingsBlock =
    ranked.length > 0 ? `\n\n**Top holdings:**\n${topLines}` : "";

  return `**Portfolio analysis**\n\n${analysis}${holdingsBlock}\n\n**Rebalancing checklist:**\n1. No single investable holding above **25-30%**.\n2. Keep stocks, bonds, and cash inside your risk-profile band.\n3. Property is separate from the investable portfolio. A big property share is normal for homeowners but hard to sell quickly.\n4. Review once a year, or when anything drifts **5%+** from target.`;
}

function properties(s: FinancialSnapshot): string {
  if (s.propertyCount === 0) {
    return "No properties recorded. Add residential or investment real estate to track equity, mortgage leverage, and insurance in one place.";
  }
  const uninsured = s.uninsuredProperties;
  return `**${s.propertyCount} propert${s.propertyCount === 1 ? "y" : "ies"}**, ${formatCurrency(s.propertyEquity, s.investmentCurrency)} equity combined.\n\n${uninsured.length > 0 ? `**Uninsured**: ${uninsured.map((p) => p.name).join(", ")}. Landlord or home cover is usually £80-150/month.\n\n` : ""}**Check:**\n• Loan-to-value on each property. High LTV hurts if prices fall.\n• Rental yield vs mortgage on investment properties.\n• Liability cover as equity grows.`;
}

function cashFlow(s: FinancialSnapshot): string {
  if (s.monthlyIncome === 0 && s.monthlyExpenses === 0) {
    return "Add your income and expenses under Cash Flow so I can calculate surplus, savings rate, and emergency fund runway.";
  }
  const burn = s.monthlyExpenses > 0 ? s.monthlyExpenses : 0;
  const tips: string[] = [];
  if (s.surplus <= 0) {
    tips.push(
      "**Close the gap first** - spending beats income. Cut discretionary costs before investing.",
    );
  } else if (s.savingsRatePct < 10) {
    tips.push(
      `**Increase savings rate** - at ${s.savingsRatePct}%, small cuts to discretionary spend could push you toward 15-20%.`,
    );
  } else {
    tips.push(
      `**Strong surplus** - ${formatCurrency(s.surplus)}/month to split between goals, debt, and investing.`,
    );
  }
  if (s.emergencyRunwayMonths < s.emergencyTargetMonths && burn > 0) {
    tips.push(
      `**Emergency fund** - ${s.emergencyRunwayMonths.toFixed(1)} months covered; target ${s.emergencyTargetMonths}. Shortfall: ${formatCurrency(Math.max(0, burn * s.emergencyTargetMonths - s.emergencyBalance))}.`,
    );
  }
  return `**Income**: ${formatCurrency(s.monthlyIncome)}/month\n**Expenses**: ${formatCurrency(s.monthlyExpenses)}/month\n**Surplus**: ${formatCurrency(s.surplus)}/month (${s.savingsRatePct}% savings rate)\n\n${tips.map((t, i) => `${i + 1}. ${t}`).join("\n")}`;
}

function insurance(s: FinancialSnapshot): string {
  const uninsured = s.uninsuredProperties;
  if (s.insurancePolicies === 0 && uninsured.length === 0) {
    return "No insurance policies on file. At minimum, review **health**, **disability**, and **property** coverage as your income and assets grow.";
  }
  return `You hold **${s.insurancePolicies} active polic${s.insurancePolicies === 1 ? "y" : "ies"}**${s.monthlyInsurancePremium > 0 ? ` costing ${formatCurrency(s.monthlyInsurancePremium)}/month` : ""}.\n\n${uninsured.length > 0 ? `**Gap**: ${uninsured.map((p) => `${p.name} (${formatCurrency(p.market_value)})`).join(", ")} - no coverage on file.\n\n` : ""}${s.monthlyIncome > 0 ? `**Income protection**: disability cover should replace at least **60%** of ${formatCurrency(s.monthlyIncome)}/month.\n\n` : ""}${s.netWorth > 500_000 ? `**Umbrella liability**: with ${formatCurrency(s.netWorth)} net worth, consider $1-2M umbrella coverage if you do not have it.` : "Review limits annually as net worth increases."}`;
}

function debt(s: FinancialSnapshot): string {
  if (s.totalDebt === 0) {
    return "No liabilities recorded - a strong position. If you have mortgages or loans not yet added, include them for accurate net worth and payoff planning.";
  }
  const sorted = [...s.liabilities].sort(
    (a, b) => b.interestRatePct - a.interestRatePct,
  );
  const lines = sorted
    .slice(0, 3)
    .map(
      (l, i) =>
        `${i + 1}. **${l.name}** - ${formatCurrency(l.balance)} at ${l.interestRatePct}% APR`,
    )
    .join("\n");
  return `Total debt: **${formatCurrency(s.totalDebt)}** (${formatCurrency(s.standaloneDebt)} non-mortgage${s.totalDebt > s.standaloneDebt ? `, ${formatCurrency(s.totalDebt - s.standaloneDebt)} property-linked` : ""}).\n\n**Avalanche priority** (highest rate first):\n${lines || `• ${formatCurrency(s.totalDebt)} outstanding`}\n\n${s.creditCardBalance > 0 ? `Clearing **${formatCurrency(s.creditCardBalance)}** in credit card debt saves ~${formatCurrency(Math.round((s.creditCardBalance * s.creditCardRate) / 100))}/year in interest.\n\n` : ""}${s.surplus > 0 ? `With **${formatCurrency(s.surplus)}/month** surplus, direct extra payments to the highest APR balance while keeping minimums on the rest.` : "Once surplus is positive, allocate extra to highest-interest debt first."}`;
}

function retirement(s: FinancialSnapshot, q: string): string {
  if (s.currentInvested === 0 && s.retirementAge === 0) {
    return "Set your retirement target age, desired monthly income, and current invested balance under Retirement. I will then model scenarios and show whether you are on track.";
  }
  const wantsEarlier =
    matches(q, "earlier", "before age", "retire 2", "retire two");
  if (wantsEarlier && s.retirementAge > 0) {
    const targetAge = Math.max(s.currentAge + 1, s.retirementAge - 2);
    const yrsNormal = s.retirementAge - s.currentAge;
    const yrsEarly = targetAge - s.currentAge;
    const normal = projectRetirement(s.currentInvested, s.monthlySavings, yrsNormal);
    const early = projectRetirement(s.currentInvested, s.monthlySavings, yrsEarly);
    const gap = normal - early;
    const extraNeeded =
      yrsEarly > 0
        ? Math.max(0, Math.round(gap / (yrsEarly * 12 * 1.5)))
        : 0;
    return `Retiring at **age ${targetAge}** (${s.retirementAge - targetAge} years sooner) means less time for compounding.\n\n• **Projected at ${s.retirementAge}**: ~${formatCurrency(Math.round(normal), s.investmentCurrency)}\n• **Projected at ${targetAge}**: ~${formatCurrency(Math.round(early), s.investmentCurrency)}\n• **Gap**: ~${formatCurrency(Math.round(gap), s.investmentCurrency)}\n\nTo close that gap, increasing contributions by roughly **${formatCurrency(extraNeeded, s.currency)}/month** (to ${formatCurrency(s.monthlySavings + extraNeeded, s.currency)}/month total) is a reasonable starting point.${s.surplus >= extraNeeded ? `\n\nYour current surplus of ${formatCurrency(s.surplus, s.currency)}/month can support part or all of this increase.` : ""}`;
  }
  const incomeAt4Pct = Math.round((s.projectedRetirement * 0.04) / 12);
  return `**Current invested**: ${formatCurrency(s.currentInvested, s.investmentCurrency)}\n**Monthly contributions**: ${formatCurrency(s.monthlySavings, s.currency)}\n**Target retirement age**: ${s.retirementAge || "not set"}\n\n**Projected balance at retirement**: ~${formatCurrency(Math.round(s.projectedRetirement), s.investmentCurrency)}\n**Estimated sustainable income (4% rule)**: ~${formatCurrency(incomeAt4Pct, s.investmentCurrency)}/month${s.desiredMonthlyIncome > 0 ? `\n**Your target**: ${formatCurrency(s.desiredMonthlyIncome, s.currency)}/month - ${s.retirementOnTrack ? "on track." : `shortfall of ~${formatCurrency(s.desiredMonthlyIncome - incomeAt4Pct, s.currency)}/month.`}` : ""}\n\n${!s.retirementOnTrack ? "Consider raising monthly savings or extending your target retirement age by 1-2 years." : "Stay consistent with contributions and rebalance annually."}`;
}

function savingsBoost(s: FinancialSnapshot, q: string): string {
  const match = q.match(/\$?([\d,]+)/);
  const extra = match
    ? Number(match[1].replace(/,/g, ""))
    : Math.min(Math.max(500, Math.round(s.surplus / 2)), 2000);
  const yrs =
    s.retirementAge > s.currentAge ? s.retirementAge - s.currentAge : 25;
  const futureExtra = extra * 12 * ((Math.pow(1.07, yrs) - 1) / 0.07);
  const newTotal = projectRetirement(
    s.currentInvested,
    s.monthlySavings + extra,
    yrs,
  );
  return `Adding **${formatCurrency(extra, s.currency)}/month** starting today:\n\n• **Extra capital at retirement**: ~${formatCurrency(Math.round(futureExtra), s.investmentCurrency)}\n• **New projected total**: ~${formatCurrency(Math.round(newTotal), s.investmentCurrency)}\n• **Sustainable monthly income**: ~${formatCurrency(Math.round((newTotal * 0.04) / 12), s.investmentCurrency)}\n\n${s.surplus >= extra ? `Your ${formatCurrency(s.surplus, s.currency)}/month surplus supports this without lifestyle strain.` : s.surplus > 0 ? `This exceeds your current surplus by ${formatCurrency(extra - s.surplus, s.currency)}/month - pair with expense cuts or a phased increase.` : "Build positive cash flow first, then redirect surplus here."}`;
}

function tax(s: FinancialSnapshot): string {
  const rate = s.effectiveTaxRate || 28;
  const annualIncome = s.monthlyIncome * 12;
  const saving =
    annualIncome > 0 ? Math.round(annualIncome * (rate / 100) * 0.1) : 0;
  return `At **${rate}%** effective rate${s.monthlyIncome > 0 ? ` on ${formatCurrency(s.monthlyIncome)}/month income` : ""}:\n\n1. **Tax-advantaged accounts** - max pension, ISA, or 401(k)/Roth contributions${ saving > 0 ? `; could save ~**${formatCurrency(saving)}/year**` : ""}.\n2. **Tax-loss harvesting** - offset gains in taxable brokerage accounts.\n3. **Structure** - ${s.netWorth > 500_000 ? `at ${formatCurrency(s.netWorth)} net worth, estate and trust planning may reduce long-term tax drag.` : "as assets grow, review holding structures with a tax adviser."}`;
}

function advisor(s: FinancialSnapshot): string {
  const topics: string[] = [];
  if (!s.retirementOnTrack && s.desiredMonthlyIncome > 0) topics.push("retirement contribution strategy");
  if (s.uninsuredProperties.length > 0) topics.push("property insurance gaps");
  if (s.creditCardBalance > 0) topics.push("debt prioritisation");
  if (s.profileCompletionScore < 80) topics.push("completing your financial profile");
  if (topics.length === 0) topics.push("annual plan review and tax efficiency");
  return `For your next advisor session, bring questions on:\n\n${topics.map((t, i) => `${i + 1}. **${t.charAt(0).toUpperCase() + t.slice(1)}**`).join("\n")}\n\n**Snapshot to share**: ${formatCurrency(s.netWorth)} net worth, ${formatCurrency(s.surplus)}/month surplus, ${s.activeGoals.length} active goal${s.activeGoals.length === 1 ? "" : "s"}.`;
}

function profile(s: FinancialSnapshot): string {
  if (s.profileCompletionScore >= 100) {
    return `Your profile is **100% complete**. Focus on quarterly reviews: rebalance investments, refresh insurance limits, and update goal timelines as life changes.`;
  }
  const gaps: string[] = [];
  if (s.monthlyIncome === 0) gaps.push("income");
  if (s.monthlyExpenses === 0) gaps.push("expenses");
  if (s.activeGoals.length === 0) gaps.push("goals");
  if (s.portfolioValue === 0) gaps.push("assets");
  if (!s.riskProfile) gaps.push("risk assessment");
  if (s.insurancePolicies === 0) gaps.push("insurance");
  return `Profile **${s.profileCompletionScore}% complete**. Add ${gaps.slice(0, 3).join(", ")}${gaps.length > 3 ? ", and more" : ""} and the numbers here get sharper.\n\nWithout that data, projections guess instead of using your real income, assets, and goals.`;
}

function fallback(s: FinancialSnapshot): string {
  if (s.netWorth === 0 && s.monthlyIncome === 0) {
    return "Add income, expenses, assets, and liabilities to your profile and I will give you numbers-based guidance tailored to your situation.";
  }
  return `Based on your data${s.netWorth > 0 ? ` (**${formatCurrency(s.netWorth)}** net worth)` : ""}:\n\n${s.surplus > 0 ? `• Monthly surplus: **${formatCurrency(s.surplus)}**\n` : ""}${s.totalDebt > 0 ? `• Total debt: **${formatCurrency(s.totalDebt)}**\n` : ""}${s.topGoal ? `• Top goal: **${s.topGoal.title}**\n` : ""}\nAsk about **goals**, **cash flow**, **debt**, **retirement**, **insurance**, or **portfolio allocation** for a deeper dive.`;
}

const ROUTES: { test: (q: string) => boolean; run: (s: FinancialSnapshot, q: string) => string }[] = [
  {
    test: (q) =>
      matches(
        q,
        "financial health",
        "complete overview",
        "top priorities",
        "full analysis",
        "financial position",
        "next steps",
        "personalised summary",
        "personalized summary",
      ),
    run: (s) => overview(s),
  },
  {
    test: (q) =>
      matches(
        q,
        "goal",
        "tracking on my",
        "reach them faster",
        "milestone",
      ),
    run: (s) => goals(s),
  },
  {
    test: (q) =>
      matches(
        q,
        "portfolio",
        "rebalance",
        "allocation",
        "investment",
        "asset",
        "holding",
        "optimise my asset",
        "optimize my asset",
      ),
    run: (s) => assets(s),
  },
  {
    test: (q) =>
      matches(q, "propert", "real estate", "landlord", "equity", "mortgage"),
    run: (s) => properties(s),
  },
  {
    test: (q) =>
      matches(
        q,
        "cash flow",
        "cash-flow",
        "income and expense",
        "monthly surplus",
        "burn rate",
        "spending",
      ),
    run: (s) => cashFlow(s),
  },
  {
    test: (q) =>
      matches(
        q,
        "insur",
        "coverage",
        "adequately insured",
        "renewal",
      ),
    run: (s) => insurance(s),
  },
  {
    test: (q) =>
      matches(
        q,
        "debt",
        "liabilit",
        "eliminate",
        "payoff",
        "pay off",
        "credit card",
        "avalanche",
      ),
    run: (s) => debt(s),
  },
  {
    test: (q) =>
      matches(q, "retire", "retirement", "pension", "withdrawal"),
    run: (s, q) => retirement(s, q),
  },
  {
    test: (q) =>
      matches(
        q,
        "increase savings",
        "invest an extra",
        "what if i increase",
        "what if i invest",
      ),
    run: (s, q) => savingsBoost(s, q),
  },
  {
    test: (q) => matches(q, "tax", "optimis", "optimiz", "isa", "401"),
    run: (s) => tax(s),
  },
  {
    test: (q) =>
      matches(q, "advisor", "advisory", "meeting", "certified expert"),
    run: (s) => advisor(s),
  },
  {
    test: (q) =>
      matches(
        q,
        "concierge",
        "premium",
        "specialist support",
        "estate",
      ),
    run: (s) =>
      `Based on your profile (${formatCurrency(s.netWorth)} net worth, ${s.propertyCount} properties, ${s.activeGoals.length} goals), concierge can help with **tax planning**, **estate structure**, **property review**, and **portfolio deep-dives**. ${s.uninsuredProperties.length > 0 ? "Property insurance setup is an immediate candidate." : s.netWorth > 1_000_000 ? "Estate and tax planning likely offer the highest ROI." : "Start with a focused review of your top financial priority."}`,
  },
  {
    test: (q) =>
      matches(q, "account", "profile setup", "complete your profile"),
    run: (s) => profile(s),
  },
  {
    test: (q) =>
      matches(q, "support", "common issue", "proactively", "help"),
    run: (s) =>
      `Users at a similar stage usually fix cash flow first (${formatCurrency(s.surplus)}/month surplus for you), then protection (${s.emergencyRunwayMonths.toFixed(1)} months emergency runway), then long-term savings.\n\nYour profile is ${s.profileCompletionScore}% complete. Gaps there mean blind spots in the advice.`,
  },
  {
    test: (q) => matches(q, "risk assessment", "risk profile", "risk tolerance", "risk attitude"),
    run: (s) =>
      s.riskProfile
        ? `Your risk profile is **${s.riskProfile}**. This guides how aggressively you should allocate between equities, bonds, and cash. Retake the quiz if your situation or comfort level has changed.`
        : "Complete the **risk assessment** quiz so portfolio and retirement advice matches how you actually feel about risk.",
  },
  {
    test: (q) =>
      matches(
        q,
        "optimise your tax",
        "eliminate high-interest",
        "uninsured",
        "retirement trajectory",
        "emergency fund",
      ),
    run: (s, q) => {
      if (matches(q, "tax")) return tax(s);
      if (matches(q, "debt") || matches(q, "interest")) return debt(s);
      if (matches(q, "insur")) return insurance(s);
      if (matches(q, "retire")) return retirement(s, q);
      if (matches(q, "emergency")) return cashFlow(s);
      return overview(s);
    },
  },
];

export function generateLocalAiResponse(
  question: string,
  snapshot: FinancialSnapshot,
): string {
  const q = question.toLowerCase().trim();
  for (const route of ROUTES) {
    if (route.test(q)) return route.run(snapshot, q);
  }
  return fallback(snapshot);
}

export function buildGreeting(snapshot: FinancialSnapshot): string {
  const hasData =
    snapshot.netWorth > 0 ||
    snapshot.monthlyIncome > 0 ||
    snapshot.activeGoals.length > 0;
  if (!hasData) {
    return `Hello, ${snapshot.firstName}. Add income, expenses, and a few details and I can give you numbers-based answers from your ${brand.name} data.`;
  }
  const highlight =
    snapshot.surplus > 0
      ? `Your monthly surplus is **${formatCurrency(snapshot.surplus)}**`
      : snapshot.netWorth > 0
        ? `Net worth is **${formatCurrency(snapshot.netWorth)}**`
        : "Your profile is taking shape";
  return `Hello, ${snapshot.firstName}. ${highlight}.\n\nAsk anything below, or tap a suggestion.`;
}
