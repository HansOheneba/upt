"use client";

import * as React from "react";
import { ArrowUp, PanelLeft, Square, SquarePen } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CelereyAiSymbol } from "@/components/dashboard/celerey-ai-symbol";
import { CopilotHistoryPanel } from "@/components/dashboard/copilot-history-panel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useClientGate } from "@/hooks/useClientGate";
import { formatCurrency } from "@/lib/client-data";
import { useFinancialStore } from "@/store/financialStore";
import { isDemoMode, toDemoPath } from "@/lib/demo-mode";
import { streamAiChatReply } from "@/lib/ai-chat-client";
import {
  buildFinancialSnapshot,
  buildGreeting,
  buildSuggestedPrompts,
  generateLocalAiResponse,
  type FinancialSnapshot,
} from "@/lib/celerey-ai-local";
import {
  chatTitleFromMessage,
  useCopilotHistory,
  type StoredMessage,
} from "@/lib/copilot-history";
import { plainCopilotText, withNotAdviceLine } from "@/lib/copilot-voice";

const COPILOT_NAME = "Celerey Copilot";
const COLUMN = "mx-auto w-full max-w-3xl";

// ── Types ─────────────────────────────────────────────────────────────────────

type Priority = "high" | "medium" | "low";
type InsightKind = "opportunity" | "risk" | "milestone" | "action";

type Insight = {
  id: string;
  kind: InsightKind;
  title: string;
  description: string;
  priority: Priority;
  cta?: string;
};

type ChatMessage = {
  id: string;
  role: "ai" | "user";
  text: string;
  timestamp: Date;
};

function toStoredMessage(message: ChatMessage): StoredMessage {
  return {
    id: message.id,
    role: message.role,
    text: message.text,
    timestamp: message.timestamp.toISOString(),
  };
}

function fromStoredMessage(message: StoredMessage): ChatMessage {
  const timestamp = new Date(message.timestamp);
  return {
    id: message.id,
    role: message.role,
    text: message.text,
    timestamp: Number.isNaN(timestamp.getTime()) ? new Date() : timestamp,
  };
}

// ── Kind metadata ─────────────────────────────────────────────────────────────

const KIND_LABEL: Record<InsightKind, string> = {
  opportunity: "Opportunity",
  risk: "Risk",
  milestone: "Milestone",
  action: "Action needed",
};

function suggestionCategory(text: string): string {
  const q = text.toLowerCase();
  if (q.includes("retire")) return "Retirement";
  if (
    q.includes("invest") ||
    q.includes("holding") ||
    q.includes("rebalance") ||
    q.includes("concentrat")
  ) {
    return "Investments";
  }
  if (q.includes("cash") || q.includes("surplus") || q.includes("spend")) {
    return "Cash flow";
  }
  if (q.includes("insur")) return "Protection";
  if (q.includes("debt")) return "Liabilities";
  if (q.includes("tax")) return "Tax";
  return "Your finances";
}

function followUpPrompts(question: string): string[] {
  const q = question.toLowerCase();

  if (/spend|expense|cash|surplus|income/.test(q)) {
    return [
      "How much did I spend this month?",
      "Am I generating or using cash?",
      "What are my largest expenses?",
    ];
  }

  if (/retire|goal|plan/.test(q)) {
    return [
      "How am I doing toward retirement?",
      "What happens if I increase my monthly investment?",
      "Which goal is furthest behind?",
    ];
  }

  if (/debt|liabilit|mortgage|loan|credit/.test(q)) {
    return [
      "What are my biggest liabilities?",
      "Which debt costs the most?",
      "How does debt affect my net worth?",
    ];
  }

  if (/invest|portfolio|holding|net worth|worth|propert/.test(q)) {
    return [
      "What do I own?",
      "What are my biggest liabilities?",
      "How am I doing toward retirement?",
    ];
  }

  return [
    "How much did I spend this month?",
    "How am I doing toward retirement?",
    "What are my biggest liabilities?",
  ];
}

function InlineText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, index) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={index} className="font-medium">
            {part.slice(2, -2)}
          </strong>
        ) : (
          part
        ),
      )}
    </>
  );
}

