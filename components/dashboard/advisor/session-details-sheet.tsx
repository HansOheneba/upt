"use client";

import * as React from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  formatAdvisoryFullDate,
  formatAdvisoryTimeRange,
} from "@/lib/advisory-map";
import { dashboardTheme } from "@/lib/dashboard-theme";
import type { UpcomingSession } from "./types";
import { sessionTypeLabel } from "./types";

const PRIMARY = "var(--brand-primary)";
const ACCENT = "var(--brand-accent)";

type Props = {
  session: UpcomingSession | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel?: () => void;
  cancelling?: boolean;
};

function DetailBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className={dashboardTheme.sectionLabel}>{label}</p>
      <div className="mt-1.5 text-sm text-foreground">{children}</div>
    </div>
  );
}

export function SessionDetailsSheet({
  session,
  open,
  onOpenChange,
  onCancel,
  cancelling,
}: Props) {
  if (!session) return null;

  const isRequested = session.status === "requested";
  const dateLine = session.scheduledAt
    ? formatAdvisoryFullDate(session.scheduledAt)
    : session.date;
  const timeLine =
    session.scheduledAt && session.durationMinutes
      ? formatAdvisoryTimeRange(session.scheduledAt, session.durationMinutes)
      : session.timeLabel;
  const typeLabel = sessionTypeLabel(session.type);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border/50 px-6 py-5 pr-12">
          <p className={dashboardTheme.sectionLabel}>Session Details</p>
          <div className="mt-3 flex items-start justify-between gap-3">
            <SheetTitle
              className="text-xl font-semibold tracking-tight"
              style={{ color: PRIMARY }}
            >
              {typeLabel}
            </SheetTitle>
            <p
              className="pt-1 text-[11px] font-semibold uppercase tracking-widest"
              style={{ color: isRequested ? PRIMARY : ACCENT }}
            >
              {isRequested ? "Requested" : "Confirmed"}
            </p>
          </div>
          <SheetDescription className="sr-only">
            {dateLine} at {timeLine} with {session.advisorName}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          <div>
            <p className="text-base font-medium text-foreground">{dateLine}</p>
            <p className="mt-1 text-sm text-muted-foreground">{timeLine}</p>
          </div>

          <DetailBlock label="Your RM">{session.advisorName}</DetailBlock>

          <DetailBlock label="Session">
            {session.focusAreas[0] || typeLabel}
          </DetailBlock>

          <DetailBlock label="Joining details">
            {session.joinUrl ? (
              <a
                href={session.joinUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 font-medium"
                style={{ color: PRIMARY }}
              >
                Join session
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : isRequested ? (
              "Your RM will confirm this time within 1 - 2 business days."
            ) : (
              "Available 24 hours before your session."
            )}
          </DetailBlock>
        </div>

        {(onCancel || session.rescheduleUrl) && (
          <SheetFooter className="border-t border-border/50 px-6 py-4 sm:flex-col sm:space-x-0">
            {session.rescheduleUrl && (
              <Button variant="outline" className="w-full" asChild>
                <a href={session.rescheduleUrl} target="_blank" rel="noreferrer">
                  Reschedule
                </a>
              </Button>
            )}
            {onCancel && (
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={onCancel}
                disabled={cancelling}
              >
                {cancelling ? "Cancelling..." : "Cancel session"}
              </Button>
            )}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
