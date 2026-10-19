"use client";

import * as React from "react";
import { CheckCircle2, Circle, Calendar, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DashCard,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/dash-card";
import type { ActionItem } from "./types";

const ACCENT = "var(--brand-accent)";
const PRIMARY = "var(--brand-primary)";

const PRIORITY_META: Record<
  NonNullable<ActionItem["priority"]>,
  { label: string; className: string }
> = {
  high: {
    label: "High",
    className:
      "border-[color-mix(in_srgb,var(--brand-accent)_40%,transparent)] text-[var(--brand-accent)] bg-[color-mix(in_srgb,var(--brand-accent)_8%,transparent)]",
  },
  medium: {
    label: "Medium",
    className: "border-muted/60 text-muted-foreground bg-muted/20",
  },
  low: {
    label: "Low",
    className: "border-muted/40 text-muted-foreground/70 bg-transparent",
  },
};

type Props = {
  items: ActionItem[];
  onToggle: (id: string) => void;
};

export function RecommendedActionsCard({ items, onToggle }: Props) {
  const completed = items.filter((i) => i.done).length;
  const total = items.length;
  const pct = total > 0 ? (completed / total) * 100 : 0;

  return (
    <DashCard>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-base" style={{ color: PRIMARY }}>
              Recommended actions
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              Action items from your last advisory session.
            </p>
          </div>
          {total > 0 && (
            <Badge
              variant="secondary"
              className="rounded-full text-xs shrink-0"
            >
              {completed} / {total} done
            </Badge>
          )}
        </div>
        {total > 0 && (
          <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full w-full origin-left rounded-full transition-transform duration-200 ease-out"
              style={{
                transform: `scaleX(${Math.max(pct, 0) / 100})`,
                backgroundColor: ACCENT,
              }}
            />
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No action items from your last session.
          </p>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onToggle(item.id)}
              className={cn(
                "w-full flex items-start gap-3 rounded-xl border p-3 text-left transition-[color,background-color,border-color,opacity,transform] duration-160 ease-out active:scale-[0.97]",
                "bg-background/60 hover:bg-muted/20",
                item.done ? "border-muted/30 opacity-60" : "border-muted/60",
              )}
            >
              <span className="mt-0.5 shrink-0">
                {item.done ? (
                  <CheckCircle2 className="h-5 w-5" style={{ color: ACCENT }} />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground/50" />
                )}
              </span>

              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium leading-snug",
                    item.done && "line-through text-muted-foreground",
                  )}
                >
                  {item.label}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  {item.dueLabel && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {item.dueLabel}
                    </span>
                  )}
                  {item.category && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Tag className="h-3 w-3" />
                      {item.category}
                    </span>
                  )}
                  {item.priority && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] rounded-full h-4 px-2",
                        PRIORITY_META[item.priority].className,
                      )}
                    >
                      {PRIORITY_META[item.priority].label}
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </CardContent>
    </DashCard>
  );
}
