export type Availability = "available" | "limited" | "away";

export type Advisor = {
  initials: string;
  name: string;
  title: string;
  credentials: string[];
  location: string;
  email: string;
  phone: string;
  availability: Availability;
  bio: string;
  specialties: string[];
  philosophy: string;
};

export type Meeting = {
  title: string;
  dateLabel: string;
  type: "review" | "checkin";
  status: "scheduled" | "requested";
};

export type ActionItem = {
  id: string;
  label: string;
  dueLabel?: string;
  done: boolean;
  priority?: "high" | "medium" | "low";
  category?: "financial" | "documents" | "goals" | "other";
};

export type Note = {
  id: string;
  dateLabel: string;
  text: string;
};

export type RequestTopic = "portfolio" | "tax" | "goals" | "other";
export type RequestUrgency = "standard" | "urgent";

// ── Advisory Session types ──────────────────────────────────────────────────

export type SessionType =
  | "review"
  | "annual_review"
  | "quarterly_check_in"
  | "onboarding"
  | "goal_check_in"
  | "portfolio_update";

export const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  review: "Review",
  annual_review: "Annual Review",
  quarterly_check_in: "Quarterly Check-In",
  onboarding: "General Meeting",
  goal_check_in: "Goal Check-In",
  portfolio_update: "Portfolio Update",
};

/** Session types shown in the book-session dropdown. */
export const BOOKABLE_SESSION_TYPES: SessionType[] = [
  "review",
  "annual_review",
  "portfolio_update",
  "onboarding",
];

/** Human label for API session types; never show raw snake_case in UI. */
export function sessionTypeLabel(type: string): string {
  if (type in SESSION_TYPE_LABELS) {
    return SESSION_TYPE_LABELS[type as SessionType];
  }
  return type
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export const APPOINTMENT_DURATIONS = [15, 30, 45, 60, 75] as const;

export type DocumentCategory =
  | "identity"
  | "statement"
  | "tax"
  | "contract"
  | "report"
  | "plan"
  | "review"
  | "other";

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  identity: "Identity",
  statement: "Statement",
  tax: "Tax",
  contract: "Contract",
  report: "Report",
  plan: "Plan",
  review: "Review",
  other: "Other",
};

export type AdvisorySession = {
  id: string;
  date: string;
  type: SessionType;
  advisorName: string;
  durationMinutes: number;
  title?: string;
  focusAreas: string[];
  keyDiscussionPoints: string[];
  advisorAssessment: string;
  summaryNotes: string;
  recommendations: string[];
  actionItems: ActionItem[];
  documents?: SessionDocument[];
};

export type SessionDocument = {
  id: string;
  name: string;
  type: DocumentCategory;
  dateLabel: string;
  sizeLabel?: string;
  uploadedBy?: "advisor" | "client";
};

export type SessionAllocation = {
  periodLabel: string;
  totalIncluded: number;
  used: number;
  remaining?: number;
  nextAvailableDate: string | null;
};

export type UpcomingSession = {
  id: string;
  date: string;
  timeLabel: string;
  advisorName: string;
  type: SessionType;
  status: "requested" | "upcoming";
  focusAreas: string[];
  joinUrl?: string;
  rescheduleUrl?: string;
  scheduledAt?: string | null;
  durationMinutes?: number;
};
