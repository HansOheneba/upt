"use client";

import { useEffect, useState } from "react";
import { usePensionStore } from "@/store/pensionStore";

/** Reads the local pension snapshot after mount so the server render stays empty. */
export function usePensionReady(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    usePensionStore.getState().hydrate();
    setReady(true);
  }, []);

  return ready;
}
