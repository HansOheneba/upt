"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PropertiesTab } from "@/components/dashboard/properties/properties-tab";
import { dashboardTheme } from "@/lib/dashboard-theme";
import { blockRecordCreate } from "@/lib/record-limits";

export default function PropertiesPage() {
  return (
    <div className="min-h-screen from-background to-muted/20">
      <div className={dashboardTheme.pageContainer}>
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">
              Properties
            </h1>
            <p className="text-sm text-muted-foreground">
              Real estate holdings, equity breakdown, and property analysis.
            </p>
          </div>
          <Button asChild size="sm" className="gap-1.5" data-tour="primary-action">
            <Link
              href="/dashboard/properties/new"
              onClick={(event) => {
                if (blockRecordCreate("properties")) event.preventDefault();
              }}
            >
              <Plus className="h-3.5 w-3.5" /> Add property
            </Link>
          </Button>
        </div>

        <div className="mt-6 space-y-6">
          <PropertiesTab />
        </div>
      </div>
    </div>
  );
}
