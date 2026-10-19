"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DashCard, CardContent } from "@/components/dashboard/dash-card";
import { dashboardTheme } from "@/lib/dashboard-theme";
import { cn } from "@/lib/utils";
import type { ActionItem } from "./types";

const PRIMARY = "var(--brand-primary)";

const itemVariant = {
  hidden: { opacity: 0, transform: "translateY(8px)" },
  show: {
    opacity: 1,
    transform: "translateY(0px)",
    transition: { duration: 0.22, ease: [0.23, 1, 0.32, 1] as const },
  },
};

function priorityVariant(
  priority: ActionItem["priority"],
): "destructive" | "default" | "secondary" {
  if (priority === "high") return "destructive";
  if (priority === "low") return "secondary";
  return "default";
}

function TaskRow({
  item,
  onToggle,
}: {
  item: ActionItem;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-muted/60 bg-background/60 p-4">
      <button
        type="button"
        onClick={() => onToggle(item.id)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        aria-label={item.done ? "Mark as not done" : "Mark as done"}
      >
        {item.done ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
        ) : (
          <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
        )}
        <div className="min-w-0">
          <div
            className={cn(
              "text-sm font-medium",
              item.done && "text-muted-foreground line-through",
            )}
          >
            {item.label}
          </div>
          {item.dueLabel ? (
            <div className="mt-1 text-xs text-muted-foreground">
              {item.dueLabel}
            </div>
          ) : null}
        </div>
      </button>
      {item.priority ? (
        <Badge variant={priorityVariant(item.priority)} className="shrink-0">
          {item.priority}
        </Badge>
      ) : null}
    </div>
  );
}

type Props = {
  items: ActionItem[];
  loading?: boolean;
  error?: string | null;
  onToggle: (id: string) => void;
  onRetry?: () => void;
};

export function AdvisoryTasksTab({
  items,
  loading = false,
  error = null,
  onToggle,
  onRetry,
}: Props) {
  const openItems = items.filter((item) => !item.done);
  const completedItems = items.filter((item) => item.done);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-24 w-full rounded-3xl" />
        <Skeleton className="h-24 w-full rounded-3xl" />
      </div>
    );
  }

  if (error) {
    return (
      <DashCard>
        <CardContent className="px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
          {onRetry ? (
            <Button size="sm" className="mt-4" onClick={onRetry}>
              Try again
            </Button>
          ) : null}
        </CardContent>
      </DashCard>
    );
  }

  return (
    <motion.div
      variants={itemVariant}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      <section>
        <p className={`${dashboardTheme.sectionLabel} mb-3`}>
          Open ({openItems.length})
        </p>
        {openItems.length === 0 ? (
          <DashCard>
            <CardContent className="px-6 py-12 text-center">
              <p className="text-sm font-medium" style={{ color: PRIMARY }}>
                Nothing outstanding - nice work.
              </p>
            </CardContent>
          </DashCard>
        ) : (
          <div className="space-y-3">
            {openItems.map((item) => (
              <TaskRow key={item.id} item={item} onToggle={onToggle} />
            ))}
          </div>
        )}
      </section>

      {completedItems.length > 0 ? (
        <section>
          <p className={`${dashboardTheme.sectionLabel} mb-3`}>
            Completed ({completedItems.length})
          </p>
          <div className="space-y-3">
            {completedItems.map((item) => (
              <TaskRow key={item.id} item={item} onToggle={onToggle} />
            ))}
          </div>
        </section>
      ) : null}
    </motion.div>
  );
}
