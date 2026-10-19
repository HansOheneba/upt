"use client";

import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useProfilePanel } from "@/components/dashboard/profile-panel-context";
import { useSidebar } from "@/components/ui/sidebar";
import { fromDemoPath, isDemoPath, toDemoPath } from "@/lib/demo-mode";
import { CelereyAiSymbol } from "@/components/dashboard/celerey-ai-symbol";
import { celereyAiBrandVars } from "@/lib/brand-css-vars";

const PROMPT_MAP: Record<string, string> = {
  "/dashboard":
    "Give me a complete overview of my financial health and highlight my top priorities right now.",
  "/dashboard/goals":
    "How am I tracking on my financial goals and what can I do to reach them faster?",
  "/dashboard/assets":
    "Analyse my investment portfolio and suggest how to optimise my asset allocation.",
  "/dashboard/properties":
    "Review my property portfolio and flag any risks or opportunities I should act on.",
  "/dashboard/insurance":
    "Am I adequately insured? Review my coverage and highlight any gaps or over-coverage.",
  "/dashboard/cash-flow":
    "Analyse my income and expenses in detail. How can I improve my monthly surplus?",
  "/dashboard/liabilities":
    "Help me build a debt payoff strategy based on my current liabilities.",
  "/dashboard/retirement":
    "How is my retirement plan tracking? What should I change to reach my goals faster?",
  "/dashboard/financial":
    "Give me a full analysis of my financial position and suggest the most impactful next steps.",
  "/dashboard/concierge":
    "What premium financial services or advisor support would benefit me most given my current profile?",
  "/dashboard/appointments":
    "What questions should I bring to my next RM meeting based on my current financial picture?",
  "/dashboard/messages":
    "Help me draft a concise message to my RM about my current financial priorities.",
  "/dashboard/tasks":
    "Which of my open RM tasks should I prioritize first based on my financial picture?",
  "/dashboard/documents":
    "What documents should I upload or review with my RM based on my profile?",
  "/dashboard/account":
    "Review my account setup and tell me if there is anything I should update or complete.",
  "/dashboard/profile":
    "Based on my profile, what financial opportunities or risks should I be most aware of?",
  "/dashboard/support":
    "What common financial issues do users like me face and how can I address them proactively?",
};

export function AskCelereyAIButton() {
  const pathname = usePathname();
  const router = useRouter();
  const { isOpen } = useProfilePanel();
  const { openMobile } = useSidebar();

  const inDemo = isDemoPath(pathname);

  // Hide on the AI page itself, and when the profile panel is open
  if (
    pathname === "/dashboard/ai" ||
    pathname === "/dashboard/demo/ai" ||
    isOpen ||
    openMobile
  )
    return null;

  const promptKey = fromDemoPath(pathname);
  const prompt =
    PROMPT_MAP[promptKey] ??
    "Give me a personalised summary of my financial health.";

  // Statement review pins Cancel / Confirm to the bottom of the page.
  const aboveStickyActions = promptKey.includes("/cash-flow/imports/");

  function handleClick() {
    const aiHref = inDemo
      ? toDemoPath("/dashboard/ai")
      : "/dashboard/ai";
    router.push(`${aiHref}?prompt=${encodeURIComponent(prompt)}`);
  }

  return (
    <button
      type="button"
      data-celerey-ai
      onClick={handleClick}
      style={celereyAiBrandVars as React.CSSProperties}
      className={cn(
        "group fixed right-4 z-40 flex items-center gap-2",
        aboveStickyActions
          ? "bottom-[max(9.5rem,calc(9rem+env(safe-area-inset-bottom)))] sm:right-6 sm:bottom-28"
          : "bottom-[max(1rem,env(safe-area-inset-bottom))] sm:right-6 sm:bottom-6",
        "rounded-md bg-primary px-3 py-2",
        "text-sm font-medium text-primary-foreground shadow-none",
        "transition-colors duration-160 ease-out",
        "hover:bg-primary/90",
        "active:scale-[0.97] motion-reduce:active:scale-100",
      )}
      aria-label="Ask Celerey Copilot"
    >
      <CelereyAiSymbol size="sm" />
      <span className="whitespace-nowrap">Ask Copilot</span>
    </button>
  );
}
