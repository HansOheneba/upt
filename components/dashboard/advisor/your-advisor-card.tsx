"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashCard, CardContent } from "@/components/dashboard/dash-card";
import { appointmentsCardClass } from "./appointments-ui";

const PRIMARY = "var(--brand-primary)";

function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

type Props = {
  rmName: string;
  messagesHref: string;
};

export function YourAdvisorCard({ rmName, messagesHref }: Props) {
  return (
    <DashCard className={`${appointmentsCardClass} h-full`}>
      <CardContent className="flex h-full flex-col py-4">
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: PRIMARY }}
          >
            {initialsOf(rmName) || "RM"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold tracking-tight text-foreground">
              {rmName}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Relationship Manager
            </p>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Usually replies within 1 - 2 business days.
        </p>
        <div className="mt-4 lg:mt-auto lg:pt-2">
        <Button
          size="sm"
          variant="outline"
          className="h-8 w-full gap-1.5 text-xs sm:w-auto"
          asChild
        >
          <Link href={messagesHref}>
            Message RM
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
        </div>
      </CardContent>
    </DashCard>
  );
}
