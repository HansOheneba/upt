import type { RiskAssessmentResult, RiskQuestion } from "@/lib/dashboard-api";
import type { User } from "@/lib/client-data";

/** Questionnaire v1.0 used when demo mode skips the API. */
export const DEMO_RISK_QUESTIONS: RiskQuestion[] = [
  {
    id: "q1",
    question: "When do you expect to need most of this money?",
    options: [
      { score: 1, label: "Within 2 years" },
      { score: 2, label: "2-5 years" },
      { score: 3, label: "5-10 years" },
      { score: 4, label: "10-20 years" },
      { score: 5, label: "More than 20 years" },
    ],
  },
  {
    id: "q2",
    question: "If your portfolio fell 20% in a month, what would you do?",
    options: [
      { score: 1, label: "Sell everything to stop further losses" },
      { score: 2, label: "Sell some holdings to reduce risk" },
      { score: 3, label: "Hold and wait for recovery" },
      { score: 4, label: "Hold and maybe add a little" },
      { score: 5, label: "Buy more while prices are lower" },
    ],
  },
  {
    id: "q3",
    question: "How would you describe your investing experience?",
    options: [
      { score: 1, label: "None - I am just getting started" },
      { score: 2, label: "Limited - mostly savings accounts" },
      { score: 3, label: "Moderate - some funds or stocks" },
      { score: 4, label: "Experienced - I manage my own portfolio" },
      { score: 5, label: "Very experienced - I use advanced strategies" },
    ],
  },
  {
    id: "q4",
    question: "How stable is your income over the next few years?",
    options: [
      { score: 1, label: "Very uncertain" },
      { score: 2, label: "Somewhat uncertain" },
      { score: 3, label: "Fairly stable" },
      { score: 4, label: "Stable with some upside" },
      { score: 5, label: "Highly stable and predictable" },
    ],
  },
  {
    id: "q5",
    question: "What matters most for this money right now?",
    options: [
      { score: 1, label: "Keeping every cedi safe" },
      { score: 2, label: "Safety first, some growth if possible" },
      { score: 3, label: "Balancing growth and stability" },
      { score: 4, label: "Growing wealth over time" },
      { score: 5, label: "Maximising long-term returns" },
    ],
  },
  {
    id: "q6",
    question: "How much short-term volatility can you live with?",
    options: [
      { score: 1, label: "Almost none - I need steady values" },
      { score: 2, label: "Small swings only" },
      { score: 3, label: "Moderate ups and downs" },
      { score: 4, label: "Large swings if returns are better" },
      { score: 5, label: "Very large swings for higher potential" },
    ],
  },
];

const BAND_COPY: Record<
  string,
  { description: string; strategy: string }
> = {
  "Capital Preservation": {
    description: "You prioritise keeping your money safe over chasing returns.",
    strategy: "Mostly cash and high-quality bonds. Limit equity exposure.",
  },
  Conservative: {
    description: "You prefer modest growth with limited volatility.",
    strategy: "Mostly bonds and cash, with a small equity allocation.",
  },
  Balanced: {
    description: "You want a mix of growth and stability.",
    strategy: "Split between equities and bonds, rebalanced regularly.",
  },
  Growth: {
    description:
      "You are fine with some volatility if returns are better long term.",
    strategy:
      "Mostly equities, around 65-75%. Some bonds and alternatives on the side.",
  },
  Aggressive: {
    description: "You accept high volatility for higher long-term potential.",
    strategy: "Heavy equity tilt with alternatives. Keep a cash buffer for shocks.",
  },
};

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function scoreToBand(finalScore: number): string {
  if (finalScore <= 1.5) return "Capital Preservation";
  if (finalScore <= 2.5) return "Conservative";
  if (finalScore <= 3.5) return "Balanced";
  if (finalScore <= 4.2) return "Growth";
  return "Aggressive";
}

function ageFromDob(dob?: string): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age;
}

function buildModifiers(user?: User | null): {
  age: number;
  dependents: number;
  debt: number;
  emergency_fund: number;
} {
  const age = ageFromDob(user?.date_of_birth);
  const ageMod =
    age == null ? 0 : age < 35 ? 0.1 : age >= 55 ? -0.2 : 0;
  const dependents = user?.dependents ?? 0;
  const dependentsMod = dependents >= 3 ? -0.3 : dependents > 0 ? -0.2 : 0;
  return {
    age: ageMod,
    dependents: dependentsMod,
    debt: -0.1,
    emergency_fund: 0.2,
  };
}

export function buildDemoRiskAssessmentResult(
  responses: Record<string, number>,
  user?: User | null,
): RiskAssessmentResult {
  const values = Object.values(responses);
  const questionnaireScore = average(values);
  const timeHorizonAvg = average(
    [responses.q1, responses.q5].filter(
      (v): v is number => typeof v === "number",
    ),
  );
  const modifiers = buildModifiers(user);
  const modifierTotal =
    modifiers.age +
    modifiers.dependents +
    modifiers.debt +
    modifiers.emergency_fund;
  const finalScore = Math.min(
    5,
    Math.max(1, Math.round((questionnaireScore + modifierTotal) * 10) / 10),
  );
  const riskBand = scoreToBand(finalScore);
  const copy = BAND_COPY[riskBand] ?? BAND_COPY.Balanced;
  const age = ageFromDob(user?.date_of_birth);

  return {
    assessment_id: `demo-ra-${Date.now()}`,
    questionnaire_version: "1.0",
    responses,
    profile_snapshot: {
      age,
      dependents: user?.dependents ?? null,
      debt_level: "moderate",
      emergency_fund_status: "funded",
      country_code: user?.resident_country ?? null,
    },
    scoring: {
      time_horizon_avg: Math.round(timeHorizonAvg * 100) / 100,
      questionnaire_score: Math.round(questionnaireScore * 100) / 100,
      modifiers,
      modifier_total: Math.round(modifierTotal * 100) / 100,
      final_score: finalScore,
    },
    result: {
      risk_band: riskBand,
      description: copy.description,
      strategy: copy.strategy,
    },
    is_recalculation: true,
    created_at: new Date().toISOString(),
  };
}
