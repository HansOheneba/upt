"use client";

import { Note } from "@/components/dashboard/advisor/types";
import { DashCard, CardContent, CardHeader, CardTitle } from "@/components/dashboard/dash-card";

type NotesCardProps = {
  notes: Note[];
};

export function NotesCard({ notes }: NotesCardProps) {
  return (
    <DashCard>
      <CardHeader>
        <CardTitle className="text-base">Recent Notes</CardTitle>
        <p className="text-sm text-muted-foreground">
          Summaries from prior sessions and advisor follow-ups.
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {notes.map((n) => (
          <div
            key={n.id}
            className="rounded-2xl border border-muted/60 bg-background/60 p-4"
          >
            <div className="text-xs text-muted-foreground">{n.dateLabel}</div>
            <div className="mt-2 text-sm text-foreground">{n.text}</div>
          </div>
        ))}
      </CardContent>
    </DashCard>
  );
}
