"use client";

import { isTourSessionActive } from "@/lib/dashboard-tour";

/** Use real data when present; otherwise show tour preview samples while the walkthrough is active.
 *  For linked entities (e.g. property mortgages on Liabilities), pass empty real arrays
 *  alongside demo data so the page can hide linked rows when demo mode is on. */
export function useTourDemoData<T>(
  real: T[],
  demo: T[],
): { data: T[]; isDemo: boolean } {
  const tourActive = isTourSessionActive();
  const isDemo = tourActive && real.length === 0;
  return { data: isDemo ? demo : real, isDemo };
}
