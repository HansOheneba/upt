"use client";

import { useLayoutEffect, useState } from "react";
import { usesLocalSampleData } from "@/lib/demo-mode";

/**
 * Local sample client flag that stays false on the first render so the
 * server HTML and the first client render match. It updates before paint.
 */
export function useLocalSampleData(): boolean {
  const [active, setActive] = useState(false);
  useLayoutEffect(() => {
    setActive(usesLocalSampleData());
  }, []);
  return active;
}
