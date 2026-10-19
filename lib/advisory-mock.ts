import type {
  AdvisorySession,
  SessionAllocation,
  SessionDocument,
  UpcomingSession,
} from "@/components/dashboard/advisor/types";
import type { Weekday } from "@/lib/book-api";

// ── Session allocation ────────────────────────────────────────────────────────
// Users get 2 advisory sessions per plan year. They choose when to use them.

export const MOCK_ALLOCATION: SessionAllocation = {
  periodLabel: "2026 - 2027",
  totalIncluded: 2,
  used: 1,
  remaining: 1,
  nextAvailableDate: "10 September 2026",
};

// ── Upcoming session ──────────────────────────────────────────────────────────

export const MOCK_ADVISOR_NAME = "Jude Addo";

export const MOCK_UPCOMING: UpcomingSession = {
  id: "session-upcoming-1",
  date: "10 September 2026",
  timeLabel: "10:00 AM",
  advisorName: MOCK_ADVISOR_NAME,
  type: "quarterly_check_in",
  status: "upcoming",
  focusAreas: ["Pension consolidation", "ISA allowance"],
  scheduledAt: "2026-09-10T10:00:00.000Z",
  durationMinutes: 60,
};

// ── Last session ──────────────────────────────────────────────────────────────

export const MOCK_LAST_SESSION: AdvisorySession = {
  id: "session-1",
  date: "18 March 2026",
  type: "annual_review",
  advisorName: "Jude Addo",
  durationMinutes: 75,
  title: "Annual review, March 2026",
  focusAreas: ["Goals", "Net worth", "Pension"],
  keyDiscussionPoints: [
    "Assets up 6.8% for the year.",
    "Emergency fund hit six months. Took longer than we planned.",
    "Bill bumped pension contributions after the pay rise.",
    "We ran numbers on overpaying the Stratford mortgage.",
  ],
  advisorAssessment:
    "Good year overall. The emergency fund is finally where it should be. I'd stop tinkering with cash and finish moving those two old pensions across. ISA top-up can wait until after that.",
  summaryNotes:
    "Sent follow-up materials on 20 March. Next session is rebalancing and checking the goal timelines still hold.",
  recommendations: [
    "Raise pension to 12% of gross by July.",
    "Move the two old pensions into the Deloitte scheme before touching the ISA.",
  ],
  actionItems: [
    {
      id: "a1",
      label: "Increase pension contribution to 12%",
      dueLabel: "Completed 28 June 2026",
      done: true,
      priority: "high",
      category: "financial",
    },
    {
      id: "a2",
      label: "Request pension transfer forms from old employer",
      dueLabel: "Completed 18 July 2026",
      done: true,
      priority: "medium",
      category: "documents",
    },
    {
      id: "a3",
      label: "Top up ISA for 2026/27",
      dueLabel: "By 5 April 2027",
      done: false,
      priority: "medium",
      category: "financial",
    },
    {
      id: "a4",
      label: "Check easy-access savings rate",
      dueLabel: "Done 30 June 2026",
      done: true,
      priority: "low",
      category: "financial",
    },
  ],
  documents: [
    {
      id: "d1",
      name: "Annual review, March 2026",
      type: "report",
      dateLabel: "20 March 2026",
      sizeLabel: "2.1 MB",
      uploadedBy: "advisor",
    },
    {
      id: "d2",
      name: "Planning summary, March 2026",
      type: "plan",
      dateLabel: "20 March 2026",
      sizeLabel: "940 KB",
      uploadedBy: "advisor",
    },
  ],
};

// ── Session history ───────────────────────────────────────────────────────────

export const MOCK_HISTORY: AdvisorySession[] = [
  MOCK_LAST_SESSION,
  {
    id: "session-0",
    date: "5 September 2025",
    type: "quarterly_check_in",
    advisorName: "Jude Addo",
    durationMinutes: 60,
    title: "Check-in, September 2025",
    focusAreas: ["Cash flow", "Income protection"],
    keyDiscussionPoints: [
      "Surplus was 12% above what we'd budgeted.",
      "No income protection policy yet. That worried me more than the debt.",
      "Bill asked about buying another rental. I told him to fix insurance first.",
    ],
    advisorAssessment:
      "Solid six months, but the income protection gap was the real problem. Everything else could wait.",
    summaryNotes: "Report sent 7 September.",
    recommendations: [
      "Income protection quote. At least 70% of gross.",
      "Get the emergency fund to six months before anything else.",
    ],
    actionItems: [
      {
        id: "b1",
        label: "Get income protection quote",
        done: true,
        priority: "high",
        category: "financial",
      },
      {
        id: "b2",
        label: "Build emergency fund to six months",
        done: true,
        priority: "high",
        category: "financial",
      },
    ],
    documents: [
      {
        id: "d-h1",
        name: "Check-in report, September 2025",
        type: "review",
        dateLabel: "7 September 2025",
        sizeLabel: "1.4 MB",
        uploadedBy: "advisor",
      },
    ],
  },
];

