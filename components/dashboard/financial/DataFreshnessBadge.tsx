"use client";

import * as React from "react";
import type { SectionFreshness } from "@/lib/client-data";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface DataFreshnessBadgeProps {
  freshness: SectionFreshness[];
  section: string;
  className?: string;
}

function formatRelative(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DataFreshnessBadge({
  freshness,
  section,
  className,
}: DataFreshnessBadgeProps) {
  const record = freshness.find((f) => f.section === section);
  if (!record) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs text-muted-foreground",
        className,
      )}
    >
      <Clock className="h-3 w-3" />
      As of {formatRelative(record.updatedAt)}
    </span>
  );
}
