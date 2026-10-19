"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type TimelineRowProps = {
  title: string;
  description: string;
  right: React.ReactNode;
  tone?: "good" | "neutral";
  icon: React.ReactNode;
};

export function TimelineRow({
  title,
  description,
  right,
  tone = "neutral",
  icon,
}: TimelineRowProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded-2xl border p-4",
        "border-muted/60 bg-background/60",
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
            tone === "good"
              ? "border-emerald-200/60 bg-emerald-50/60"
              : "border-muted/60 bg-muted/30",
          )}
          aria-hidden
        >
          {icon}
        </div>

        <div className="min-w-0">
          <div className="text-sm font-semibold tracking-tight">{title}</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {description}
          </div>
        </div>
      </div>

      <div className="shrink-0">{right}</div>
    </div>
  );
}
