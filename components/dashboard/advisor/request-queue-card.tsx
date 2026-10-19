"use client";

import { Clock3, GraduationCap, ShieldCheck } from "lucide-react";

import { DashCard, CardContent, CardHeader, CardTitle } from "@/components/dashboard/dash-card";

export function RequestQueueCard() {
  return (
    <DashCard>
      <CardHeader>
        <CardTitle className="text-base">
          Request Queue &amp; Service Levels
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Advisors prioritize based on complexity, urgency, and compliance
          needs.
        </p>
      </CardHeader>

      <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-2xl bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock3 className="h-4 w-4" />
            Standard requests
          </div>
          <div className="mt-2 text-sm font-semibold">1-2 business days</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Portfolio questions, goal updates, planning clarifications.
          </div>
        </div>

        <div className="rounded-2xl bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            Compliance-sensitive
          </div>
          <div className="mt-2 text-sm font-semibold">2-4 business days</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Policy changes, IPS updates, major allocation shifts.
          </div>
        </div>

        <div className="rounded-2xl bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <GraduationCap className="h-4 w-4" />
            Complex planning
          </div>
          <div className="mt-2 text-sm font-semibold">3-7 business days</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Trust structures, tax planning, multi-entity strategy.
          </div>
        </div>
      </CardContent>
    </DashCard>
  );
}
