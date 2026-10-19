"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, ArrowRight, CalendarDays } from "lucide-react";
import { toast } from "sonner";

import { useClientGate } from "@/hooks/useClientGate";
import { useAdvisoryOverview } from "@/hooks/useAdvisoryOverview";
import { useAdvisoryTasks } from "@/hooks/useAdvisoryTasks";
import { useAdvisoryMessages } from "@/hooks/useAdvisoryMessages";
import { canAccessFeature, formatCurrency } from "@/lib/client-data";
import { useFinancialStore } from "@/store/financialStore";
import { isDemoMode, isDemoPath } from "@/lib/demo-mode";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { dashboardTheme } from "@/lib/dashboard-theme";

import { AdvisorySessionsTab } from "@/components/dashboard/advisor/advisory-sessions-tab";
import { AdvisoryTasksTab } from "@/components/dashboard/advisor/advisory-tasks-tab";
import { AdvisoryMessagesTab } from "@/components/dashboard/advisor/advisory-messages-tab";
import { AdvisoryDocumentsTab } from "@/components/dashboard/advisor/advisory-documents-tab";
import { RequestSessionDialog } from "@/components/dashboard/advisor/request-session-dialog";
import { SessionDetailsSheet } from "@/components/dashboard/advisor/session-details-sheet";
import type { ProgressMetric } from "@/components/dashboard/advisor/progress-since-session-card";

import type {
  ActionItem,
  DocumentCategory,
  SessionDocument,
  UpcomingSession,
} from "@/components/dashboard/advisor/types";
import {
  MOCK_UPCOMING,
  MOCK_LAST_SESSION,
  MOCK_HISTORY,
  MOCK_ALL_DOCS,
  MOCK_PROGRESS_RAW,
  MOCK_AVAILABILITY,
  MOCK_SLOTS,
  MOCK_ADVISOR_NAME,
} from "@/lib/advisory-mock";
import {
  ApiRequestError,
  CONFLICT_COPY,
  cancelAppointment,
  conflictCopyFor,
  deleteDocument,
  fetchAppointmentSlots,
  fetchDocuments,
  freshDownloadUrl,
  isConflict,
  isNoAdvisorError,
  requestAppointment,
  uploadDocument,
  type AppointmentDuration,
  type AppointmentSlot,
  type AppointmentType,
} from "@/lib/book-api";
import { SessionExpiredError } from "@/lib/dashboard-api";
import {
  mapDocuments,
  mapHistory,
  mapLastSession,
  mapProgressMetrics,
  mapUpcoming,
  formatAdvisoryDate,
  formatAdvisoryTime,
  formatFileSize,
} from "@/lib/advisory-map";

export type AdvisorySection =
  | "appointments"
  | "messages"
  | "tasks"
  | "documents";

const pageEnter = {
  hidden: { opacity: 0, transform: "translateY(8px)" },
  show: {
    opacity: 1,
    transform: "translateY(0px)",
    transition: { duration: 0.22, ease: [0.23, 1, 0.32, 1] as const },
  },
};

const PRIMARY = "var(--brand-primary)";

const SECTION_COPY: Record<
  AdvisorySection,
  { title: string; description: string }
> = {
  appointments: {
    title: "Appointments",
    description: "Book sessions and track progress with your RM.",
  },
  tasks: {
    title: "Tasks",
    description: "Action items from your RM to keep things on track.",
  },
  messages: {
    title: "Messages",
    description: "Secure conversation with your relationship manager (RM).",
  },
  documents: {
    title: "Documents",
    description: "Reports and files shared with your RM.",
  },
};

function AdvisoryPageSkeleton() {
  return (
    <div className={`${dashboardTheme.pageContainer} max-w-4xl`}>
      <div>
        <Skeleton className="h-8 w-36" />
        <Skeleton className="mt-2 h-4 w-72 max-w-full" />
      </div>
      <div className="rounded-3xl border border-border/60 bg-card px-6 py-6">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="mt-4 h-4 w-64" />
      </div>
    </div>
  );
}