// ── All documents (across all sessions) ──────────────────────────────────────

export const MOCK_ALL_DOCS: SessionDocument[] = [
  ...(MOCK_LAST_SESSION.documents ?? []),
  ...(MOCK_HISTORY[1].documents ?? []),
  {
    id: "d-c1",
    name: "Payslip March 2026",
    type: "statement",
    dateLabel: "21 March 2026",
    sizeLabel: "180 KB",
    uploadedBy: "client",
  },
];

// ── Raw progress metrics (monetary values as numbers for currency formatting) ─

export type RawProgressMetric = {
  label: string;
  beforeAmount: number;
  afterAmount: number;
  direction: "up" | "down" | "flat";
  positiveDirection: "up" | "down";
  isCurrency: boolean;
  /** Non-currency change label (e.g. "+7pp"). Used only when isCurrency=false. */
  changeLabel?: string;
};

export const MOCK_PROGRESS_RAW: RawProgressMetric[] = [
  {
    label: "Net worth",
    beforeAmount: 15970000,
    afterAmount: 17250000,
    direction: "up",
    positiveDirection: "up",
    isCurrency: true,
  },
  {
    label: "Goal funding rate",
    beforeAmount: 64,
    afterAmount: 71,
    direction: "up",
    positiveDirection: "up",
    isCurrency: false,
    changeLabel: "+7pp",
  },
  {
    label: "Mortgage balance",
    beforeAmount: 14848000,
    afterAmount: 14336000,
    direction: "down",
    positiveDirection: "down",
    isCurrency: true,
  },
  {
    label: "Monthly surplus",
    beforeAmount: 19840,
    afterAmount: 25280,
    direction: "up",
    positiveDirection: "up",
    isCurrency: true,
  },
];

// ── Tasks (flattened from session action items) ─────────────────────────────

export const MOCK_TASKS = [
  ...MOCK_LAST_SESSION.actionItems,
  ...MOCK_HISTORY.flatMap((session) => session.actionItems),
].filter(
  (task, index, list) => list.findIndex((item) => item.id === task.id) === index,
);

// ── Messages ──────────────────────────────────────────────────────────────────

export const MOCK_MESSAGES: {
  messageId: string;
  author: "client" | "advisor";
  body: string;
  createdAt: string;
}[] = [
  {
    messageId: "m1",
    author: "advisor",
    body: "Pension consolidation notes from the March review are in your docs. Have a read when you can.",
    createdAt: "2026-03-20T09:14:00.000Z",
  },
  {
    messageId: "m2",
    author: "client",
    body: "Thanks. Uploaded the March payslip.",
    createdAt: "2026-03-21T16:42:00.000Z",
  },
  {
    messageId: "m3",
    author: "advisor",
    body: "Got the payslip. I'll read it before Wednesday. Ping me if the ISA question can't wait.",
    createdAt: "2026-03-22T08:05:00.000Z",
  },
  {
    messageId: "m4",
    author: "advisor",
    body: "Wednesday 10 Sept, 10am. Pension consolidation and ISA allowance.",
    createdAt: "2026-09-05T11:30:00.000Z",
  },
  {
    messageId: "m5",
    author: "client",
    body: "Read the pension notes. Two things I don't follow. I'll bring them Wednesday.",
    createdAt: "2026-09-06T09:15:00.000Z",
  },
];

// ── Availability ──────────────────────────────────────────────────────────────

export const MOCK_AVAILABILITY = {
  timezone: "Africa/Accra",
  hoursStart: "10:00",
  hoursEnd: "16:00",
  daysAvailable: ["mon", "tue", "wed", "thu", "fri"] as Weekday[],
};

export const MOCK_SLOTS = [
  { start: "2026-09-08T10:00:00.000Z" },
  { start: "2026-09-08T11:00:00.000Z" },
  { start: "2026-09-09T10:00:00.000Z" },
  { start: "2026-09-10T10:00:00.000Z" },
  { start: "2026-09-10T14:00:00.000Z" },
  { start: "2026-09-11T10:00:00.000Z" },
];
