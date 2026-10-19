"use client";

import * as React from "react";

type SoftKpiProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
};

export function SoftKpi({ icon, label, value }: SoftKpiProps) {
  return (
    <div className="rounded-2xl bg-muted/30 p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}
