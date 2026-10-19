// components/dashboard/dash-card.tsx
//
// THE REUSABLE CARD PARENT for the dashboard.
//
// Use <DashCard /> on every dashboard tab instead of the raw <Card />
// from components/ui/card.tsx. DashCard pulls its background and border
// from the central theme (lib/dashboard-theme.ts) so a single change
// there updates every card in the app.
//
// API matches shadcn Card 1:1 - pass `className` to extend/override.
//
// Sub-components (CardHeader, CardContent, etc.) are re-exported below
// so callers only need ONE import:
//
//   import {
//     DashCard,
//     CardHeader,
//     CardTitle,
//     CardContent,
//   } from "@/components/dashboard/dash-card";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardFooter,
} from "@/components/ui/card";
import { dashboardTheme } from "@/lib/dashboard-theme";

// Re-export sub-components so callers only need one import
export {
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardFooter,
};

export function DashCard({ className, ...props }: React.ComponentProps<"div">) {
  return <Card className={cn(dashboardTheme.card, className)} {...props} />;
}
