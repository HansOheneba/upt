"use client";

import * as React from "react";
import {
  Calendar,
  CheckCircle2,
  Circle,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import {
  DashCard,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/dash-card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { SectionFreshness } from "@/lib/client-data";
import type { Advisor, ActionItem, Note, Meeting } from "@/lib/client-data";
import { DataFreshnessBadge } from "./DataFreshnessBadge";

interface AdvisorSectionProps {
  advisor: Advisor;
  upcomingMeeting: Meeting | null;
  actionItems: ActionItem[];
  notes: Note[];
  freshness: SectionFreshness[];
}

const AVAILABILITY_CONFIG = {
  available: {
    label: "Available",
    className: "bg-emerald-100 text-emerald-700",
  },
  limited: { label: "Limited", className: "bg-amber-100 text-amber-700" },
  away: { label: "Away", className: "bg-muted text-muted-foreground" },
} as const;

export function AdvisorSection({
  advisor,
  upcomingMeeting,
  actionItems,
  notes,
  freshness,
}: AdvisorSectionProps) {
  const avail = AVAILABILITY_CONFIG[advisor.availability];
  const pendingCount = actionItems.filter((a) => !a.done).length;

  return (
    <DashCard>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">Your Advisor</CardTitle>
          <DataFreshnessBadge freshness={freshness} section="advisor" />
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Advisor profile */}
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12 shrink-0">
            <AvatarFallback className="bg-indigo-100 text-indigo-700 font-semibold">
              {advisor.initials}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm">{advisor.name}</p>
              <Badge className={`text-xs border-0 ${avail.className}`}>
                {avail.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{advisor.title}</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {advisor.credentials.map((c) => (
                <Badge key={c} variant="secondary" className="text-xs">
                  {c}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>{advisor.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span>{advisor.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span>{advisor.phone}</span>
          </div>
        </div>

        <Separator />

        {/* Upcoming meeting */}
        {upcomingMeeting && (
          <div className="rounded-lg border p-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-indigo-500 shrink-0" />
              <p className="text-sm font-medium">{upcomingMeeting.title}</p>
            </div>
            <p className="text-xs text-muted-foreground pl-6">
              {upcomingMeeting.dateLabel}
            </p>
            <div className="pl-6">
              <Badge variant="secondary" className="text-xs capitalize">
                {upcomingMeeting.status}
              </Badge>
            </div>
          </div>
        )}

        <Separator />

        {/* Action items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Action Items
            </p>
            {pendingCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {pendingCount} pending
              </Badge>
            )}
          </div>
          <div className="space-y-2">
            {actionItems.map((item) => (
              <div key={item.id} className="flex items-start gap-2.5 text-sm">
                {item.done ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                )}
                <div className="space-y-0.5 min-w-0">
                  <p
                    className={
                      item.done ? "line-through text-muted-foreground" : ""
                    }
                  >
                    {item.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.dueLabel}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {notes.length > 0 && (
          <>
            <Separator />

            {/* Notes */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Recent Notes
              </p>
              <div className="space-y-3">
                {notes.map((note) => (
                  <div key={note.id} className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">
                      {note.dateLabel}
                    </p>
                    <p className="text-sm leading-relaxed">{note.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </DashCard>
  );
}
