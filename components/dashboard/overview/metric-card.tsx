import * as React from "react";
import { ArrowUpRight, ArrowUp, ArrowDown } from "lucide-react";
import { DashCard, CardContent, CardHeader, CardTitle } from "@/components/dashboard/dash-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
  onOpen: () => void;
  valueClassName?: string;
  trend?: { value?: string; dir?: "up" | "down" | "flat" } | null;
}

export function MetricCard({
  title,
  value,
  helper,
  icon,
  onOpen,
  valueClassName,
  trend,
}: MetricCardProps) {
  return (
    <DashCard>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="text-muted-foreground">{icon}</div>
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Open ${title}`}
            onClick={onOpen}
          >
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "text-2xl font-semibold tracking-tight",
              valueClassName,
            )}
          >
            {value}
          </div>
          {trend ? (
            <div className="text-xs flex items-center gap-1">
              {trend.dir === "up" ? (
                <ArrowUp className="h-4 w-4 text-green-600" />
              ) : trend.dir === "down" ? (
                <ArrowDown className="h-4 w-4 text-red-600" />
              ) : null}
              <div
                className={cn(
                  "font-medium",
                  trend.dir === "up"
                    ? "text-green-600"
                    : trend.dir === "down"
                      ? "text-red-600"
                      : "text-muted-foreground",
                )}
              >
                {trend.value}
              </div>
            </div>
          ) : null}
        </div>

        <div className="text-xs text-muted-foreground">{helper}</div>
      </CardContent>
    </DashCard>
  );
}