function slotRange(): { from: string; to: string } {
  const from = new Date();
  const to = new Date();
  to.setDate(to.getDate() + 14);
  const ymd = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  return { from: ymd(from), to: ymd(to) };
}

function demoUpcomingFromBooking(
  input: {
    type: AppointmentType;
    scheduledAt?: string | null;
    title?: string;
    durationMinutes?: AppointmentDuration;
  },
  status: "requested" | "upcoming",
): UpcomingSession {
  return {
    id: `demo-${Date.now()}`,
    date: input.scheduledAt
      ? formatAdvisoryDate(input.scheduledAt)
      : "To be confirmed",
    timeLabel: input.scheduledAt
      ? formatAdvisoryTime(input.scheduledAt)
      : "To be confirmed",
    advisorName: MOCK_ADVISOR_NAME,
    type: input.type,
    status,
    focusAreas: input.title ? [input.title] : [],
    scheduledAt: input.scheduledAt ?? null,
    durationMinutes: input.durationMinutes,
  };
}

function mergeTaskStatus(
  sessionItems: ActionItem[],
  allTasks: ActionItem[],
): ActionItem[] {
  return sessionItems.map((item) => {
    const live = allTasks.find((task) => task.id === item.id);
    return live ? { ...item, done: live.done, dueLabel: live.dueLabel } : item;
  });
}

type Props = {
  section: AdvisorySection;
};

