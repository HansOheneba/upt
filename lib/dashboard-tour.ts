/** Dashboard walkthrough config (driver.js) - advisory brand colours. */

import { brand } from "@/lib/tenant";

export const tourBrand = {
  primary: "var(--brand-primary)",
  primaryHex: "var(--brand-primary)",
  accent: "var(--brand-accent)",
  accentHex: "var(--brand-accent)",
  accentSoft: "color-mix(in srgb, var(--brand-accent) 14%, transparent)",
  accentBorder: "color-mix(in srgb, var(--brand-accent) 35%, transparent)",
} as const;

export const TOUR_STORAGE = {
  completed: "celerey_dashboard_tour_completed_v1",
  active: "celerey_tour_active",
  stepIndex: "celerey_tour_step_index",
  phase: "celerey_tour_phase",
  /** Set at the end of onboarding so the tour auto-starts only for new users. */
  pending: "celerey_tour_pending_v1",
} as const;

export const WELCOME_SESSION_KEY = "celerey_welcome_dismissed_session";

export type TourPhase = "nav" | "content";

export type DashboardTourStep = {
  id: string;
  href: string;
  navSelector: string;
  contentSelector?: string;
  title: string;
  /** HTML allowed for emphasis (e.g. <strong>). */
  description: string;
};

export const DASHBOARD_TOUR_STEPS: DashboardTourStep[] = [
  {
    id: "overview",
    href: "/dashboard",
    navSelector: '[data-tour-nav="overview"]',
    contentSelector: '[data-tour="dashboard-overview"]',
    title: `Welcome to ${brand.name}`,
    description:
      "Your financial home base. See <strong>net worth, cash flow, retirement, and open items</strong> in one place each time you log in.",
  },
  {
    id: "assets",
    href: "/dashboard/assets",
    navSelector: '[data-tour-nav="assets"]',
    contentSelector: '[data-tour="primary-action"]',
    title: "Assets",
    description:
      "Investments, cash, and holdings in one view. See <strong>allocation and performance</strong> aligned with your goals and risk profile.",
  },
  {
    id: "properties",
    href: "/dashboard/properties",
    navSelector: '[data-tour-nav="properties"]',
    contentSelector: '[data-tour="primary-action"]',
    title: "Properties",
    description:
      "Residential and investment real estate with equity, financing, and coverage. Understand how property supports your <strong>net worth</strong>.",
  },
  {
    id: "goals",
    href: "/dashboard/goals",
    navSelector: '[data-tour-nav="goals"]',
    contentSelector: '[data-tour="primary-action"]',
    title: "Goals & Planning",
    description:
      "Set targets, amounts, and timelines. Track progress with a <strong>monthly contribution target</strong> tied to your plan.",
  },
  {
    id: "insurance",
    href: "/dashboard/insurance",
    navSelector: '[data-tour-nav="insurance"]',
    contentSelector: '[data-tour="primary-action"]',
    title: "Insurance",
    description:
      "Life, health, property, and other policies with premiums, coverage, and renewal dates. Stay ahead of <strong>renewals and coverage gaps</strong>.",
  },
  {
    id: "cash-flow",
    href: "/dashboard/cash-flow",
    navSelector: '[data-tour-nav="cash-flow"]',
    contentSelector: '[data-tour="primary-action"]',
    title: "Cash Flow",
    description:
      "Income, expenses, and monthly surplus in one place. Most insights build on this. See what you can <strong>save or invest</strong> each month.",
  },
  {
    id: "liabilities",
    href: "/dashboard/liabilities",
    navSelector: '[data-tour-nav="liabilities"]',
    contentSelector: '[data-tour="primary-action"]',
    title: "Liabilities",
    description:
      "Credit, loans, and property-linked financing together. View <strong>total debt service</strong> and set a clear paydown priority.",
  },
  {
    id: "retirement",
    href: "/dashboard/retirement",
    navSelector: '[data-tour-nav="retirement"]',
    contentSelector: '[data-tour="primary-action"]',
    title: "Retirement",
    description:
      "Projections from your savings, target age, and desired income. Check if your path supports the lifestyle you expect and <strong>model adjustments</strong> while you still can.",
  },
  {
    id: "appointments",
    href: "/dashboard/appointments",
    navSelector: '[data-tour-nav="appointments"]',
    contentSelector: '[data-tour="primary-action"]',
    title: "Appointments",
    description:
      `Book sessions and action items with your <strong>relationship manager (RM)</strong>, who reviews your ${brand.name} profile and helps turn your data into a structured plan.`,
  },
  {
    id: "ai",
    href: "/dashboard/ai",
    navSelector: '[data-tour-nav="ai"]',
    contentSelector: '[data-tour="primary-action"]',
    title: "Celerey Copilot",
    description:
      "Ask questions in plain language and get answers from your live data. Surface <strong>patterns, risks, and opportunities</strong> as your profile grows.",
  },
  {
    id: "concierge",
    href: "/dashboard/concierge",
    navSelector: '[data-tour-nav="concierge"]',
    contentSelector: '[data-tour="primary-action"]',
    title: "Concierge",
    description:
      "Request specialist support for tax, estate, property, portfolio review, and related planning when your situation needs dedicated expertise.",
  },
  {
    id: "risk-assessment",
    href: "/dashboard",
    navSelector: '[data-tour-nav="overview"]',
    contentSelector: '[data-tour="dashboard-overview"]',
    title: "Risk assessment",
    description:
      "A brief questionnaire to set your risk profile. It guides allocation, goal planning, and recommendations aligned with the <strong>volatility you can accept</strong>.",
  },
  {
    id: "finish",
    href: "/dashboard",
    navSelector: '[data-tour-nav="overview"]',
    contentSelector: '[data-tour="dashboard-overview"]',
    title: "You are all set",
    description:
      "You have the full map. Start with <strong>Cash Flow</strong> and <strong>Goals</strong> to strengthen insights everywhere else. The profile checklist in the top bar stays available for remaining steps.",
  },
];

