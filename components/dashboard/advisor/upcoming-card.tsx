"use client";

import { CalendarClock } from "lucide-react";

import { TimelineRow } from "@/components/dashboard/advisor/timeline-row";
import { Meeting } from "@/components/dashboard/advisor/types";
import { Badge } from "@/components/ui/badge";
import { DashCard, CardContent, CardHeader, CardTitle } from "@/components/dashboard/dash-card";

type UpcomingMeetingCardProps = {
  meeting: Meeting;
};

export function UpcomingMeetingCard({ meeting }: UpcomingMeetingCardProps) {
  return (
    <DashCard>
      <CardHeader>
        <CardTitle className="text-base">Upcoming Meeting</CardTitle>
        <p className="text-sm text-muted-foreground">
          Scheduled sessions are created after requests are reviewed and
          confirmed.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <TimelineRow
          title={meeting.title}
          description={meeting.dateLabel}
          tone="good"
          icon={
            <CalendarClock className="h-4 w-4 text-emerald-700 dark:text-emerald-500" />
          }
          right={
            <Badge variant="secondary" className="rounded-full">
              Confirmed
            </Badge>
          }
        />

        <div className="rounded-2xl bg-muted/30 p-4 text-sm text-muted-foreground">
          Joining links are shared once the meeting window is confirmed
          (typically 24 hours before the session).
        </div>
      </CardContent>
    </DashCard>
  );
}