function isTableLine(line: string) {
  const trimmed = line.trim();
  return trimmed.startsWith("|") && trimmed.endsWith("|");
}

function isTableRule(line: string) {
  return /^\|?\s*:?-{3,}/.test(line.trim());
}

function tableCells(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function RichText({
  text,
  streaming = false,
}: {
  text: string;
  streaming?: boolean;
}) {
  const lines = plainCopilotText(text).split("\n");
  const blocks: React.ReactNode[] = [];
  let index = 0;
  let key = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (isTableLine(line)) {
      const tableLines: string[] = [];
      while (index < lines.length && isTableLine(lines[index])) {
        if (!isTableRule(lines[index])) tableLines.push(lines[index]);
        index += 1;
      }
      const [header, ...rows] = tableLines.map(tableCells);
      if (header && rows.length > 0) {
        blocks.push(
          <div key={key} className="overflow-x-auto">
            <table className="w-full min-w-[16rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  {header.map((cell, cellIndex) => (
                    <th
                      key={cellIndex}
                      className="px-2 py-1.5 text-[11px] font-medium tracking-[0.06em] text-muted-foreground uppercase"
                    >
                      <InlineText text={cell} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-border/70">
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className={
                          cellIndex === 0
                            ? "px-2 py-1.5 font-medium"
                            : "px-2 py-1.5 tabular-nums text-muted-foreground"
                        }
                      >
                        <InlineText text={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
        key += 1;
      }
      continue;
    }

    if (/^\s*[-*•]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*[-*•]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*[-*•]\s+/, ""));
        index += 1;
      }
      blocks.push(
        <ul key={key} className="list-disc space-y-1 pl-4">
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>
              <InlineText text={item} />
            </li>
          ))}
        </ul>,
      );
      key += 1;
      continue;
    }

    const paragraph: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !isTableLine(lines[index]) &&
      !/^\s*[-*•]\s+/.test(lines[index])
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }
    const paragraphText = paragraph.join(" ");
    const isDisclaimer = /not financial advice/i.test(paragraphText);
    blocks.push(
      <p
        key={key}
        className={
          isDisclaimer ? "text-xs text-muted-foreground" : undefined
        }
      >
        <InlineText text={paragraphText} />
      </p>,
    );
    key += 1;
  }

  return (
    <div className="space-y-3 text-sm leading-relaxed">
      {blocks}
      {streaming ? (
        <span className="inline-block h-4 w-0.5 bg-foreground/50 align-middle motion-safe:animate-pulse" />
      ) : null}
    </div>
  );
}

