"use client";

import * as React from "react";
import { ArrowRight, CalendarDays } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DashCard, CardContent } from "@/components/dashboard/dash-card";
import { dashboardTheme } from "@/lib/dashboard-theme";
import { cn } from "@/lib/utils";
import type { ProgressMetric } from "./progress-since-session-card";
import type { AdvisorySession } from "./types";
import { appointmentsCardClass } from "./appointments-ui";
import { sessionTypeLabel } from "./types";

const PRIMARY = "var(--brand-primary)";
const ACCENT = "var(--brand-accent)";

type Props = {
  sessions: AdvisorySession[];
  latestSessionId?: string;
  latestProgress?: ProgressMetric[];
  onToggleAction?: (id: string) => void;
};

export function SessionHistoryCard({
  sessions,
  latestSessionId,
  latestProgress,
  onToggleAction,
}: Props) {
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = React.useState(false);
  const active = sessions.find((s) => s.id === activeId) ?? null;

  return (
    <>
      {sessions.length === 0 ? (
        <DashCard className={appointmentsCardClass}>
          <CardContent className="flex flex-col items-center py-10 text-center">
            <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <CalendarDays className="size-6" />
            </div>
            <p className="text-sm font-medium text-foreground">
              Session notes land here
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Summaries, notes, and progress appear after your first completed session.
            </p>
            <Button size="sm" className="mt-4" asChild>
              <Link href="/dashboard/appointments">Request a session</Link>
            </Button>
          </CardContent>
        </DashCard>
      ) : (
        <DashCard className={appointmentsCardClass}>
          <div className="divide-y divide-border/50">
          {sessions.map((session) => {
            const summary =
              session.advisorAssessment || session.summaryNotes || "";
            const excerpt =
              summary.length > 160 ? `${summary.slice(0, 157).trim()}...` : summary;
            const title =
              session.title || sessionTypeLabel(session.type);
            return (
              <div key={session.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {sessionTypeLabel(session.type)}
                      </p>
                      <p className="mt-0.5 truncate text-sm font-semibold tracking-tight text-foreground">
                        {title}
                      </p>
                    </div>
                    <p className="shrink-0 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Completed
                    </p>
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {session.date} · {session.advisorName}
                  </p>
                  {excerpt ? (
                    <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-foreground/80">
                      {excerpt}
                    </p>
                  ) : null}
                  <div className="mt-3 flex justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 gap-1.5 px-2 text-xs text-foreground"
                      onClick={() => {
                        setActiveId(session.id);
                        setSummaryOpen(true);
                      }}
                    >
                      View summary
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
              </div>
            );
          })}
          </div>
        </DashCard>
      )}

      <SessionSummarySheet
        session={active}
        open={summaryOpen}
        onOpenChange={setSummaryOpen}
        progress={
          active && active.id === latestSessionId ? latestProgress : undefined
        }
        onToggleAction={onToggleAction}
      />
    </>
  );
}

function SessionSummarySheet({
  session,
  open,
  onOpenChange,
  progress,
  onToggleAction,
}: {
  session: AdvisorySession | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  progress?: ProgressMetric[];
  onToggleAction?: (id: string) => void;
}) {
  if (!session) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b border-border/50 px-6 py-5 pr-12">
          <p className={dashboardTheme.sectionLabel}>Session Summary</p>
          <SheetTitle className="mt-2 text-xl font-semibold tracking-tight text-foreground">
            {session.title || sessionTypeLabel(session.type)}
          </SheetTitle>
          <SheetDescription>
            {session.date} · {session.advisorName}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          {session.advisorAssessment ? (
            <SummaryBlock label="RM notes">
              <p className="leading-relaxed">{session.advisorAssessment}</p>
            </SummaryBlock>
          ) : null}

          {session.summaryNotes ? (
            <SummaryBlock label="Session notes">
              <p className="leading-relaxed text-muted-foreground">
                {session.summaryNotes}
              </p>
            </SummaryBlock>
          ) : null}

          {session.keyDiscussionPoints.length > 0 ? (
            <SummaryBlock label="Discussion points">
              <ul className="space-y-1.5">
                {session.keyDiscussionPoints.map((point) => (
                  <li key={point} className="leading-relaxed">
                    {point}
                  </li>
                ))}
              </ul>
            </SummaryBlock>
          ) : null}

          {session.recommendations.length > 0 ? (
            <SummaryBlock label="Recommendations">
              <ul className="space-y-1.5">
                {session.recommendations.map((rec) => (
                  <li key={rec} className="leading-relaxed">
                    {rec}
                  </li>
                ))}
              </ul>
            </SummaryBlock>
          ) : null}

          {session.actionItems.length > 0 ? (
            <SummaryBlock label="Actions">
              <ul className="space-y-2">
                {session.actionItems.map((item) => (
                  <li key={item.id}>
                    {onToggleAction ? (
                      <button
                        type="button"
                        onClick={() => onToggleAction(item.id)}
                        className="flex w-full items-start gap-2 text-left"
                      >
                        <span
                          className={cn(
                            "mt-0.5 inline-block h-3.5 w-3.5 shrink-0 rounded-sm border",
                            item.done && "border-transparent",
                          )}
                          style={{
                            backgroundColor: item.done ? ACCENT : "transparent",
                            borderColor: item.done
                              ? ACCENT
                              : "var(--border)",
                          }}
                        />
                        <span
                          className={cn(
                            "leading-relaxed",
                            item.done && "text-muted-foreground line-through",
                          )}
                        >
                          {item.label}
                        </span>
                      </button>
                    ) : (
                      <span
                        className={cn(
                          "leading-relaxed",
                          item.done && "text-muted-foreground line-through",
                        )}
                      >
                        {item.label}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </SummaryBlock>
          ) : null}

          {progress && progress.length > 0 ? (
            <SummaryBlock label="Progress">
              <ul className="space-y-3">
                {progress.map((metric) => (
                  <li
                    key={metric.label}
                    className="flex items-baseline justify-between gap-3"
                  >
                    <span className="text-muted-foreground">{metric.label}</span>
                    <span className="tabular-nums">
                      {metric.after}
                      {metric.changeLabel ? (
                        <span className="ml-2 text-muted-foreground">
                          {metric.changeLabel}
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </SummaryBlock>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SummaryBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className={dashboardTheme.sectionLabel}>{label}</p>
      <div className="mt-2 text-sm text-foreground">{children}</div>
    </div>
  );
}
