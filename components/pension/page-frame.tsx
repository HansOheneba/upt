import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { dashboardTheme } from "@/lib/dashboard-theme";

/** Shared width and rhythm for every My Own Pension tab. */
export function PensionPage({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        dashboardTheme.pageContainer,
        "flex flex-col gap-4 [&>*]:mt-0",
      )}
    >
      {children}
    </div>
  );
}

export function PensionPageHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className={dashboardTheme.pageTitle}>{title}</h1>
        {description ? (
          <p className={cn(dashboardTheme.pageDescription, "mt-1")}>{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}
