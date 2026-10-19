import * as React from "react";
import { cn } from "@/lib/utils";
import { dashboardTheme } from "@/lib/dashboard-theme";
import { formatUiLabel } from "@/lib/format-ui-label";

type DashboardSectionLabelProps = {
  children: React.ReactNode;
  className?: string;
  /** Use the wider letter-spacing variant (tab pages). */
  wide?: boolean;
};

export function DashboardSectionLabel({
  children,
  className,
  wide = false,
}: DashboardSectionLabelProps) {
  const label =
    typeof children === "string" ? formatUiLabel(children) : children;

  return (
    <p
      className={cn(
        wide ? dashboardTheme.sectionLabelWide : dashboardTheme.sectionLabel,
        !wide && "mb-2 sm:mb-3",
        className,
      )}
    >
      {label}
    </p>
  );
}

/** Tab-page section headings (tracking-widest). */
export function DashboardSectionLabelWide(
  props: Omit<DashboardSectionLabelProps, "wide">,
) {
  return <DashboardSectionLabel wide {...props} />;
}
