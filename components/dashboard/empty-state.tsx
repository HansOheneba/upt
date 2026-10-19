import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DashboardEmptyStateAction = {
  label: string;
  onClick?: () => void;
  href?: string;
  icon?: React.ReactNode;
};

export type DashboardEmptyStateProps = {
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
  action?: DashboardEmptyStateAction;
  actionSlot?: React.ReactNode;
  size?: "default" | "sm";
  className?: string;
};

export function DashboardEmptyState({
  icon,
  title,
  description,
  action,
  actionSlot,
  size = "default",
  className,
}: DashboardEmptyStateProps) {
  const isSm = size === "sm";

  const actionNode =
    actionSlot ??
    (action ? (
      action.href ? (
        <Button size="sm" className="mt-4 gap-2" asChild>
          <Link href={action.href}>
            {action.icon}
            {action.label}
          </Link>
        </Button>
      ) : (
        <Button size="sm" className="mt-4 gap-2" onClick={action.onClick}>
          {action.icon}
          {action.label}
        </Button>
      )
    ) : null);

  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-xl border border-dashed border-border bg-card text-center",
        isSm ? "px-6 py-10" : "px-6 py-14",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-2xl bg-muted text-muted-foreground",
          isSm ? "size-12 [&_svg]:size-5" : "size-16 [&_svg]:size-7",
        )}
      >
        {icon}
      </div>
      <h2 className={cn("mt-4 font-medium", isSm ? "text-sm" : "text-sm")}>
        {title}
      </h2>
      <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {actionNode}
    </div>
  );
}
