"use client";

import { useLayoutEffect } from "react";

import { hydrateDemoStore, markDemoModeActive } from "@/lib/demo-mode";

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useLayoutEffect(() => {
    markDemoModeActive();
    hydrateDemoStore();
  }, []);

  return <>{children}</>;
}
