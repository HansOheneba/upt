"use client";

import { CheckCircle2, Circle, ClipboardList } from "lucide-react";

import { ActionItem } from "@/components/dashboard/advisor/types";
import { Badge } from "@/components/ui/badge";
import { DashCard, CardContent, CardHeader, CardTitle } from "@/components/dashboard/dash-card";
import { cn } from "@/lib/utils";

type ActionItemsCardProps = {
  items: ActionItem[];
  completedCount: number;
  onToggleItem: (id: string) => void;
};

export function ActionItemsCard({
  items,
  completedCount,
  onToggleItem,
}: ActionItemsCardProps) {
  return (
    <DashCard>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">Action Items</CardTitle>
            <p className="text-sm text-muted-foreground">
              These help your advisor move faster when reviewing decisions.
            </p>
          </div>

          <Badge variant="secondary" className="tabular-nums">
            {completedCount}/{items.length} complete
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {items.map((x) => (
          <div
            key={x.id}
            className="flex items-center justify-between gap-3 rounded-2xl border border-muted/60 bg-background/60 p-4"
          >
            <button
              type="button"
              onClick={() => onToggleItem(x.id)}
              className="flex items-center gap-3 text-left"
              aria-label={x.done ? "Mark as not done" : "Mark as done"}
            >
              {x.done ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}

              <div className="min-w-0">
                <div
                  className={cn(
                    "text-sm font-medium",
                    x.done ? "line-through text-muted-foreground" : "",
                  )}
                >
                  {x.label}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {x.dueLabel}
                </div>
              </div>
            </button>

            <Badge variant="outline" className="bg-background/60">
              <ClipboardList className="mr-2 h-3.5 w-3.5" />
              client
            </Badge>
          </div>
        ))}

        <div className="rounded-2xl bg-muted/30 p-4 text-sm text-muted-foreground">
          Keep these updated - they become inputs to your next review.
        </div>
      </CardContent>
    </DashCard>
  );
}
