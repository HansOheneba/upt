import "server-only";

import { createHash, createHmac } from "node:crypto";

import type { FinancialSnapshot } from "@/lib/celerey-ai-local";

/**
 * Server-side client for the Celerey AI API.
 * The browser never sees the signing secret. Demo traffic uses a fixed
 * pseudonymous id and category totals, so names, contact details, addresses,
 * employers, and family labels never leave this app.
 */

const DEMO_USER_ID = "demo";
const DEFAULT_API_URL = "https://celerey-ai.vercel.app";

const STOP_WORDS = new Set([
  "salary",
  "bonus",
  "income",
  "mortgage",
  "rent",
  "school",
  "fees",
  "groceries",
  "utilities",
  "insurance",
  "loan",
  "travel",
  "holiday",
  "property",
  "university",
  "fund",
  "house",
  "trip",
  "cash",
  "account",
  "pension",
  "emergency",
  "other",
  "monthly",
  "annual",
  "payment",
  "support",
  "family",
  "education",
  "transport",
  "dining",
  "health",
  "fitness",
  "subscriptions",
  "freelance",
  "advisory",
  "consulting",
  "project",
  "performance",
  "retention",
  "guest",
  "flat",
  "home",
  "early",
  "pay",
]);

type ChatTurn = { role: "user" | "assistant"; content: string };

let syncedKey = "";

function apiUrl(): string {
  return (process.env.CELEREY_API_URL || DEFAULT_API_URL).replace(/\/$/, "");
}

function apiSecret(): string {
  return process.env.CELEREY_API_SECRET_KEY?.trim() || "";
}

export function isCelereyConfigured(): boolean {
  return Boolean(apiSecret());
}

function b64url(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function mintToken(userId: string): string {
  const ttl = Number(process.env.CELEREY_JWT_TTL_SECONDS ?? 900);
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(
    JSON.stringify({
      sub: userId,
      exp: now + (Number.isFinite(ttl) && ttl > 0 ? ttl : 900),
    }),
  );
  const data = `${header}.${payload}`;
  const sig = createHmac("sha256", apiSecret()).update(data).digest("base64url");
  return `${data}.${sig}`;
}

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pushTerm(bag: Set<string>, value: string) {
  const term = value.trim();
  if (term.length < 4 || term.length > 80) return;
  if (STOP_WORDS.has(term.toLowerCase())) return;
  bag.add(term);
}

function collectLabelTerms(bag: Set<string>, value: unknown) {
  if (typeof value !== "string") return;
  for (const group of value.match(/\(([^)]+)\)/g) ?? []) {
    for (const part of group.slice(1, -1).split(/[&,/]| and /i)) {
      pushTerm(bag, part);
    }
  }
  const afterDash = value.split(" - ").slice(1).join(" - ");
  if (afterDash) pushTerm(bag, afterDash);
  for (const word of value.match(/\b[A-Z][a-zA-Z]{3,}\b/g) ?? []) {
    pushTerm(bag, word);
  }
}

