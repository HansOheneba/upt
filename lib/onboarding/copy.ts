// lib/onboarding/copy.ts
// Single source of truth for all mode-sensitive UI copy.
// Keyed by account_mode so language is managed in one place.

export type AccountMode = "solo" | "partner" | "family";

export const ONBOARDING_COPY = {
  income: {
    heading: {
      solo: "What is your monthly income?",
      partner: "Combined, what is your monthly household income?",
      family: "What is your total monthly household income across all earners?",
    },
    subheading: {
      solo: "Add all your income sources. Include monthly estimates for variable income.",
      partner: "Add all household income sources for a better budget overview.",
      family:
        "Add all family income sources to support the full household plan.",
    },
  },
  expenses: {
    heading: {
      solo: "What are your monthly expenses?",
      partner: "Combined, what are your combined monthly expenses?",
      family: "What are your total monthly household expenses?",
    },
    subheading: {
      solo: "No judgment here; knowing your debts is the first step to clearing them.",
      partner:
        "List household debts and recurring payments your partner contributes to.",
      family:
        "List family debts and recurring payments that affect your household budget.",
    },
  },
  retirement: {
    fieldLabel: {
      solo: "What is your planned retirement age?",
      partner: "What year are you both aiming to retire?",
      family: "What year is your household aiming to retire by?",
    },
    fieldPlaceholder: {
      solo: "65",
      partner: `${new Date().getFullYear() + 20}`,
      family: `${new Date().getFullYear() + 20}`,
    },
  },
  identity: {
    sectionHeading: {
      solo: "Let's get to know you",
      partner: "Let's get to know your household",
      family: "Let's get to know your household",
    },
    sectionSubheading: {
      solo: "This helps us personalise your experience.",
      partner: "This helps us personalise your household's experience.",
      family: "This helps us personalise your household's experience.",
    },
    nameLabel: {
      solo: null as null, // uses first_name / last_name fields
      partner: "What should we call your household?",
      family: "What should we call your household?",
    },
    namePlaceholder: {
      solo: null as null,
      partner: "e.g. The Johnson Household",
      family: "e.g. The Smiths",
    },
  },
} as const;

/** Convenience getter — returns the copy string for a given section, field, and mode. */
export function getCopy(
  section: keyof typeof ONBOARDING_COPY,
  field: string,
  mode: AccountMode,
): string {
  const sectionData = ONBOARDING_COPY[section] as Record<
    string,
    Record<AccountMode, string | null>
  >;
  return sectionData[field]?.[mode] ?? "";
}
