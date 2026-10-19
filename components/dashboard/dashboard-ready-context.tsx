"use client";

import { createContext, useContext } from "react";

/** True once the dashboard logo splash has finished and content is visible. */
export const DashboardReadyContext = createContext(true);

export function useDashboardReady() {
  return useContext(DashboardReadyContext);
}
