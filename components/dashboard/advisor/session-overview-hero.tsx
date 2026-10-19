"use client";

import * as React from "react";
import { ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashCard, CardContent } from "@/components/dashboard/dash-card";
import { appointmentsCardClass } from "./appointments-ui";

const PRIMARY = "var(--brand-primary)";

type Props = {
  isTrial: boolean;
  onBook: () => void;
};

export function SessionOverviewHero({ isTrial, onBook }: Props) {
  return (
    <DashCard
      data-tour="primary-action"
      className={`${appointmentsCardClass} bg-muted/20`}
    >
      <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-foreground">
            Book a session with your RM
          </p>
          <p className="text-sm text-muted-foreground">
            Reviews, check-ins, and follow-ups when you need them.
          </p>
        </div>
        {isTrial ? (
          <Button
            size="sm"
            className="h-9 shrink-0 gap-1.5 text-xs text-white"
            style={{ backgroundColor: PRIMARY }}
            onClick={onBook}
          >
            <Lock className="h-3.5 w-3.5" />
            Upgrade to book
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            size="sm"
            className="h-9 shrink-0 gap-1.5 text-xs text-white"
            style={{ backgroundColor: PRIMARY }}
            onClick={onBook}
          >
            Book a session
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </CardContent>
    </DashCard>
  );
}
