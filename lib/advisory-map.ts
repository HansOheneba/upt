import type { ProgressMetric } from "@/components/dashboard/advisor/progress-since-session-card";
import type {
  ActionItem,
  AdvisorySession,
  SessionAllocation,
  SessionDocument,
  UpcomingSession,
} from "@/components/dashboard/advisor/types";
import { formatCurrency } from "@/lib/client-data";
import type {
  AdvisoryLastSession,
  AdvisoryOverview,
  ClientDocument,
  ClientTask,
  ProgressMetricSnapshot,
} from "@/lib/book-api";

const TIME_OPTS: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
};

export function formatAdvisoryDate(iso: string | null | undefined): string {
  if (!iso) return "To be confirmed";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "To be confirmed";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatAdvisoryFullDate(
  iso: string | null | undefined,
): string {
  if (!iso) return "To be confirmed";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "To be confirmed";
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatAdvisoryTime(iso: string | null | undefined): string {
  if (!iso) return "To be confirmed";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "To be confirmed";
  return d.toLocaleTimeString(undefined, TIME_OPTS);
}

export function formatAdvisoryTimeRange(
  iso: string | null | undefined,
  durationMinutes: number,
): string {
  if (!iso) return "To be confirmed";
  const start = new Date(iso);
  if (Number.isNaN(start.getTime())) return "To be confirmed";
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const startStr = start.toLocaleTimeString(undefined, TIME_OPTS);
  const endStr = end.toLocaleTimeString(undefined, TIME_OPTS);
  const period = (value: string) => {
    const match = value.match(/\s*([AP]M)$/i);
    return match?.[1]?.toUpperCase() ?? "";
  };
  const startPeriod = period(startStr);
  const endPeriod = period(endStr);
  if (startPeriod && startPeriod === endPeriod) {
    const startClock = startStr.replace(/\s*[AP]M$/i, "").trim();
    return `${startClock} - ${endStr}`;
  }
  return `${startStr} - ${endStr}`;
}

export function formatDueLabel(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return `By ${formatAdvisoryDate(iso)}`;
}

export function formatFileSize(bytes: number | undefined): string | undefined {
  if (bytes == null || !Number.isFinite(bytes)) return undefined;
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function mapAllocation(overview: AdvisoryOverview): SessionAllocation {
  const { entitlement, nextSession } = overview;
  const periodLabel = entitlement.planYear || "This plan year";
  let nextAvailableDate: string | null = "Book anytime";
  if (entitlement.remaining <= 0) nextAvailableDate = null;
  else if (nextSession?.scheduledAt) {
    nextAvailableDate = formatAdvisoryDate(nextSession.scheduledAt);
  }
  return {
    periodLabel,
    totalIncluded: entitlement.included,
    used: entitlement.used,
    remaining: entitlement.remaining,
    nextAvailableDate,
  };
}

export function mapUpcoming(
  overview: AdvisoryOverview,
): UpcomingSession | null {
  const next = overview.nextSession;
  if (!next || (next.status !== "requested" && next.status !== "upcoming")) {
    return null;
  }
  return {
    id: next.appointmentId,
    date: formatAdvisoryDate(next.scheduledAt),
    timeLabel: formatAdvisoryTime(next.scheduledAt),
    advisorName: next.advisorName ?? overview.advisorName ?? "Your RM",
    type: next.type,
    status: next.status,
    focusAreas: next.title ? [next.title] : [],
    scheduledAt: next.scheduledAt,
    durationMinutes: next.durationMinutes,
  };
}

function mapTask(task: ClientTask): ActionItem {
  return {
    id: task.taskId,
    label: task.title,
    dueLabel: formatDueLabel(task.dueAt),
    done: task.status === "done",
    priority: task.priority,
    category: task.category,
  };
}

function mapSession(
  session: AdvisoryLastSession,
  advisorName: string,
  actions: ClientTask[],
): AdvisorySession {
  return {
    id: session.appointmentId,
    date: formatAdvisoryDate(session.scheduledAt),
    type: session.type,
    advisorName: session.advisorName ?? advisorName,
    durationMinutes: session.durationMinutes,
    title: session.log.title || session.title,
    focusAreas: session.log.tags,
    keyDiscussionPoints: session.log.discussionPoints,
    advisorAssessment: session.log.advisorAssessment,
    summaryNotes: session.log.sessionNotes,
    recommendations: session.log.recommendations.map((r) => r.title),
    actionItems: actions.map(mapTask),
  };
}

export function mapLastSession(
  overview: AdvisoryOverview,
): AdvisorySession | null {
  if (!overview.lastSession) return null;
  return mapSession(
    overview.lastSession,
    overview.advisorName ?? "Your RM",
    overview.actions,
  );
}

export function mapHistory(overview: AdvisoryOverview): AdvisorySession[] {
  const advisorName = overview.advisorName ?? "Your RM";
  return overview.history.map((session) =>
    mapSession(session, advisorName, []),
  );
}

export function mapDocuments(docs: ClientDocument[]): SessionDocument[] {
  return docs.map((doc) => ({
    id: doc.documentId,
    name: doc.title,
    type: doc.category,
    dateLabel: formatAdvisoryDate(doc.createdAt),
    sizeLabel: formatFileSize(doc.sizeBytes),
    uploadedBy: doc.uploadedBy,
  }));
}

export function mapActions(overview: AdvisoryOverview): ActionItem[] {
  return mapTasks(overview.actions);
}

export function mapTasks(tasks: ClientTask[]): ActionItem[] {
  return tasks.map(mapTask);
}

const DOWN_IS_GOOD = new Set([
  "mortgage",
  "mortgage_balance",
  "debt",
  "liability",
  "liabilities",
]);

function isCurrencyUnit(metric: ProgressMetricSnapshot): boolean {
  if (metric.currency) return true;
  const unit = metric.unit.toLowerCase();
  return unit === "currency" || unit === "money" || unit === "fiat";
}

function isPercentUnit(metric: ProgressMetricSnapshot): boolean {
  const unit = metric.unit.toLowerCase();
  return unit === "percent" || unit === "%" || unit === "pp" || unit === "pct";
}

export function mapProgressMetrics(
  metrics: ProgressMetricSnapshot[],
  fallbackCurrency: string,
): ProgressMetric[] {
  return metrics.map((m) => {
    const previous = m.previous;
    const direction: ProgressMetric["direction"] =
      previous == null
        ? "flat"
        : m.value > previous
          ? "up"
          : m.value < previous
            ? "down"
            : "flat";
    const key = m.key.toLowerCase();
    const positiveDirection: ProgressMetric["positiveDirection"] =
      DOWN_IS_GOOD.has(key) ? "down" : "up";

    const formatValue = (n: number): string => {
      if (isPercentUnit(m)) return `${n}%`;
      if (isCurrencyUnit(m)) {
        return formatCurrency(n, m.currency ?? fallbackCurrency);
      }
      return m.unit ? `${n} ${m.unit}` : String(n);
    };

    let changeLabel = "";
    if (previous != null) {
      const diff = m.value - previous;
      const sign = diff > 0 ? "+" : diff < 0 ? "-" : "";
      if (isPercentUnit(m)) {
        changeLabel = `${sign}${Math.abs(diff)}pp`;
      } else if (isCurrencyUnit(m)) {
        changeLabel = `${sign}${formatCurrency(Math.abs(diff), m.currency ?? fallbackCurrency)}`;
      } else {
        changeLabel = `${sign}${Math.abs(diff)}`;
      }
    }

    return {
      label: m.label,
      before: previous == null ? "n/a" : formatValue(previous),
      after: formatValue(m.value),
      direction,
      positiveDirection,
      changeLabel,
    };
  });
}