export function AdvisorySectionPage({ section }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { ready, auth, sub } = useClientGate();
  const demoMode = isDemoMode();
  const currency = useFinancialStore((s) => s.user?.currency ?? "USD");
  const { loading, noAdvisor, overview, error, reload } = useAdvisoryOverview();

  const messagesHref = isDemoPath(pathname)
    ? "/dashboard/demo/messages"
    : "/dashboard/messages";

  const isTrial =
    !demoMode && (sub.status === "trialing" || sub.status === "none");
  const [showUpgradePrompt, setShowUpgradePrompt] = React.useState(false);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [requestOpen, setRequestOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [cancelling, setCancelling] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [duration, setDuration] = React.useState<AppointmentDuration>(30);
  const [slots, setSlots] = React.useState<AppointmentSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = React.useState(false);

  const [documents, setDocuments] =
    React.useState<SessionDocument[]>(MOCK_ALL_DOCS);
  const [demoUpcoming, setDemoUpcoming] =
    React.useState<UpcomingSession | null>(MOCK_UPCOMING);

  const pageReady = ready && (demoMode || auth.loggedIn);
  const tasksEnabled =
    (section === "tasks" || section === "appointments") &&
    pageReady &&
    !noAdvisor &&
    (demoMode || !loading);

  const {
    items: taskItems,
    loading: tasksLoading,
    error: tasksError,
    toggleItem: toggleTask,
    reload: reloadTasks,
  } = useAdvisoryTasks({
    enabled: tasksEnabled,
    overviewFallback: overview?.actions,
  });

  const messages = useAdvisoryMessages({
    enabled: pageReady && !noAdvisor,
    active: section === "messages",
  });
  const productDraftSeeded = React.useRef(false);

  React.useEffect(() => {
    if (section !== "messages" || productDraftSeeded.current) return;
    const product = new URLSearchParams(window.location.search)
      .get("product")
      ?.trim();
    if (!product) return;
    productDraftSeeded.current = true;
    messages.setBody(`I'd like to discuss the ${product}.`);
    const params = new URLSearchParams(window.location.search);
    params.delete("product");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [section, pathname, router, messages.setBody]);

  const upcoming: UpcomingSession | null = demoMode
    ? demoUpcoming
    : overview
      ? mapUpcoming(overview)
      : null;

  const rmName = demoMode
    ? MOCK_ADVISOR_NAME
    : overview?.advisorName || "Your RM";

  const lastSession = demoMode
    ? MOCK_LAST_SESSION
    : overview
      ? mapLastSession(overview)
      : null;

  const history = demoMode
    ? MOCK_HISTORY
    : overview
      ? mapHistory(overview)
      : [];

  const historySessions = React.useMemo(() => {
    const list =
      lastSession && !history.some((session) => session.id === lastSession.id)
        ? [lastSession, ...history]
        : history;
    return list.map((session) => ({
      ...session,
      actionItems: mergeTaskStatus(session.actionItems, taskItems),
    }));
  }, [lastSession, history, taskItems]);

  const progressMetrics: ProgressMetric[] = React.useMemo(() => {
    if (demoMode) {
      return MOCK_PROGRESS_RAW.map((m) => {
        if (!m.isCurrency) {
          return {
            label: m.label,
            before: `${m.beforeAmount}%`,
            after: `${m.afterAmount}%`,
            direction: m.direction,
            positiveDirection: m.positiveDirection,
            changeLabel: m.changeLabel ?? "",
          };
        }
        const diff = m.afterAmount - m.beforeAmount;
        const sign = diff >= 0 ? "+" : "";
        return {
          label: m.label,
          before: formatCurrency(m.beforeAmount, currency),
          after: formatCurrency(m.afterAmount, currency),
          direction: m.direction,
          positiveDirection: m.positiveDirection,
          changeLabel: `${sign}${formatCurrency(Math.abs(diff), currency)}`,
        };
      });
    }
    if (!overview?.lastSession) return [];
    return mapProgressMetrics(overview.lastSession.progress.metrics, currency);
  }, [currency, demoMode, overview]);

  React.useEffect(() => {
    if (demoMode || !overview) return;
    setDocuments(mapDocuments(overview.documents));
  }, [demoMode, overview]);

  React.useEffect(() => {
    if (!requestOpen || noAdvisor) return;
    if (demoMode) {
      setSlots(MOCK_SLOTS);
      setSlotsLoading(false);
      return;
    }
    let cancelled = false;
    setSlotsLoading(true);
    const { from, to } = slotRange();
    fetchAppointmentSlots({ from, to, durationMinutes: duration })
      .then((next) => {
        if (!cancelled) setSlots(next);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof SessionExpiredError) return;
        setSlots([]);
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [requestOpen, duration, demoMode, noAdvisor]);

  function handleUpgrade() {
    try {
      window.localStorage.setItem("upgrade_intent", "true");
    } catch {}
    router.push("/choose-plan");
  }

  function handleBook() {
    if (isTrial) {
      setShowUpgradePrompt(true);
      return;
    }
    setShowUpgradePrompt(false);
    if (noAdvisor) {
      toast.error(CONFLICT_COPY.noAdvisor);
      return;
    }
    setRequestOpen(true);
  }

  async function handleToggleAction(id: string) {
    try {
      await toggleTask(id);
    } catch {
      toast.error("Could not update that action.");
    }
  }

  async function handleRequest(input: {
    type: Parameters<typeof requestAppointment>[0]["type"];
    durationMinutes: AppointmentDuration;
    scheduledAt: string;
    title?: string;
    message: string;
  }) {
    setSubmitting(true);
    if (demoMode) {
      setDemoUpcoming(demoUpcomingFromBooking(input, "requested"));
      toast.success("Session requested. Your RM will confirm shortly.");
      setRequestOpen(false);
      setSubmitting(false);
      return;
    }
    try {
      await requestAppointment(input);
      toast.success("Session requested. Your RM will confirm shortly.");
      setRequestOpen(false);
      reload();
    } catch (err) {
      if (err instanceof SessionExpiredError) return;
      if (isNoAdvisorError(err) || isConflict(err)) {
        toast.error(conflictCopyFor("request", err));
        return;
      }
      toast.error(
        err instanceof Error ? err.message : "Could not request a session.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel() {
    if (!upcoming) return;
    setDetailsOpen(false);
    if (demoMode) {
      setDemoUpcoming(null);
      toast.success("Session cancelled.");
      return;
    }
    setCancelling(true);
    try {
      await cancelAppointment(upcoming.id);
      toast.success("Session cancelled.");
      reload();
    } catch (err) {
      if (err instanceof SessionExpiredError) return;
      toast.error(
        err instanceof Error ? err.message : "Could not cancel that session.",
      );
    } finally {
      setCancelling(false);
    }
  }

  async function refreshDocuments() {
    const list = await fetchDocuments("all");
    setDocuments(mapDocuments(list));
  }

  React.useEffect(() => {
    if (section !== "documents" || demoMode || !pageReady || noAdvisor) return;
    let cancelled = false;
    fetchDocuments("all")
      .then((list) => {
        if (!cancelled) setDocuments(mapDocuments(list));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof SessionExpiredError) return;
      });
    return () => {
      cancelled = true;
    };
  }, [section, demoMode, pageReady, noAdvisor]);

  async function handleDownload(id: string) {
    if (demoMode) {
      toast("Demo files can't be downloaded.");
      return;
    }
    try {
      const url = await freshDownloadUrl(id);
      if (!url) {
        toast.error("Could not get a download link. Try again.");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      if (err instanceof SessionExpiredError) return;
      toast.error("Could not download that file.");
    }
  }

  async function handleDeleteDoc(id: string) {
    if (demoMode) {
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
      toast.success("Document removed.");
      return;
    }
    try {
      await deleteDocument(id);
      toast.success("Document removed.");
      await refreshDocuments();
    } catch (err) {
      if (err instanceof SessionExpiredError) return;
      if (err instanceof ApiRequestError && err.status === 403) {
        toast.error("RM files are read-only.");
        return;
      }
      toast.error("Could not delete that file.");
    }
  }

  async function handleUpload(
    file: File,
    title: string,
    category: DocumentCategory,
  ) {
    if (demoMode) {
      const now = new Date().toISOString();
      setDocuments((prev) => [
        {
          id: `demo-doc-${Date.now()}`,
          name: title || file.name,
          type: category,
          dateLabel: formatAdvisoryDate(now),
          sizeLabel: formatFileSize(file.size),
          uploadedBy: "client",
        },
        ...prev,
      ]);
      toast.success("Document uploaded.");
      return;
    }
    setUploading(true);
    try {
      await uploadDocument({
        file,
        title: title || undefined,
        category,
      });
      toast.success("Document uploaded.");
      await refreshDocuments();
    } catch (err) {
      if (err instanceof SessionExpiredError) return;
      if (isNoAdvisorError(err)) {
        toast.error(CONFLICT_COPY.noAdvisor);
        return;
      }
      if (err instanceof ApiRequestError && err.status === 413) {
        toast.error("File is over 15MB.");
        return;
      }
      if (err instanceof ApiRequestError && err.status === 415) {
        toast.error(
          "That file type isn't supported. Use PDF, JPEG, PNG, WebP, or DOCX.",
        );
        return;
      }
      toast.error("Could not upload that file.");
    } finally {
      setUploading(false);
    }
  }

  const copy = SECTION_COPY[section];

  if (!ready) {
    return <AdvisoryPageSkeleton />;
  }

  if (!auth.loggedIn && !demoMode) return null;

  if (!demoMode && !canAccessFeature(sub, "advisorChat")) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="max-w-md space-y-4 text-center">
          <div
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--brand-primary) 8%, transparent)",
            }}
          >
            <Lock className="h-5 w-5" style={{ color: PRIMARY }} />
          </div>
          <h2 className="text-xl font-semibold" style={{ color: PRIMARY }}>
            {copy.title}
          </h2>
          <p className="text-sm text-muted-foreground">
            Appointments and messaging with your RM are part of full platform
            access. Upgrade to book sessions and work with your RM.
          </p>
          <Button
            onClick={handleUpgrade}
            className="gap-2 text-white"
            style={{ backgroundColor: PRIMARY }}
          >
            Upgrade to access <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  if (!demoMode && loading) {
    return <AdvisoryPageSkeleton />;
  }

  if (!demoMode && error) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-6">
        <div className="max-w-md space-y-3 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button size="sm" onClick={reload}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (!demoMode && noAdvisor) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="max-w-md space-y-4 text-center">
          <div
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--brand-primary) 8%, transparent)",
            }}
          >
            <CalendarDays className="h-5 w-5" style={{ color: PRIMARY }} />
          </div>
          <h2 className="text-xl font-semibold" style={{ color: PRIMARY }}>
            You haven&apos;t been assigned an RM yet.
          </h2>
          <p className="text-sm text-muted-foreground">
            One will be assigned to you shortly. Once matched, use Appointments,
            Messages, Tasks, and Documents in the sidebar to work with them.
          </p>
        </div>
      </div>
    );
  }

  const pageWidthClass =
    section === "messages" ? "w-full max-w-none" : "max-w-4xl";

  return (
    <div className={`${dashboardTheme.pageContainer} ${pageWidthClass}`}>
      <motion.div
        variants={pageEnter}
        initial="hidden"
        animate="show"
        className="space-y-1 pb-1"
      >
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {copy.title}
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {copy.description}
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={section}
          initial={{ opacity: 0, transform: "translateY(12px)" }}
          animate={{ opacity: 1, transform: "translateY(0px)" }}
          exit={{ opacity: 0, transform: "translateY(-8px)" }}
          transition={{ duration: 0.3 }}
        >
          {section === "appointments" && (
            <AdvisorySessionsTab
              isTrial={isTrial}
              showUpgradePrompt={showUpgradePrompt}
              onBook={handleBook}
              onUpgrade={handleUpgrade}
              upcoming={upcoming}
              onViewDetails={() => setDetailsOpen(true)}
              onCancel={() => void handleCancel()}
              cancelling={cancelling}
              rmName={rmName}
              messagesHref={messagesHref}
              historySessions={historySessions}
              latestSessionId={lastSession?.id}
              latestProgress={progressMetrics}
              onToggleAction={(id) => void handleToggleAction(id)}
              availabilityDemo={MOCK_AVAILABILITY}
            />
          )}

          {section === "tasks" && (
            <AdvisoryTasksTab
              items={taskItems}
              loading={tasksLoading}
              error={tasksError}
              onToggle={(id) => void handleToggleAction(id)}
              onRetry={reloadTasks}
            />
          )}

          {section === "messages" && (
            <AdvisoryMessagesTab
              rmName={rmName}
              items={messages.items}
              loading={messages.loading}
              enabled
              sending={messages.sending}
              body={messages.body}
              onBodyChange={messages.setBody}
              onSend={() => void messages.send()}
            />
          )}

          {section === "documents" && (
            <AdvisoryDocumentsTab
              documents={documents}
              canMutate
              uploading={uploading}
              onDownload={(id) => void handleDownload(id)}
              onDelete={(id) => void handleDeleteDoc(id)}
              onUpload={(file, title, category) =>
                void handleUpload(file, title, category)
              }
            />
          )}
        </motion.div>
      </AnimatePresence>

      {section === "appointments" ? (
        <>
          <RequestSessionDialog
            open={requestOpen}
            onOpenChange={setRequestOpen}
            submitting={submitting}
            slots={slots}
            slotsLoading={slotsLoading}
            onDurationChange={setDuration}
            onRequest={(input) => void handleRequest(input)}
          />

          <SessionDetailsSheet
            session={upcoming}
            open={detailsOpen && !!upcoming}
            onOpenChange={setDetailsOpen}
            onCancel={() => void handleCancel()}
            cancelling={cancelling}
          />
        </>
      ) : null}
    </div>
  );
}
