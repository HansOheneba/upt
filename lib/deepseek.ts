import type { FinancialSnapshot } from "@/lib/celerey-ai-local";
import {
  CLIENT_FORMAT_PROMPT,
  CLIENT_QUESTION_INSTRUCTION,
  CLIENT_VOICE_PROMPT,
  NOT_FINANCIAL_ADVICE,
} from "@/lib/copilot-voice";
import { brand } from "@/lib/tenant";

export type DeepSeekChatRole = "system" | "user" | "assistant";

export type DeepSeekChatMessage = {
  role: DeepSeekChatRole;
  content: string;
};

function getApiKey(): string | undefined {
  return process.env.DEEPSEEK_API_KEY?.trim() || undefined;
}

function getBaseUrl(): string {
  return (
    process.env.DEEPSEEK_BASE_URL?.replace(/\/$/, "") ||
    "https://api.deepseek.com"
  );
}

function getModel(): string {
  return process.env.DEEPSEEK_MODEL?.trim() || "deepseek-chat";
}

export function isDeepSeekConfigured(): boolean {
  return Boolean(getApiKey());
}

export function isDemoAiEnabled(): boolean {
  return process.env.DEMO_AI_ENABLED === "true";
}

function formatSnapshotForPrompt(snapshot: FinancialSnapshot): string {
  const history = snapshot.cashFlowHistory;
  const histAvg =
    history.length > 0
      ? {
          months: history.length,
          avgIncome: Math.round(
            history.reduce((s, p) => s + p.income, 0) / history.length,
          ),
          avgExpenses: Math.round(
            history.reduce((s, p) => s + p.expenses, 0) / history.length,
          ),
          avgSurplus: Math.round(
            history.reduce((s, p) => s + p.surplus, 0) / history.length,
          ),
          firstMonth: history[0]?.month ?? null,
          lastMonth: history[history.length - 1]?.month ?? null,
        }
      : null;

  const context = {
    profile: {
      firstName: snapshot.firstName,
      currentAge: snapshot.currentAge,
      currency: snapshot.currency,
      country: snapshot.country,
      occupation: snapshot.occupation,
      maritalStatus: snapshot.maritalStatus,
      dependents: snapshot.dependents,
      riskProfile: snapshot.riskProfile,
      profileCompletionScore: snapshot.profileCompletionScore,
    },
    netWorth: snapshot.netWorth,
    cashFlow: {
      currentMonth: {
        income: snapshot.monthlyIncome,
        expenses: snapshot.monthlyExpenses,
        surplus: snapshot.surplus,
        savingsRatePct: snapshot.savingsRatePct,
      },
      incomeSources: snapshot.incomeSources,
      expenseBreakdown: snapshot.expenseBreakdown,
      historyByMonth: history,
      historyAverages: histAvg,
      serverSummary: snapshot.cashFlowSummary,
    },
    portfolioValue: snapshot.portfolioValue,
    holdings: snapshot.holdings,
    holdingsCount: snapshot.holdingsCount,
    largestHolding: snapshot.largestHolding
      ? {
          name: snapshot.largestHolding.name,
          assetType: snapshot.largestHolding.asset_type,
          value: snapshot.largestHolding.current_value,
        }
      : null,
    properties: snapshot.properties,
    propertyEquity: snapshot.propertyEquity,
    accounts: snapshot.accounts,
    debt: {
      totalDebt: snapshot.totalDebt,
      standaloneDebt: snapshot.standaloneDebt,
      creditCardBalance: snapshot.creditCardBalance,
      creditCardRate: snapshot.creditCardRate,
      topDebt: snapshot.topDebt
        ? {
            name: snapshot.topDebt.name,
            balance: snapshot.topDebt.balance,
            interestRatePct: snapshot.topDebt.interestRatePct,
            type: snapshot.topDebt.type,
          }
        : null,
      liabilities: snapshot.liabilities.map((l) => ({
        name: l.name,
        balance: l.balance,
        interestRatePct: l.interestRatePct,
        type: l.type,
        minPaymentMonthly: l.minPaymentMonthly,
      })),
    },
    emergency: {
      balance: snapshot.emergencyBalance,
      runwayMonths: snapshot.emergencyRunwayMonths,
      targetMonths: snapshot.emergencyTargetMonths,
    },
    retirement: {
      retirementAge: snapshot.retirementAge,
      currentInvested: snapshot.currentInvested,
      monthlySavings: snapshot.monthlySavings,
      desiredMonthlyIncome: snapshot.desiredMonthlyIncome,
      projectedRetirement: snapshot.projectedRetirement,
      retirementOnTrack: snapshot.retirementOnTrack,
      ...snapshot.retirementDetails,
    },
    insurance: {
      policyCount: snapshot.insurancePolicies,
      monthlyPremium: snapshot.monthlyInsurancePremium,
      policies: snapshot.insurance,
      uninsuredProperties: snapshot.uninsuredProperties.map((p) => ({
        name: p.name,
        marketValue: p.market_value,
      })),
    },
    goals: snapshot.goalsDetail,
    topGoal: snapshot.topGoal
      ? {
          title: snapshot.topGoal.title,
          target: snapshot.topGoal.target,
          current: snapshot.topGoal.current ?? 0,
        }
      : null,
    tax: {
      effectiveTaxRate: snapshot.effectiveTaxRate,
    },
  };

  return JSON.stringify(context, null, 2);
}

export function buildRagSystemPrompt(
  snapshot: FinancialSnapshot,
  options?: { isDemo?: boolean },
): string {
  const demoNote = options?.isDemo
    ? "The user is exploring a demo profile. Use only the snapshot. Do not mention that the profile is sample data unless they ask."
    : `The user is viewing their live ${brand.name} financial profile.`;

  return [
    "You are Celerey Copilot, an analyst inside the client dashboard.",
    "You only reason from the financial snapshot in this prompt. Never invent holdings, balances, or dates.",
    "Write in British English. No emoji, no marketing language.",
    CLIENT_QUESTION_INSTRUCTION,
    demoNote,
    "Use cash-flow history when the question is about a trend. Do not assume only the current month exists when history is present.",
    "When a figure is in a named currency, keep that currency. Do not relabel cedis, pounds, or dollars as each other.",
    CLIENT_VOICE_PROMPT,
    CLIENT_FORMAT_PROMPT,
    `Every answer ends with this exact line: ${NOT_FINANCIAL_ADVICE}`,
    "",
    "FINANCIAL_SNAPSHOT:",
    formatSnapshotForPrompt(snapshot),
  ].join("\n");
}

export async function createChatCompletionStream(
  messages: DeepSeekChatMessage[],
  options?: { temperature?: number },
): Promise<Response> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("DeepSeek API key is not configured.");
  }

  const response = await fetch(`${getBaseUrl()}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: getModel(),
      messages,
      temperature: options?.temperature ?? 0.4,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `DeepSeek request failed (${response.status})${errorBody ? `: ${errorBody.slice(0, 200)}` : ""}`,
    );
  }

  if (!response.body) {
    throw new Error("DeepSeek returned an empty stream.");
  }

  return response;
}

export function pipeOpenAiStreamToSse(
  upstream: ReadableStream<Uint8Array>,
): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new ReadableStream({
    async start(controller) {
      const reader = upstream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;

            const data = trimmed.slice(6).trim();
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data) as {
                choices?: { delta?: { content?: string } }[];
              };
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`),
                );
              }
            } catch {
              // Skip malformed SSE chunks.
            }
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        controller.error(error);
      } finally {
        reader.releaseLock();
      }
    },
  });
}