function parenNameTerms(bag: Set<string>, value: unknown) {
  if (typeof value !== "string") return;
  for (const group of value.match(/\(([^)]+)\)/g) ?? []) {
    for (const part of group.slice(1, -1).split(/[&,/]| and /i)) {
      for (const word of part.match(/[A-Za-z][A-Za-z'’-]{3,}/g) ?? []) {
        pushTerm(bag, word);
      }
    }
  }
}

/** Names and contact details only. Category words and insurers are allowed. */
function identityGuardTerms(snapshot: FinancialSnapshot): string[] {
  const bag = new Set<string>();
  const first = snapshot.firstName?.trim();
  if (first && first.toLowerCase() !== "there") pushTerm(bag, first);
  const last = snapshot.lastName?.trim();
  if (last) pushTerm(bag, last);
  for (const row of snapshot.incomeSources) parenNameTerms(bag, row.name);
  for (const row of snapshot.expenseBreakdown) parenNameTerms(bag, row.name);
  for (const goal of snapshot.goalsDetail) {
    parenNameTerms(bag, goal.title);
    collectLabelTerms(bag, goal.title);
  }
  for (const property of snapshot.properties) {
    parenNameTerms(bag, property.name);
    parenNameTerms(bag, property.city);
  }
  for (const liability of snapshot.liabilities) parenNameTerms(bag, liability.name);
  for (const policy of snapshot.insurance) parenNameTerms(bag, policy.name);
  return [...bag];
}

function profileContainsTerm(profileJson: string, term: string): boolean {
  return new RegExp(`\\b${escapeRegExp(term)}\\b`, "i").test(profileJson);
}

function sensitiveTerms(snapshot: FinancialSnapshot): string[] {
  const bag = new Set<string>();
  const first = snapshot.firstName?.trim();
  if (first && first.toLowerCase() !== "there") pushTerm(bag, first);
  const last = snapshot.lastName?.trim();
  if (last) pushTerm(bag, last);
  for (const row of snapshot.incomeSources) collectLabelTerms(bag, row.name);
  for (const row of snapshot.expenseBreakdown) collectLabelTerms(bag, row.name);
  for (const goal of snapshot.goalsDetail) collectLabelTerms(bag, goal.title);
  for (const property of snapshot.properties) {
    collectLabelTerms(bag, property.name);
    collectLabelTerms(bag, property.city);
    pushTerm(bag, property.city);
  }
  for (const policy of snapshot.insurance) collectLabelTerms(bag, policy.name);
  for (const liability of snapshot.liabilities) collectLabelTerms(bag, liability.name);
  return [...bag].sort((a, b) => b.length - a.length);
}

function scrubText(text: string, terms: string[]): string {
  let out = text
    .replace(
      /\b(?:my name is|i am|i'm|this is)\s+[A-Z][A-Za-z'’-]+(?:\s+[A-Z][A-Za-z'’-]+){0,3}\b/gi,
      "the client",
    )
    .replace(/\b(?:mr|mrs|ms|dr|miss)\.?\s+[A-Z][A-Za-z'’-]+\b/gi, "the client");
  for (const term of terms) {
    out = out.replace(new RegExp(`\\b${escapeRegExp(term)}\\b`, "gi"), "the client");
  }
  out = out.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email redacted]");
  out = out.replace(
    /(?<![\d.,])(?:\+\d{1,3}[ -]?)?\d(?:[ -]?\d){9,18}(?![\d.,])/g,
    "[number redacted]",
  );
  return out.replace(/\s+/g, " ").trim();
}

function incomeBucket(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("salary") || n.includes("wage")) return "Salary";
  if (n.includes("rent")) return "Rental income";
  if (n.includes("bonus")) return "Bonus";
  if (n.includes("freelance") || n.includes("consult")) return "Self-employment";
  return "Other income";
}

function expenseBucket(name: string): { category: string; essential: boolean } {
  const n = name.toLowerCase();
  if (n.includes("mortgage")) return { category: "Mortgage", essential: true };
  if (n.includes("rent")) return { category: "Rent", essential: true };
  if (n.includes("school") || n.includes("education") || n.includes("university")) {
    return { category: "Education", essential: true };
  }
  if (n.includes("grocer")) return { category: "Groceries", essential: true };
  if (n.includes("utilit")) return { category: "Utilities", essential: true };
  if (n.includes("insurance")) return { category: "Insurance", essential: true };
  if (n.includes("loan") || n.includes("car") || n.includes("transport") || n.includes("commute")) {
    return { category: "Transport", essential: true };
  }
  if (n.includes("remit") || n.includes("parent") || n.includes("family")) {
    return { category: "Family support", essential: true };
  }
  if (n.includes("flight") || n.includes("travel") || n.includes("holiday") || n.includes("trip")) {
    return { category: "Travel", essential: false };
  }
  if (n.includes("restaurant") || n.includes("dining")) {
    return { category: "Dining", essential: false };
  }
  if (n.includes("gym") || n.includes("health")) {
    return { category: "Health", essential: false };
  }
  if (n.includes("subscription")) return { category: "Subscriptions", essential: false };
  return { category: "Other expenses", essential: false };
}

function goalName(title: string): string {
  const n = title.toLowerCase();
  if (n.includes("university") || n.includes("school") || n.includes("education")) {
    return "Education fund";
  }
  if (n.includes("house") || n.includes("property") || n.includes("home")) {
    return "Property goal";
  }
  if (n.includes("mortgage") || n.includes("debt") || n.includes("loan")) {
    return "Debt payoff";
  }
  if (n.includes("trip") || n.includes("holiday") || n.includes("travel")) {
    return "Travel goal";
  }
  if (n.includes("retire")) return "Retirement goal";
  return "Savings goal";
}

function goalType(name: string): string {
  if (name === "Education fund") return "education";
  if (name === "Property goal") return "purchase";
  if (name === "Debt payoff") return "savings";
  if (name === "Travel goal") return "travel";
  if (name === "Retirement goal") return "retirement";
  return "savings";
}

function assetClass(assetType: string): string {
  const n = assetType.toLowerCase();
  if (n.includes("bond")) return "bond";
  if (n.includes("crypto")) return "crypto";
  if (n.includes("commod")) return "commodity";
  if (n.includes("cash")) return "cash";
  if (n.includes("property") || n.includes("real")) return "property";
  return "equity";
}

function accountType(type: string): string {
  if (type === "retirement") return "pension";
  if (type === "cash") return "current";
  return "investment";
}

function accountLabel(type: string): string {
  if (type === "pension") return "Pension account";
  if (type === "current") return "Cash account";
  return "Investment account";
}

function liabilityType(type: string): string {
  if (type === "auto_loan") return "car_loan";
  if (type === "credit_card") return "credit_card";
  if (type === "mortgage") return "mortgage";
  if (type === "student_loan") return "student_loan";
  if (type === "personal_loan") return "personal_loan";
  return "personal_loan";
}

function futureDate(years: number): string {
  const date = new Date();
  const whole = Number.isFinite(years) && years > 0 ? Math.round(years) : 5;
  date.setFullYear(date.getFullYear() + whole);
  return date.toISOString().slice(0, 10);
}

function riskAssessment(profile: string | null, years: number) {
  const n = (profile ?? "").toLowerCase();
  if (n.includes("conserv") || n.includes("cautious")) {
    return { score: 3, profile: "conservative", capacity: "low", time_horizon_years: years, loss_tolerance_pct: 10 };
  }
  if (n.includes("growth") || n.includes("aggress")) {
    return { score: 8, profile: "aggressive", capacity: "high", time_horizon_years: years, loss_tolerance_pct: 30 };
  }
  return { score: 5, profile: "moderate", capacity: "medium", time_horizon_years: years, loss_tolerance_pct: 20 };
}

/** Financial profile with identity removed. Amounts and categories stay. */
export function toDeidentifiedProfile(snapshot: FinancialSnapshot) {
  const currency = snapshot.currency || "GBP";
  const age = snapshot.currentAge >= 18 ? Math.round(snapshot.currentAge) : 35;
  const horizon = Math.max(
    1,
    (snapshot.retirementAge || age + 20) - age,
  );

  const income = new Map<string, number>();
  for (const row of snapshot.incomeSources) {
    if (!row.recurring || num(row.amount) === 0) continue;
    const key = incomeBucket(row.name);
    income.set(key, (income.get(key) ?? 0) + num(row.amount));
  }
  if (income.size === 0 && snapshot.monthlyIncome > 0) {
    income.set("Income", snapshot.monthlyIncome);
  }

  const expenses = new Map<string, { amount: number; essential: boolean }>();
  for (const row of snapshot.expenseBreakdown) {
    if (!row.recurring || num(row.amount) === 0) continue;
    const bucket = expenseBucket(row.name);
    const current = expenses.get(bucket.category) ?? {
      amount: 0,
      essential: bucket.essential,
    };
    current.amount += num(row.amount);
    current.essential = current.essential || bucket.essential || row.essential;
    expenses.set(bucket.category, current);
  }
  if (expenses.size === 0 && snapshot.monthlyExpenses > 0) {
    expenses.set("Living costs", { amount: snapshot.monthlyExpenses, essential: true });
  }

  const holdingTotal = snapshot.holdings.reduce((sum, holding) => sum + num(holding.value), 0);

  return {
    user: {
      user_id: DEMO_USER_ID,
      name: "Client",
      age,
      country: snapshot.country || "UK",
      currency,
      employment_status: "employed",
      marital_status: snapshot.maritalStatus || "single",
    },
    risk_assessment: riskAssessment(snapshot.riskProfile, horizon),
    income: [...income.entries()].map(([source, amount]) => ({
      source,
      amount: Math.round(amount),
      frequency: "monthly",
    })),
    expenses: [...expenses.entries()].map(([category, row]) => ({
      category,
      amount: Math.round(row.amount),
      frequency: "monthly",
      is_essential: row.essential,
    })),
    goals: snapshot.goalsDetail
      .filter((goal) => !goal.completed && num(goal.target) > 0)
      .map((goal, index) => {
        const name = goalName(goal.title);
        return {
          goal_id: `goal_${index + 1}`,
          name,
          target_amount: num(goal.target),
          current_savings: num(goal.current),
          target_date: futureDate(goal.yearsRemaining),
          priority: "medium",
          monthly_contribution: num(goal.monthlyContributionNeeded),
          goal_type: goalType(name),
        };
      }),
    accounts: snapshot.accounts.map((account, index) => ({
      account_id: `account_${index + 1}`,
      name: accountLabel(accountType(account.type)),
      account_type: accountType(account.type),
      balance: num(account.balance),
      currency: snapshot.currency || currency,
      interest_rate: 0,
      institution: "",
    })),
    holdings: snapshot.holdings.map((holding, index) => ({
      ticker: holding.symbol?.trim() || `H${index + 1}`,
      name: holding.name,
      asset_class: assetClass(holding.assetType),
      value: num(holding.value),
      units: 0,
      purchase_price: 0,
      currency: snapshot.investmentCurrency || currency,
      allocation_pct:
        holdingTotal > 0
          ? Math.round((num(holding.value) / holdingTotal) * 1000) / 10
          : 0,
    })),
    properties: snapshot.properties.map((property, index) => ({
      property_id: `property_${index + 1}`,
      address: `Property ${index + 1}`,
      property_type: property.type || "residential",
      current_value: num(property.marketValue),
      purchase_price: num(property.marketValue),
      purchase_date: "2000-01-01",
      outstanding_mortgage: num(property.mortgageBalance),
      monthly_rental_income: 0,
      is_primary_residence: index === 0,
    })),
    liabilities: snapshot.liabilities.map((liability, index) => ({
      liability_id: `liability_${index + 1}`,
      name: liabilityType(liability.type).replaceAll("_", " "),
      liability_type: liabilityType(liability.type),
      outstanding_balance: num(liability.balance),
      interest_rate: num(liability.interestRatePct),
      monthly_payment: num(liability.minPaymentMonthly),
      remaining_months: 0,
    })),
    insurance: snapshot.insurance.map((policy, index) => ({
      policy_id: `policy_${index + 1}`,
      insurance_type: policy.category || "other",
      provider: policy.provider || "Insurer",
      cover_amount: num(policy.coverageAmount),
      monthly_premium: num(policy.premiumMonthly),
      expiry_date: "",
    })),
    retirement: {
      current_pension_pot: num(snapshot.retirementDetails.existingPensionBalance),
      monthly_contribution: num(snapshot.retirementDetails.monthlyPensionContribution),
      employer_contribution: 0,
      state_pension_age: 67,
      target_retirement_age: snapshot.retirementAge || 65,
      target_annual_income: num(snapshot.desiredMonthlyIncome) * 12,
      expected_state_pension: 0,
    },
    emergency_fund: {
      current_balance: num(snapshot.emergencyBalance),
      target_months: num(snapshot.emergencyTargetMonths) || 6,
    },
    tax_profile: {
      marginal_rate_pct: num(snapshot.effectiveTaxRate),
    },
    dependents: [],
  };
}

async function postJson(path: string, body: unknown): Promise<Response> {
  return fetch(`${apiUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${mintToken(DEMO_USER_ID)}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(path === "/profile/sync" ? 120_000 : 90_000),
  });
}

async function ensureSynced(profile: ReturnType<typeof toDeidentifiedProfile>) {
  const key = createHash("sha256").update(JSON.stringify(profile)).digest("hex");
  if (syncedKey === key) return;
  const res = await postJson("/profile/sync", { profile });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Celerey profile sync failed (${res.status})${detail ? `: ${detail.slice(0, 180)}` : ""}`,
    );
  }
  syncedKey = key;
}

function translateSse(upstream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
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
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";
          for (const frame of frames) {
            const line = frame.split("\n").find((item) => item.startsWith("data: "));
            if (!line) continue;
            const raw = line.slice(6).trim();
            if (!raw || raw === "[DONE]") continue;
            try {
              const payload = JSON.parse(raw) as {
                token?: string;
                event?: string;
                detail?: string;
              };
              if (payload.token) {
                const delta = payload.token.replace(/\u2014|\u2013/g, "-");
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`),
                );
              } else if (payload.event === "error") {
                throw new Error(payload.detail || "Celerey AI failed while answering.");
              }
            } catch (error) {
              if (error instanceof SyntaxError) continue;
              throw error;
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

const sseHeaders = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
};

export async function demoCelereyChat(
  messages: ChatTurn[],
  snapshot: FinancialSnapshot,
): Promise<Response> {
  if (!isCelereyConfigured()) {
    return Response.json(
      { error: "Celerey AI is not configured." },
      { status: 503 },
    );
  }

  let lastUser = -1;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === "user") {
      lastUser = i;
      break;
    }
  }
  if (lastUser < 0) {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const terms = sensitiveTerms(snapshot);
  const question = scrubText(messages[lastUser].content, terms).slice(0, 2000);
  if (!question) {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  const history = messages
    .slice(Math.max(0, lastUser - 6), lastUser)
    .map((turn) => ({
      role: turn.role,
      content: scrubText(turn.content, terms).slice(0, 8000),
    }))
    .filter((turn) => turn.content.length > 0);

  const profile = toDeidentifiedProfile(snapshot);
  const encoded = JSON.stringify(profile).toLowerCase();
  const leaked = identityGuardTerms(snapshot).find((term) =>
    profileContainsTerm(encoded, term),
  );
  if (leaked || /[\w.+-]+@[\w-]+\.[\w.-]+/.test(encoded)) {
    return Response.json(
      { error: "Refusing to send personal details to Celerey AI." },
      { status: 400 },
    );
  }

  try {
    await ensureSynced(profile);
    let upstream = await postJson("/ask", {
      user_id: DEMO_USER_ID,
      question,
      history,
    });
    if (upstream.status === 404) {
      syncedKey = "";
      await ensureSynced(profile);
      upstream = await postJson("/ask", {
        user_id: DEMO_USER_ID,
        question,
        history,
      });
    }
    if (!upstream.ok || !upstream.body) {
      const detail = await upstream.text().catch(() => "");
      return Response.json(
        {
          error: `Celerey AI is unavailable (${upstream.status})${detail ? `: ${detail.slice(0, 180)}` : ""}`,
        },
        { status: 502 },
      );
    }
    return new Response(translateSse(upstream.body), { headers: sseHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Celerey AI request failed.";
    return Response.json({ error: message }, { status: 502 });
  }
}
