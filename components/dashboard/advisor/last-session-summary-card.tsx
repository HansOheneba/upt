"use client";

import * as React from "react";
import {
  CalendarDays,
  Clock,
  FileText,
  ChevronDown,
  ChevronUp,
  MessageSquare,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DashCard,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/dash-card";
import type { AdvisorySession } from "./types";
import { SESSION_TYPE_LABELS } from "./types";

const ACCENT = "var(--brand-accent)";
const PRIMARY = "var(--brand-primary)";

type Props = {
  session: AdvisorySession;
};

export function LastSessionSummaryCard({ session }: Props) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <DashCard>
      <CardHeader>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-base" style={{ color: PRIMARY }}>
              Last session summary
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              Your most recent session notes and RM assessment.
            </p>
          </div>
          <Badge
            variant="secondary"
            className="rounded-full text-xs shrink-0"
            style={{ backgroundColor: "color-mix(in srgb, var(--brand-accent) 12%, transparent)", color: ACCENT }}
          >
            {session.title || SESSION_TYPE_LABELS[session.type]}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Meta row */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 shrink-0" />
            {session.date}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 shrink-0" />
            {session.durationMinutes} minutes
          </span>
          <span className="flex items-center gap-1.5">
            <MessageSquare className="h-4 w-4 shrink-0" />
            with {session.advisorName}
          </span>
        </div>

        {/* Focus areas */}
        {session.focusAreas.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {session.focusAreas.map((area) => (
              <Badge
                key={area}
                variant="outline"
                className="text-xs rounded-full"
              >
                {area}
              </Badge>
            ))}
          </div>
        )}

        <Separator />

        {/* Advisor assessment */}
        <div
          className="rounded-xl px-4 py-3 border-l-2"
          style={{
            backgroundColor: "color-mix(in srgb, var(--brand-primary) 3%, transparent)",
            borderLeftColor: ACCENT,
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            RM assessment
          </p>
          <p className="text-sm leading-relaxed text-foreground/80">
            {session.advisorAssessment}
          </p>
        </div>

        {/* Key discussion points */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Key discussion points
          </p>
          <ul className="space-y-1.5">
            {session.keyDiscussionPoints.map((point, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-foreground/80"
              >
                <span
                  className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: ACCENT }}
                />
                {point}
              </li>
            ))}
          </ul>
        </div>

        {/* Expandable recommendations */}
        {session.recommendations.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-medium transition-colors hover:opacity-80"
              style={{ color: ACCENT }}
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" /> Hide recommendations
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" /> Show{" "}
                  {session.recommendations.length} recommendation
                  {session.recommendations.length !== 1 ? "s" : ""}
                </>
              )}
            </button>

            {expanded && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Recommendations
                </p>
                {session.recommendations.map((rec, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 rounded-xl border p-3 bg-background/60"
                  >
                    <span
                      className="mt-0.5 text-xs font-bold shrink-0 h-5 w-5 rounded-full flex items-center justify-center text-white"
                      style={{ backgroundColor: ACCENT }}
                    >
                      {i + 1}
                    </span>
                    <p className="text-sm text-foreground/80">{rec}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Session notes */}
        {session.summaryNotes && (
          <>
            <Separator />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                Session notes
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {session.summaryNotes}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </DashCard>
  );
}
