"use client";

import * as React from "react";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashCard, CardContent } from "@/components/dashboard/dash-card";
import {
  formatAdvisoryFullDate,
  formatAdvisoryTimeRange,
} from "@/lib/advisory-map";
import { appointmentsCardClass } from "./appointments-ui";
import type { UpcomingSession } from "./types";
import { sessionTypeLabel } from "./types";

type Props = {
  session: UpcomingSession;
  onViewDetails: () => void;
  onCancel?: () => void;
  cancelling?: boolean;
};

export function UpcomingSessionCard({
  session,
  onViewDetails,
  onCancel,
  cancelling,
}: Props) {
  const isRequested = session.status === "requested";
  const typeLabel = sessionTypeLabel(session.type);
  const dateLine = session.scheduledAt
    ? formatAdvisoryFullDate(session.scheduledAt)
    : session.date;
  const timeLine =
    session.scheduledAt && session.durationMinutes
      ? formatAdvisoryTimeRange(session.scheduledAt, session.durationMinutes)
      : session.timeLabel;
  const topics = session.focusAreas.filter(Boolean);

  return (
    <DashCard className={appointmentsCardClass}>
      <CardContent className="p-0">
        <div className="flex items-start justify-between gap-4 border-b border-border/50 px-5 py-4">
          <div className="flex min-w-0 gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-muted-foreground">
              <CalendarClock className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {typeLabel}
              </p>
              <p className="mt-1 text-base font-semibold tracking-tight text-foreground">
                {dateLine}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">{timeLine}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                With {session.advisorName}
              </p>
            </div>
          </div>
          <Badge
            variant={isRequested ? "outline" : "secondary"}
            className="shrink-0 font-normal"
          >
            {isRequested ? "Requested" : "Confirmed"}
          </Badge>
        </div>

        {topics.length > 0 ? (
          <div className="border-b border-border/50 px-5 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Topics
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {topics.map((topic) => (
                <Badge key={topic} variant="outline" className="font-normal">
                  {topic}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={onViewDetails}
          >
            View details
          </Button>
          {onCancel ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs text-muted-foreground"
              onClick={onCancel}
              disabled={cancelling}
            >
              {cancelling ? "Cancelling..." : "Cancel"}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </DashCard>
  );
}
