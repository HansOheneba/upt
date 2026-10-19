"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { createCheckoutSession } from "@/lib/dashboard-api";
import { isDemoMode } from "@/lib/demo-mode";

type Options = {
  onSuccess?: () => void;
};

/** Starts Stripe checkout for Pro. The name is kept so existing call sites stay put. */
export function useMockUpgrade(options: Options = {}) {
  const [upgrading, setUpgrading] = useState(false);
  const onSuccessRef = useRef(options.onSuccess);
  onSuccessRef.current = options.onSuccess;

  const upgrade = useCallback(async () => {
    if (upgrading) return;
    if (isDemoMode()) {
      toast.message("Checkout is not available in the demo.");
      return;
    }
    setUpgrading(true);
    try {
      const result = await createCheckoutSession("pro");
      if (!result?.url) {
        toast.error("Could not start checkout. Please try again.");
        return;
      }
      onSuccessRef.current?.();
      window.location.href = result.url;
    } catch (err) {
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : "Could not start checkout. Please try again.",
      );
    } finally {
      setUpgrading(false);
    }
  }, [upgrading]);

  return { upgrading, upgrade };
}