/** Steps shown during an active tour (skips risk assessment when already completed). */
export function getActiveTourSteps(hasRiskProfile: boolean): DashboardTourStep[] {
  if (hasRiskProfile) {
    return DASHBOARD_TOUR_STEPS.filter((s) => s.id !== "risk-assessment");
  }
  return DASHBOARD_TOUR_STEPS;
}

function tourCompletedKey(userId: string): string {
  return `${TOUR_STORAGE.completed}_${userId}`;
}

/** Tour completion is stored per user so a new account always gets the walkthrough. */
export function isTourCompleted(userId?: string | null): boolean {
  if (typeof window === "undefined") return true;
  if (!userId) return false;

  // Drop legacy global flag so older browsers do not block new accounts.
  try {
    localStorage.removeItem(TOUR_STORAGE.completed);
  } catch {
    /* noop */
  }

  return localStorage.getItem(tourCompletedKey(userId)) === "true";
}

export function markTourCompleted(userId?: string | null): void {
  try {
    if (userId) {
      localStorage.setItem(tourCompletedKey(userId), "true");
    }
    sessionStorage.removeItem(TOUR_STORAGE.active);
    sessionStorage.removeItem(TOUR_STORAGE.stepIndex);
    sessionStorage.removeItem(TOUR_STORAGE.phase);
    sessionStorage.setItem(WELCOME_SESSION_KEY, "true");
  } catch {
    /* noop */
  }
}

export function getTourProgress(): { stepIndex: number; phase: TourPhase } {
  if (typeof window === "undefined") {
    return { stepIndex: 0, phase: "nav" };
  }
  const stepIndex = Number(sessionStorage.getItem(TOUR_STORAGE.stepIndex) ?? "0");
  const phase =
    sessionStorage.getItem(TOUR_STORAGE.phase) === "content" ? "content" : "nav";
  return {
    stepIndex: Number.isFinite(stepIndex) ? stepIndex : 0,
    phase,
  };
}

export function setTourProgress(stepIndex: number, phase: TourPhase): void {
  try {
    sessionStorage.setItem(TOUR_STORAGE.active, "true");
    sessionStorage.setItem(TOUR_STORAGE.stepIndex, String(stepIndex));
    sessionStorage.setItem(TOUR_STORAGE.phase, phase);
  } catch {
    /* noop */
  }
}

/**
 * Called at the end of onboarding so the tour auto-starts the first time the
 * user lands on the dashboard. Has no effect for returning users (direct login).
 */
export function scheduleTourForNewUser(): void {
  try {
    localStorage.setItem(TOUR_STORAGE.pending, "true");
  } catch {
    /* noop */
  }
}

/** True when onboarding just set the pending flag. */
export function isTourPending(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(TOUR_STORAGE.pending) === "true";
}

/** Reads and clears the pending flag atomically. */
export function consumeTourPending(): boolean {
  const pending = isTourPending();
  if (pending) {
    try {
      localStorage.removeItem(TOUR_STORAGE.pending);
    } catch {
      /* noop */
    }
  }
  return pending;
}

export function clearTourProgress(): void {
  try {
    sessionStorage.removeItem(TOUR_STORAGE.active);
    sessionStorage.removeItem(TOUR_STORAGE.stepIndex);
    sessionStorage.removeItem(TOUR_STORAGE.phase);
  } catch {
    /* noop */
  }
}

export function isTourSessionActive(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(TOUR_STORAGE.active) === "true";
}

/** Clears completion and restarts the walkthrough from step 1. */
export function resetGuidedTour(userId: string): void {
  try {
    localStorage.removeItem(tourCompletedKey(userId));
    sessionStorage.removeItem(WELCOME_SESSION_KEY);
    sessionStorage.setItem(TOUR_STORAGE.active, "true");
    sessionStorage.setItem(TOUR_STORAGE.stepIndex, "0");
    sessionStorage.setItem(TOUR_STORAGE.phase, "nav");
  } catch {
    /* noop */
  }
}

export const TOUR_RESTART_EVENT = "celerey-tour-restart";
