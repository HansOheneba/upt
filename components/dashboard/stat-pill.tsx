import * as React from "react";
import { formatUiLabel } from "@/lib/format-ui-label";
import { cn } from "@/lib/utils";

type StatPillProps = {
  label: string;
  value: string;
  positive?: boolean;
  tipSlot?: React.ReactNode;
  className?: string;
};

/** Metric label + value row used on overview cards and detail panels. */
export function StatPill({
  label,
  value,
  positive,
  tipSlot,
  className,
}: StatPillProps) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <span className="text-xs text-muted-foreground capitalize flex items-center gap-1">
        {formatUiLabel(label)}
        {tipSlot}
      </span>
      <span
        className={cn(
          "text-sm font-semibold",
          positive === true && "text-emerald-600",
          positive === false && "text-red-500",
          positive === undefined && "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}