function positionRows(snapshot: FinancialSnapshot) {
  const cash = snapshot.accounts
    .filter((account) => account.type === "cash")
    .reduce((sum, account) => sum + account.balance, 0);
  const propertyValue = snapshot.properties.reduce(
    (sum, property) => sum + property.marketValue,
    0,
  );
  const rows: { label: string; value: string }[] = [];

  if (snapshot.portfolioValue > 0) {
    rows.push({
      label: "Investments",
      value: formatCurrency(snapshot.portfolioValue),
    });
  }
  if (propertyValue > 0) {
    rows.push({
      label: "Properties",
      value: formatCurrency(propertyValue),
    });
  }
  if (cash > 0) {
    rows.push({ label: "Cash", value: formatCurrency(cash) });
  }
  if (snapshot.totalDebt > 0) {
    rows.push({
      label: "Liabilities",
      value: formatCurrency(-snapshot.totalDebt),
    });
  }

  return rows;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AIInsightsPage() {
  const searchParams = useSearchParams();
  const { ready, auth } = useClientGate();
  const store = useFinancialStore();
  const demoMode = isDemoMode();
  const advisorHref = toDemoPath("/dashboard/appointments");
  const historyScope = !ready
    ? null
    : demoMode
      ? "demo"
      : auth.email || "account";
  const {
    chats,
    activeId,
    ready: historyReady,
    chatsRef,
    activeIdRef,
    write: writeHistory,
  } = useCopilotHistory(historyScope);

  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const messagesRef = React.useRef(messages);
  messagesRef.current = messages;
  const [input, setInput] = React.useState("");
  const [typing, setTyping] = React.useState(false);
  const [streamingMessageId, setStreamingMessageId] = React.useState<
    string | null
  >(null);
  const endRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const snapshot = React.useMemo(
    () =>
      buildFinancialSnapshot({
        user: store.user,
        incomeRows: store.incomeRows,
        expenseCategories: store.expenseCategories,
        goals: store.goals,
        retirement: store.retirement,
        liabilities: store.liabilities,
        emergencyFund: store.emergencyFund,
        holdings: store.holdings,
        insurancePolicies: store.insurancePolicies,
        propertyAssets: store.propertyAssets,
        taxProfile: store.taxProfile,
        profileCompletionScore: store.profileCompletionScore,
        cashFlowHistory: store.cashFlowHistory,
        cashFlowSummary: store.cashFlowSummary,
        accounts: store.accounts,
      }),
    [
      store.user,
      store.incomeRows,
      store.expenseCategories,
      store.goals,
      store.retirement,
      store.liabilities,
      store.emergencyFund,
      store.holdings,
      store.insurancePolicies,
      store.propertyAssets,
      store.taxProfile,
      store.profileCompletionScore,
      store.cashFlowHistory,
      store.cashFlowSummary,
      store.accounts,
    ],
  );

  const suggestedPrompts = React.useMemo(
    () => buildSuggestedPrompts(snapshot),
    [snapshot],
  );

  // ── Dynamic insights from store ─────────────────────────────────────────────
  const insights = React.useMemo((): Insight[] => {
    const list: Insight[] = [];

    // Tax opportunity
    list.push({
      id: "tax",
      kind: "opportunity",
      title: "Tax moves worth a look",
      description:
        snapshot.effectiveTaxRate > 0
          ? `At ${snapshot.effectiveTaxRate}% effective rate, maxing pension/ISA contributions and harvesting losses could cut tax materially.`
          : "Max out tax-advantaged accounts and review how holdings are structured.",
      priority: "high",
      cta: "Discuss with Advisor",
    });

    // High-interest debt action
    if (snapshot.creditCardBalance > 0) {
      const interestSaved = Math.round(
        (snapshot.creditCardBalance * snapshot.creditCardRate) / 100 / 2,
      );
      list.push({
        id: "credit-card",
        kind: "action",
        title: "Pay off the credit card first",
        description: `${formatCurrency(snapshot.creditCardBalance)} at ${snapshot.creditCardRate}% APR. Paying it down saves ~${formatCurrency(interestSaved)} in interest.`,
        priority: "high",
        cta: "Plan Payoff",
      });
    } else if (snapshot.totalDebt > 0) {
      list.push({
        id: "debt",
        kind: "action",
        title: "Review your debt",
        description: `${formatCurrency(snapshot.totalDebt)} outstanding. Hit the highest APR balance first.`,
        priority: "medium",
        cta: "Plan Payoff",
      });
    }

    // Uninsured properties
    const uninsured = snapshot.uninsuredProperties;
    if (uninsured.length > 0) {
      const first = uninsured[0];
      list.push({
        id: "uninsured-prop",
        kind: "risk",
        title: `Uninsured Property${uninsured.length > 1 ? ` (${uninsured.length})` : ""}`,
        description:
          uninsured.length === 1
            ? `${first.name} (${formatCurrency(first.market_value)}) has no insurance. Landlord cover is usually £80-120/month.`
            : `${uninsured.length} properties including ${first.name} have no cover on file.`,
        priority: "high",
        cta: "Add Insurance",
      });
    }

    // Portfolio / concentration risk (data-driven)
    if (snapshot.portfolioValue > 0 || snapshot.propertyCount > 0) {
      const propertyMarketValue = snapshot.properties.reduce(
        (s, p) => s + p.marketValue,
        0,
      );
      const totalGross = snapshot.portfolioValue + propertyMarketValue;
      const brickPct =
        totalGross > 0
          ? Math.round((propertyMarketValue / totalGross) * 100)
          : 0;
      const topHolding = [...snapshot.holdings].sort(
        (a, b) => b.value - a.value,
      )[0];
      const topName = topHolding?.name;
      const topShare =
        topHolding && snapshot.portfolioValue > 0
          ? Math.round((topHolding.value / snapshot.portfolioValue) * 100)
          : 0;

      if (brickPct >= 60) {
        list.push({
          id: "portfolio",
          kind: "risk",
          title: "Most wealth is in property",
          description: `${brickPct}% of total assets is property (${formatCurrency(propertyMarketValue)}). Investable holdings are ${formatCurrency(snapshot.portfolioValue)}. Put new savings into markets before buying another place.`,
          priority: "high",
          cta: "Review Portfolio",
        });
      } else if (topShare >= 25 && topName) {
        list.push({
          id: "portfolio",
          kind: "risk",
          title: "One holding is too big",
          description: `${topName} is ~${topShare}% of investable assets. Trim toward 15-20%. Rebalance anything that drifts 5%+ from target.`,
          priority: "medium",
          cta: "Review Portfolio",
        });
      } else if (snapshot.portfolioValue > 0) {
        list.push({
          id: "portfolio",
          kind: "risk",
          title: "Check portfolio mix",
          description: `Investable portfolio ${formatCurrency(snapshot.portfolioValue)}${brickPct > 0 ? `, property ${brickPct}% of total assets` : ""}${topName ? `, largest holding ${topName}` : ""}. Rebalance when any piece drifts 5%+ from target.`,
          priority: "medium",
          cta: "Review Portfolio",
        });
      }
    }

    // Retirement trajectory
    if (
      snapshot.currentInvested > 0 &&
      snapshot.retirementAge > 0 &&
      snapshot.currentAge > 0
    ) {
      list.push({
        id: "retirement",
        kind: "opportunity",
        title: `Retirement: ${snapshot.retirementOnTrack ? "on track" : "needs work"}`,
        description: `${formatCurrency(snapshot.currentInvested)} invested, ${formatCurrency(snapshot.monthlySavings)}/mo saves toward ~${formatCurrency(Math.round(snapshot.projectedRetirement))} by age ${snapshot.retirementAge}. ${snapshot.retirementOnTrack ? "Extra contributions could let you retire earlier." : "Raise savings or push retirement age to hit your income target."}`,
        priority: "medium",
        cta: "Explore Scenarios",
      });
    } else {
      list.push({
        id: "retirement",
        kind: "action",
        title: "Set up retirement",
        description:
          "Add retirement age, target income, and current balance to unlock projections.",
        priority: "medium",
        cta: "Configure Retirement",
      });
    }

    // Top in-progress goal
    const topGoal = snapshot.topGoal;
    if (topGoal) {
      const pct = Math.round(((topGoal.current ?? 0) / topGoal.target) * 100);
      list.push({
        id: `goal-${topGoal.id}`,
        kind: pct >= 100 ? "milestone" : "opportunity",
        title: `Goal: ${topGoal.title}`,
        description: `${pct}% funded, ${formatCurrency(topGoal.current ?? 0)} of ${formatCurrency(topGoal.target)}. ${pct >= 50 ? "Past halfway. Keep the monthly contributions going." : "Still early. Steady monthly saves matter more than big one-offs."}`,
        priority: "low",
        cta: "View Goal",
      });
    }

    return list;
  }, [snapshot]);

  const greetingSet = React.useRef(false);
  const promptAutoSent = React.useRef(false);
  const historyApplied = React.useRef(false);

  React.useEffect(() => {
    if (!historyReady || historyApplied.current) return;
    historyApplied.current = true;
    const urlPrompt = searchParams.get("prompt")?.trim();
    if (urlPrompt) {
      writeHistory(null, chatsRef.current);
      return;
    }
    const active = chatsRef.current.find(
      (chat) => chat.id === activeIdRef.current,
    );
    if (!active || active.messages.length === 0) return;
    greetingSet.current = true;
    setMessages(active.messages.map(fromStoredMessage));
  }, [historyReady, searchParams, writeHistory, chatsRef, activeIdRef]);

  React.useEffect(() => {
    if (!historyReady || greetingSet.current) return;
    greetingSet.current = true;
    setMessages([
      {
        id: "greeting",
        role: "ai",
        text: buildGreeting(snapshot),
        timestamp: new Date(),
      },
    ]);
  }, [historyReady, snapshot]);

  React.useEffect(() => {
    if (!historyReady) return;
    const stored = messages
      .filter((message) => message.id !== "greeting")
      .map(toStoredMessage);
    const firstUser = stored.find((message) => message.role === "user");
    if (!firstUser) return;

    const id = activeIdRef.current ?? crypto.randomUUID();
    const title = chatTitleFromMessage(firstUser.text);
    const previous = chatsRef.current.find((chat) => chat.id === id);
    const unchanged =
      previous &&
      previous.title === title &&
      previous.messages.length === stored.length &&
      previous.messages.every(
        (message, index) =>
          message.id === stored[index]?.id &&
          message.text === stored[index]?.text,
      );
    if (unchanged) return;

    const now = new Date().toISOString();
    writeHistory(id, [
      {
        id,
        title,
        createdAt: previous?.createdAt ?? now,
        updatedAt: now,
        messages: stored,
      },
      ...chatsRef.current.filter((chat) => chat.id !== id),
    ]);
  }, [messages, historyReady, writeHistory, chatsRef, activeIdRef]);

  React.useEffect(() => {
    if (
      !ready ||
      !historyReady ||
      (!auth.loggedIn && !demoMode) ||
      promptAutoSent.current
    )
      return;
    const urlPrompt = searchParams.get("prompt")?.trim();
    if (!urlPrompt) return;
    promptAutoSent.current = true;
    const timer = window.setTimeout(() => send(urlPrompt), 450);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, historyReady, auth.loggedIn, demoMode, searchParams]);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  async function send(text: string) {
    const t = text.trim();
    if (!t || typing) return;

    const history = messagesRef.current
      .filter((m) => m.id !== "greeting")
      .map((m) => ({
        role: m.role === "user" ? ("user" as const) : ("assistant" as const),
        content: m.text,
      }));

    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", text: t, timestamp: new Date() },
    ]);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setTyping(true);

    const aiId = `a-${Date.now()}`;
    let streamed = false;

    try {
      const reply = await streamAiChatReply({
        messages: [...history, { role: "user", content: t }],
        snapshot,
        isDemo: demoMode,
        signal: controller.signal,
        onDelta: (text) => {
          if (!streamed) {
            streamed = true;
            setTyping(false);
            setStreamingMessageId(aiId);
            setMessages((prev) => [
              ...prev,
              {
                id: aiId,
                role: "ai",
                text,
                timestamp: new Date(),
              },
            ]);
            return;
          }

          setMessages((prev) =>
            prev.map((m) => (m.id === aiId ? { ...m, text } : m)),
          );
        },
      });
      if (!controller.signal.aborted) {
        const finished = withNotAdviceLine(reply);
        setMessages((prev) =>
          prev.map((m) => (m.id === aiId ? { ...m, text: finished } : m)),
        );
      }
    } catch {
      if (controller.signal.aborted) return;

      const reply = withNotAdviceLine(generateLocalAiResponse(t, snapshot));

      if (streamed) {
        setMessages((prev) =>
          prev.map((m) => (m.id === aiId ? { ...m, text: reply } : m)),
        );
      } else {
        setTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: aiId,
            role: "ai",
            text: reply,
            timestamp: new Date(),
          },
        ]);
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setStreamingMessageId(null);
      setTyping(false);
    }
  }

  function stopGenerating() {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setStreamingMessageId(null);
    setTyping(false);
  }

  function showGreeting() {
    greetingSet.current = true;
    setMessages([
      {
        id: "greeting",
        role: "ai",
        text: buildGreeting(snapshot),
        timestamp: new Date(),
      },
    ]);
  }

  function newChat() {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setStreamingMessageId(null);
    setTyping(false);
    setInput("");
    setHistoryOpen(false);
    writeHistory(null, chatsRef.current);
    showGreeting();
  }

  function openChat(id: string) {
    const chat = chatsRef.current.find((item) => item.id === id);
    if (!chat || id === activeIdRef.current) {
      setHistoryOpen(false);
      return;
    }
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setStreamingMessageId(null);
    setTyping(false);
    setInput("");
    writeHistory(id, chatsRef.current);
    greetingSet.current = true;
    setMessages(chat.messages.map(fromStoredMessage));
    setHistoryOpen(false);
  }

  function deleteChat(id: string) {
    const next = chatsRef.current.filter((chat) => chat.id !== id);
    const nextActive = activeIdRef.current === id ? null : activeIdRef.current;
    writeHistory(nextActive, next);
    if (nextActive === null) showGreeting();
  }

  function handleTextareaInput(e: React.FormEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 64)}px`;
    setInput(el.value);
  }

  if (!ready || !historyReady || (!auth.loggedIn && !demoMode)) return null;

  const thread = messages.filter((message) => message.id !== "greeting");
  const isEmpty = thread.length === 0;
  const rows = positionRows(snapshot);
  const showPosition = snapshot.netWorth !== 0 || rows.length > 0;
  const visibleInsights = insights.slice(0, 3);
  const lastAnswerId = [...thread]
    .reverse()
    .find(
      (message) =>
        message.role === "ai" &&
        message.id !== streamingMessageId &&
        message.text.length > 0,
    )?.id;

  const activeChat = chats.find((chat) => chat.id === activeId);
  const historyPanel = () => (
    <CopilotHistoryPanel
      chats={chats}
      activeId={activeId}
      onNew={newChat}
      onOpen={openChat}
      onDelete={deleteChat}
    />
  );

  return (
    <div
      data-celerey-ai
      className="relative flex min-h-0 flex-1 overflow-hidden bg-background"
    >
      <aside className="hidden min-h-0 w-60 shrink-0 flex-col border-r border-border md:flex">
        {historyPanel()}
      </aside>
      {historyOpen ? (
        <div className="absolute inset-0 z-30 flex md:hidden">
          <div className="h-full w-72 max-w-[80%] border-r border-border bg-background">
            {historyPanel()}
          </div>
          <button
            type="button"
            aria-label="Close chats"
            className="min-w-0 flex-1 bg-black/20"
            onClick={() => setHistoryOpen(false)}
          />
        </div>
      ) : null}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-start gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="mt-0.5 md:hidden"
            aria-label="Chats"
            onClick={() => setHistoryOpen(true)}
          >
            <PanelLeft />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight">
              {activeChat?.title ?? COPILOT_NAME}
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Ask about your finances.
            </p>
          </div>
        </div>
        {!isEmpty ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="New chat"
            onClick={newChat}
          >
            <SquarePen />
          </Button>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
        {isEmpty ? (
          <div className={`${COLUMN} flex min-h-full flex-col px-4 pt-14 pb-8 sm:pt-20`}>
            <div className="flex items-start gap-3">
              <CelereyAiSymbol size="lg" className="mt-0.5" />
              <div className="min-w-0">
                <h2 className="text-lg font-semibold tracking-tight">
                  {COPILOT_NAME}
                </h2>
                <p className="mt-1 text-sm leading-relaxed">
                  {snapshot.firstName
                    ? `Ask questions about your finances, ${snapshot.firstName}.`
                    : "Ask questions about your finances."}
                </p>
              </div>
            </div>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Answers use the figures on your account so you can understand
              your position, goals, and what to look at next.
            </p>

            {showPosition ? (
              <div className="mt-8">
                <p className="text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                  Your position
                </p>
                <p className="mt-2 text-[11px] text-muted-foreground">Net worth</p>
                <p className="text-lg font-semibold tracking-tight tabular-nums">
                  {formatCurrency(snapshot.netWorth)}
                </p>
                {rows.length > 0 ? (
                  <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                    {rows.map((row) => (
                      <div key={row.label}>
                        <dt className="text-[11px] text-muted-foreground">
                          {row.label}
                        </dt>
                        <dd className="text-sm tabular-nums">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </div>
            ) : null}

            <p className="mt-8 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
              Ask about
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {suggestedPrompts.map((text) => (
                <button
                  key={text}
                  type="button"
                  disabled={typing}
                  onClick={() => send(text)}
                  className="rounded-md border border-border bg-background px-3 py-2.5 text-left hover:bg-muted/70 disabled:opacity-50"
                >
                  <span className="block text-[11px] font-medium tracking-[0.06em] text-muted-foreground uppercase">
                    {suggestionCategory(text)}
                  </span>
                  <span className="mt-1 block text-sm leading-snug">{text}</span>
                </button>
              ))}
            </div>

            {visibleInsights.length > 0 ? (
              <div className="mt-8">
                <p className="text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                  Worth a look
                </p>
                <div className="mt-3 grid grid-cols-1 gap-2">
                  {visibleInsights.map((insight) => (
                    <button
                      key={insight.id}
                      type="button"
                      disabled={typing}
                      onClick={() =>
                        send(`${insight.title}. ${insight.description}`)
                      }
                      className="rounded-md border border-border bg-background px-3 py-2.5 text-left hover:bg-muted/70 disabled:opacity-50"
                    >
                      <span className="block text-[11px] font-medium tracking-[0.06em] text-muted-foreground uppercase">
                        {KIND_LABEL[insight.kind]}
                      </span>
                      <span className="mt-1 block text-sm leading-snug">
                        {insight.title}
                      </span>
                      <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-muted-foreground">
                        {insight.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className={`${COLUMN} space-y-6 px-4 py-6`}>
            {thread.map((message, index) =>
              message.role === "user" ? (
                <div
                  key={message.id}
                  className="rounded-md bg-muted/70 px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap"
                >
                  {message.text}
                </div>
              ) : (
                <div key={message.id} className="space-y-3">
                  <p className="text-[11px] text-muted-foreground">
                    Source: your account
                  </p>
                  {message.text ? (
                    <RichText
                      text={message.text}
                      streaming={message.id === streamingMessageId}
                    />
                  ) : (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span
                        className="inline-block size-1.5 rounded-full bg-foreground/50 motion-safe:animate-pulse"
                        aria-hidden
                      />
                      Looking at your finances…
                    </p>
                  )}
                  {message.id === lastAnswerId ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {followUpPrompts(
                        [...thread]
                          .slice(0, index)
                          .reverse()
                          .find((item) => item.role === "user")?.text ?? "",
                      ).map((prompt) => (
                        <Button
                          key={prompt}
                          type="button"
                          variant="outline"
                          size="xs"
                          disabled={typing}
                          onClick={() => send(prompt)}
                        >
                          {prompt}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ),
            )}
            {typing ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <span
                  className="inline-block size-1.5 rounded-full bg-foreground/50 motion-safe:animate-pulse"
                  aria-hidden
                />
                Looking at your finances…
              </p>
            ) : null}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <div className="shrink-0 bg-background px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className={COLUMN}>
          <div
            className="rounded-md border border-border bg-background focus-within:border-ring"
            data-tour="primary-action"
          >
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onInput={handleTextareaInput}
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing) return;
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  send(input);
                }
              }}
              placeholder="Ask about your finances..."
              rows={1}
              disabled={typing}
              className="field-sizing-fixed max-h-16 min-h-8 resize-none border-0 bg-transparent px-3 py-2 text-sm shadow-none focus-visible:ring-0 md:text-sm"
            />
            <div className="flex items-center justify-between gap-2 px-2 pb-1.5">
              <span className="text-[11px] font-medium tracking-[0.06em] text-muted-foreground uppercase">
                Your finances
              </span>
              {typing ? (
                <Button
                  type="button"
                  size="icon-sm"
                  aria-label="Stop generating"
                  onClick={stopGenerating}
                >
                  <Square className="fill-current" />
                </Button>
              ) : (
                <Button
                  type="button"
                  size="icon-sm"
                  aria-label="Send"
                  disabled={!input.trim()}
                  onClick={() => send(input)}
                >
                  <ArrowUp />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="shrink-0 px-4 pb-3 text-center text-[11px] leading-relaxed text-muted-foreground">
        {COPILOT_NAME} uses the figures on your account. It does not provide
        financial advice.{" "}
        <Link
          href={advisorHref}
          className="font-medium text-foreground underline-offset-2 hover:underline"
        >
          Book an advisor session
        </Link>
      </p>
      </div>
    </div>
  );
}
