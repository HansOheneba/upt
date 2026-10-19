"use client";

import { cn } from "@/lib/utils";
import { Availability } from "@/components/dashboard/advisor/types";

type AvailabilityPillProps = {
  value: Availability;
};

export function AvailabilityPill({ value }: AvailabilityPillProps) {
  const meta =
    value === "available"
      ? {
          label: "Available for requests",
          dot: "bg-emerald-500",
          bg: "bg-emerald-50/60",
          br: "border-emerald-200/60",
          tx: "text-emerald-800",
        }
      : value === "limited"
        ? {
            label: "Limited availability",
            dot: "bg-amber-500",
            bg: "bg-amber-50/60",
            br: "border-amber-200/60",
            tx: "text-amber-800",
          }
        : {
            label: "Away",
            dot: "bg-neutral-400",
            bg: "bg-muted/30",
            br: "border-muted/60",
            tx: "text-muted-foreground",
          };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
        meta.bg,
        meta.br,
        meta.tx,
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}
